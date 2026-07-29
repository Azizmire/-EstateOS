import { MAX_LEASE_DOCUMENTS_PER_REQUEST, MAX_MAINTENANCE_ATTACHMENTS_PER_REQUEST, MAX_PROPERTY_IMAGES_PER_REQUEST } from './upload.constants';

export function validatePropertyImageCount(count:number){return count<=MAX_PROPERTY_IMAGES_PER_REQUEST;}
export function validateLeaseDocumentCount(count:number){return count<=MAX_LEASE_DOCUMENTS_PER_REQUEST;}
export function validateMaintenanceAttachmentCount(count:number){return count<=MAX_MAINTENANCE_ATTACHMENTS_PER_REQUEST;}