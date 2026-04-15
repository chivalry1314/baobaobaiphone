export type IdbPersistenceErrorCode =
  | 'quota-exceeded'
  | 'operation-failed';

export class IdbPersistenceError extends Error {
  readonly code: IdbPersistenceErrorCode;

  constructor(code: IdbPersistenceErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.code = code;
    this.name = 'IdbPersistenceError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const isQuotaExceededError = (error: unknown): boolean => {
  if (!error) return false;

  const hasQuotaSignature = (name: unknown, code: unknown): boolean => {
    return (
      name === 'QuotaExceededError' ||
      name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      code === 22 ||
      code === 1014
    );
  };

  if (error instanceof DOMException) {
    return hasQuotaSignature(error.name, error.code);
  }

  if (typeof error === 'object' && error !== null) {
    const withErrorShape = error as { name?: unknown; code?: unknown };
    return hasQuotaSignature(withErrorShape.name, withErrorShape.code);
  }

  return false;
};

export const toIdbPersistenceError = (error: unknown): IdbPersistenceError => {
  if (isQuotaExceededError(error)) {
    return new IdbPersistenceError('quota-exceeded', 'IndexedDB quota exceeded', { cause: error });
  }
  return new IdbPersistenceError('operation-failed', 'IndexedDB operation failed', { cause: error });
};
