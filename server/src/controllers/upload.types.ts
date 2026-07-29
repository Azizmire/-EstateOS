export interface PropertyImageUploadRequest {
  propertyId: string;
  altText?: string;
}

export interface LeaseDocumentUploadRequest {
  leaseId: string;
  title?: string;
}

export interface MaintenanceAttachmentUploadRequest {
  requestId: string;
  caption?: string;
}
