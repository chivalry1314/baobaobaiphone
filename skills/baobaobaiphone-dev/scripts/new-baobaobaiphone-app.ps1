[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$AppId,

  [Parameter(Mandatory = $true)]
  [string]$Name,

  [string]$Icon = 'AppWindow',
  [string]$Color = '#3B82F6',
  [string]$Description = '',
  [string]$MarketIcon = 'App',
  [switch]$IncludeStore,
  [switch]$IncludeMemoryModule,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

function ConvertTo-PascalCase {
  param([string]$Value)
  $parts = $Value -split '-' | Where-Object { $_ -ne '' }
  if ($parts.Count -eq 0) { return 'MyApp' }
  return ($parts | ForEach-Object {
    if ($_.Length -eq 1) { $_.ToUpper() }
    else { $_.Substring(0, 1).ToUpper() + $_.Substring(1) }
  }) -join ''
}

function Escape-TsSingleQuoted {
  param([string]$Value)
  if ($null -eq $Value) { return '' }
  return $Value.Replace('\\', '\\\\').Replace("`r", ' ').Replace("`n", ' ').Replace("'", "\\'")
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

if ($AppId -notmatch '^[a-z0-9-]+$') {
  throw "AppId must match ^[a-z0-9-]+$ (lowercase letters, digits, hyphen)."
}

if ($AppId.StartsWith('-') -or $AppId.EndsWith('-') -or $AppId.Contains('--')) {
  throw 'AppId cannot start/end with hyphen or contain consecutive hyphens.'
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$appDir = Join-Path $repoRoot "src\appsrc\apps\$AppId"

if (Test-Path $appDir) {
  if (-not $Force) {
    throw "Target already exists: $appDir. Use -Force to overwrite."
  }
  Remove-Item -LiteralPath $appDir -Recurse -Force
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null

$pascal = ConvertTo-PascalCase -Value $AppId
$appComponentName = "${pascal}App"
$appPropsName = "${pascal}AppProps"
$manifestVarName = "${pascal}Manifest"
$storeHookName = "use${pascal}Store"
$memoryModuleVar = $pascal.Substring(0, 1).ToLower() + $pascal.Substring(1) + 'MemoryModule'

$nameEsc = Escape-TsSingleQuoted -Value $Name
$iconEsc = Escape-TsSingleQuoted -Value $Icon
$colorEsc = Escape-TsSingleQuoted -Value $Color
$marketIconEsc = Escape-TsSingleQuoted -Value $MarketIcon
$descriptionValue = if ([string]::IsNullOrWhiteSpace($Description)) { "$Name app." } else { $Description }
$descEsc = Escape-TsSingleQuoted -Value $descriptionValue

$typesContent = @"
export interface $appPropsName {
  onClose: () => void;
}
"@

$storeImportLine = ''
$storeStateLine = ''
$storeUiBlock = ''
$storeFileContent = ''

if ($IncludeStore) {
  $storeImportLine = "import { $storeHookName } from './store';"
  $storeStateLine = "  const { count, increment, reset } = $storeHookName();"
  $storeUiBlock = @"
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm text-slate-700">Count: {count}</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={increment}
                className="rounded-md bg-blue-500 px-3 py-1.5 text-xs text-white"
              >
                Increment
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
"@

  $storeFileContent = @"
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAppPersistOptions } from '../../../core/persistOptions';

interface ${pascal}State {
  count: number;
  increment: () => void;
  reset: () => void;
}

export const $storeHookName = create<${pascal}State>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      reset: () => set({ count: 0 }),
    }),
    createAppPersistOptions<${pascal}State>({
      appId: '$AppId',
    })
  )
);
"@
}

$appContent = @"
import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
$storeImportLine
import type { $appPropsName } from './types';

export const ${appComponentName}: React.FC<${appPropsName}> = ({ onClose }) => {
$storeStateLine
  const subtitle = '$descEsc';

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-white text-slate-800 flex flex-col"
    >
      <header className="px-2 pt-12 pb-3 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-600 flex items-center gap-1 p-2 active:scale-95 transition-transform"
        >
          <ChevronLeft size={28} />
          <span className="text-[16px]">Back</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-slate-900 pr-10">$nameEsc</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">{subtitle}</p>
$storeUiBlock
        </div>
      </main>
    </motion.div>
  );
};
"@

$indexContent = @"
import type { AppManifest } from '@baobaobaiOS/sdk';
import { $appComponentName } from './$appComponentName';

const ${manifestVarName}: AppManifest = {
  id: '$AppId',
  name: '$nameEsc',
  icon: '$iconEsc',
  color: '$colorEsc',
  component: $appComponentName,
  market: {
    icon: '$marketIconEsc',
    tags: ['custom'],
    sortOrder: 90,
  },
  description: '$descEsc',
};

export default $manifestVarName;
"@

$memoryModuleContent = @"
import type { AppMemoryModule } from '../../../core/appMemoryRegistry';

export const ${memoryModuleVar}: AppMemoryModule = {
  appId: '$AppId',
  defaultSpace: 'personal',
  resolveContactName: (contactId) => contactId,
};

export default $memoryModuleVar;
"@

Write-Utf8NoBom -Path (Join-Path $appDir 'index.ts') -Content $indexContent
Write-Utf8NoBom -Path (Join-Path $appDir "$appComponentName.tsx") -Content $appContent
Write-Utf8NoBom -Path (Join-Path $appDir 'types.ts') -Content $typesContent

$created = @(
  (Join-Path $appDir 'index.ts'),
  (Join-Path $appDir "$appComponentName.tsx"),
  (Join-Path $appDir 'types.ts')
)

if ($IncludeStore) {
  Write-Utf8NoBom -Path (Join-Path $appDir 'store.ts') -Content $storeFileContent
  $created += (Join-Path $appDir 'store.ts')
}

if ($IncludeMemoryModule) {
  Write-Utf8NoBom -Path (Join-Path $appDir 'memoryModule.ts') -Content $memoryModuleContent
  $created += (Join-Path $appDir 'memoryModule.ts')
}

Write-Host "[OK] Created app scaffold: $AppId"
$created | ForEach-Object { Write-Host " - $_" }
Write-Host '[Next] Run npm run lint and then adjust UI/logic for your feature request.'
