import { downloadBlob } from './utils';

export interface BaiduQuickShareResult {
  method: 'web_share' | 'download';
  message: string;
}

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};

const buildShareFile = (blob: Blob, fileName: string): File | null => {
  try {
    return new File([blob], fileName, {
      type: blob.type || 'application/json',
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
};

const isShareCancelled = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const payload = error as { name?: string };
  return payload.name === 'AbortError';
};

export const shareBackupToBaiduQuickly = async (
  backupBlob: Blob,
  fileName: string
): Promise<BaiduQuickShareResult> => {
  const nav: NavigatorWithShare | null =
    typeof navigator === 'undefined' ? null : (navigator as NavigatorWithShare);

  if (nav?.share) {
    const shareFile = buildShareFile(backupBlob, fileName);
    const canShareFile =
      shareFile &&
      (typeof nav.canShare !== 'function' || nav.canShare({ files: [shareFile] }));

    if (shareFile && canShareFile) {
      try {
        await nav.share({
          title: 'baobaobaiphone backup',
          text: 'Choose Baidu Netdisk in the share panel to import this backup file.',
          files: [shareFile],
        });
        return {
          method: 'web_share',
          message: 'Share panel opened. Choose Baidu Netdisk to finish import.',
        };
      } catch (error) {
        if (isShareCancelled(error)) {
          return {
            method: 'download',
            message: 'Share cancelled. Backup file was not sent.',
          };
        }
      }
    }
  }

  downloadBlob(backupBlob, fileName);
  return {
    method: 'download',
    message: 'Share is unavailable on this device. Backup file was downloaded for manual import.',
  };
};
