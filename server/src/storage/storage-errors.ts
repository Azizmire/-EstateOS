class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class FileNotFoundError extends StorageError {
  constructor(key: string) {
    super(`File not found: ${key}`);
    this.name = 'FileNotFoundError';
  }
}

export class InvalidUploadError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUploadError';
  }
}
