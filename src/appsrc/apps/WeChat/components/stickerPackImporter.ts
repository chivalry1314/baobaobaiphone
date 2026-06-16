import JSZip from 'jszip';

export interface StickerImportCandidate {
  name: string;
  url: string;
}

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

const IMAGE_EXTS = new Set(Object.keys(IMAGE_MIME_BY_EXT));

const getFileExtension = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  return dotIndex >= 0 ? normalized.slice(dotIndex) : '';
};

const getMimeTypeByFileName = (fileName: string): string | null => {
  return IMAGE_MIME_BY_EXT[getFileExtension(fileName)] || null;
};

const isImageFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/')) return true;
  return IMAGE_EXTS.has(getFileExtension(file.name));
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

const normalizeStickerName = (fileName: string): string =>
  fileName
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '')
    .trim() || '表情';

export const importImageFiles = async (
  files: FileList | File[] | null
): Promise<StickerImportCandidate[]> => {
  if (!files || files.length === 0) return [];
  const sourceFiles = Array.from(files);
  console.log('[stickerPackImporter] 原始文件:', sourceFiles.map((f) => ({ name: f.name, type: f.type, size: f.size })));
  const imageFiles = sourceFiles.filter(isImageFile);
  console.log('[stickerPackImporter] 识别为图片:', imageFiles.length);
  const results: StickerImportCandidate[] = [];
  for (const file of imageFiles) {
    try {
      const url = await fileToDataUrl(file);
      if (!url) continue;
      results.push({ name: normalizeStickerName(file.name), url });
    } catch (error) {
      console.error('[stickerPackImporter] 读取文件失败:', file.name, error);
    }
  }
  return results;
};

interface StickerZipManifest {
  name?: string;
  cover?: string;
}

const readZipManifest = async (zip: JSZip): Promise<StickerZipManifest | null> => {
  const manifestEntry = zip.file(/(^|\/)manifest\.json$/i)[0];
  if (!manifestEntry) return null;
  try {
    const text = await manifestEntry.async('string');
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      cover: typeof parsed.cover === 'string' ? parsed.cover : undefined,
    };
  } catch {
    return null;
  }
};

const entryToDataUrl = async (entry: JSZip.JSZipObject): Promise<string | null> => {
  const mimeType = getMimeTypeByFileName(entry.name);
  if (!mimeType) return null;
  try {
    const base64 = await entry.async('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
};

export interface ImportedStickerPackResult {
  packName: string;
  coverUrl?: string;
  stickers: StickerImportCandidate[];
}

export const importStickerZip = async (zipFile: File): Promise<ImportedStickerPackResult> => {
  const buffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const manifest = await readZipManifest(zip);

  const packName = manifest?.name?.trim() || normalizeStickerName(zipFile.name);

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const imageEntries = entries.filter((entry) => Boolean(getMimeTypeByFileName(entry.name)));

  const stickers: StickerImportCandidate[] = [];
  let coverUrl: string | undefined;

  for (const entry of imageEntries) {
    const url = await entryToDataUrl(entry);
    if (!url) continue;
    stickers.push({ name: normalizeStickerName(entry.name), url });
  }

  if (manifest?.cover) {
    const coverEntry =
      zip.file(manifest.cover) ||
      entries.find((entry) => entry.name.toLowerCase().endsWith(manifest.cover!.toLowerCase()));
    if (coverEntry) {
      const url = await entryToDataUrl(coverEntry);
      if (url) coverUrl = url;
    }
  }

  if (!coverUrl && stickers.length > 0) {
    coverUrl = stickers[0].url;
  }

  return { packName, coverUrl, stickers };
};
