export class UploadControllerError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'UploadControllerError';
  }
}

export function isUploadControllerError(error: unknown): error is UploadControllerError {
  return error instanceof UploadControllerError;
}
