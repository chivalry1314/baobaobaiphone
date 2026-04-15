export interface StorageEstimateResult {
  quota: number;
  usage: number;
  usageRate: number;
}

export const getStorageEstimate = async (): Promise<StorageEstimateResult | null> => {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const usageRate = quota > 0 ? usage / quota : 0;

    return {
      quota,
      usage,
      usageRate,
    };
  } catch {
    return null;
  }
};
