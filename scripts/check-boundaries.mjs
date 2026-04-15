import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const appsDir = path.join(srcDir, 'appsrc', 'apps');
const coreDir = path.join(srcDir, 'core');
const sharedBusinessDir = path.join(srcDir, 'appsrc', 'shared', 'business');
const legacyDomainsDir = path.join(srcDir, 'domains');

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IMPORT_PATH_RE = /\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g;

// Legacy cross-app imports that already exist in the codebase.
// Keep this baseline explicit so newly introduced cross-app imports are still blocked.
const ALLOWED_CROSS_APP_IMPORTS = new Set([
  'src/appsrc/apps/wechat/contactadapter.ts::../contacts/selectors',
  'src/appsrc/apps/wechat/contactadapter.ts::../contacts/types',
  'src/appsrc/apps/wechat/memory.ts::../contacts/activerole',
  'src/appsrc/apps/wechat/memorymodule.ts::../contacts/queries',
  'src/appsrc/apps/wechat/store.ts::../contacts/activerole',
  'src/appsrc/apps/wechat/wechatapp.tsx::../contacts/activerole',
  'src/appsrc/apps/wechat/data/repositories/storepersistrepo.ts::../../../contacts/activerole',
  'src/appsrc/apps/wechat/components/editcharacterview.tsx::../../contacts/selectors',
  'src/appsrc/apps/wechat/components/wechataddfriendview.tsx::../../contacts/selectors',
  'src/appsrc/apps/wechat/components/wechatnewfriendsview.tsx::../../contacts/selectors',
  'src/appsrc/apps/warmtrack/memory.ts::../contacts/activerole',
  'src/appsrc/apps/warmtrack/memorymodule.ts::../contacts/activerole',
  'src/appsrc/apps/warmtrack/store.ts::../contacts/activerole',
  'src/appsrc/apps/warmtrack/warmtrackapp.tsx::../contacts/activerole',
  'src/appsrc/apps/warmtrack/store/helpers.ts::../../contacts/activerole',
  'src/appsrc/apps/warmtrack/store/slices/roleslice.ts::../../../contacts/activerole',
  'src/appsrc/apps/warmtrack/data/hydrate.ts::../../contacts/activerole',
  'src/appsrc/apps/settings/components/desktopeditmodeview.tsx::../../appmarket/selectors',
  'src/appsrc/apps/settings/components/desktopeditmodeview.tsx::../../appmarket/runtime',
  'src/appsrc/apps/settings/components/iconmanageview.tsx::../../appmarket/selectors',
  'src/appsrc/apps/memorycenter/memorycenterapp.tsx::../contacts/selectors',
  'src/appsrc/apps/lovespace/lovespaceapp.tsx::../contacts/activerole',
  'src/appsrc/apps/lovespace/lovespaceapp.tsx::../contacts/selectors',
  'src/appsrc/apps/lovespace/store.ts::../contacts/activerole',
  'src/appsrc/apps/lovespace/types.ts::../contacts/types',
  'src/appsrc/apps/lovespace/store/helpers.ts::../../contacts/activerole',
  'src/appsrc/apps/lovespace/data/repositories/storepersistrepo.ts::../../../contacts/activerole',
  'src/appsrc/apps/lovespace/components/addbondsheet.tsx::../../contacts/types',
  'src/appsrc/apps/lovespace/components/contactavatar.tsx::../../contacts/types',
  'src/appsrc/apps/contacts/contactsapp.tsx::../wechat/voice',
]);

const toPosixLower = (inputPath) => inputPath.split(path.sep).join('/').toLowerCase();
const isInside = (targetPath, basePath) => {
  const target = toPosixLower(path.resolve(targetPath));
  const base = toPosixLower(path.resolve(basePath));
  return target === base || target.startsWith(`${base}/`);
};

const getAppIdByFile = (filePath) => {
  const rel = path.relative(appsDir, filePath).split(path.sep);
  return rel[0] || '';
};

const getImportSpecifiers = (sourceText) => {
  const specs = [];
  let match = null;
  while ((match = IMPORT_PATH_RE.exec(sourceText)) !== null) {
    specs.push(match[1]);
  }
  while ((match = DYNAMIC_IMPORT_RE.exec(sourceText)) !== null) {
    specs.push(match[1]);
  }
  return specs;
};

const resolveRelativeImport = (fromFile, specifier) => {
  const basePath = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.mjs'),
    path.join(basePath, 'index.cjs'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || basePath;
};

const resolveImportTarget = (fromFile, specifier) => {
  if (specifier.startsWith('.')) {
    return resolveRelativeImport(fromFile, specifier);
  }
  if (specifier.startsWith('@/')) {
    return path.resolve(rootDir, specifier.slice(2));
  }
  return null;
};

const toAllowlistKey = (filePath, specifier) =>
  `${toPosixLower(path.relative(rootDir, filePath))}::${specifier.toLowerCase()}`;

const collectSourceFiles = (scanDir) => {
  if (!fs.existsSync(scanDir)) return [];
  const output = [];
  const stack = [scanDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (SOURCE_EXTS.has(path.extname(entry.name))) {
        output.push(fullPath);
      }
    }
  }
  return output;
};

const sourceFiles = collectSourceFiles(srcDir);
const violations = [];

for (const filePath of sourceFiles) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const specs = getImportSpecifiers(sourceText);
  const fileInApps = isInside(filePath, appsDir);
  const fileInCore = isInside(filePath, coreDir);
  const fileInSharedBusiness = isInside(filePath, sharedBusinessDir);
  const sourceAppId = fileInApps ? getAppIdByFile(filePath) : '';

  for (const specifier of specs) {
    if (specifier.includes('domains/')) {
      violations.push({
        filePath,
        specifier,
        reason: 'Legacy domains path is forbidden. Use src/appsrc/shared/business/* instead.',
      });
      continue;
    }

    const targetPath = resolveImportTarget(filePath, specifier);
    if (!targetPath) continue;

    if (isInside(targetPath, legacyDomainsDir)) {
      violations.push({
        filePath,
        specifier,
        reason: 'Legacy src/domains import is forbidden. Use src/appsrc/shared/business/* instead.',
      });
      continue;
    }

    if (fileInApps && isInside(targetPath, appsDir)) {
      const targetAppId = getAppIdByFile(targetPath);
      if (sourceAppId && targetAppId && sourceAppId !== targetAppId) {
        const allowlistKey = toAllowlistKey(filePath, specifier);
        if (!ALLOWED_CROSS_APP_IMPORTS.has(allowlistKey)) {
          violations.push({
            filePath,
            specifier,
            reason: `Cross-app import is forbidden (${sourceAppId} -> ${targetAppId}).`,
          });
        }
      }
    }

    if (fileInSharedBusiness && isInside(targetPath, appsDir)) {
      violations.push({
        filePath,
        specifier,
        reason: 'shared/business must not depend on src/appsrc/apps.',
      });
    }

    if (fileInCore && isInside(targetPath, appsDir)) {
      violations.push({
        filePath,
        specifier,
        reason: 'src/core must not directly depend on src/appsrc/apps.',
      });
    }
  }
}

if (violations.length > 0) {
  console.error(`[boundary-check] Found ${violations.length} violation(s):`);
  for (const item of violations) {
    console.error(
      `- ${path.relative(rootDir, item.filePath)} -> "${item.specifier}"\n  ${item.reason}`
    );
  }
  process.exit(1);
}

console.log(`[boundary-check] OK. Checked ${sourceFiles.length} source files.`);