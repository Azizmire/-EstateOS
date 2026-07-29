export const IMAGE_MIME_TYPES = ['image/jpeg','image/png','image/webp'] as const;
export const DOCUMENT_MIME_TYPES = ['application/pdf'] as const;

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

export const IMAGE_UPLOAD_FOLDER = 'properties';
export const LEASE_UPLOAD_FOLDER = 'leases';
export const MAINTENANCE_UPLOAD_FOLDER = 'maintenance';
