import type { UploadedFileResponse } from './upload.responses.js';

export function mapUploadedFile(asset:{id:string;key:string;filename:string;mimeType:string;size:number;width?:number|null;height?:number|null;url?:string|null;createdAt:Date;}): UploadedFileResponse {
return {id:asset.id,key:asset.key,url:asset.url??undefined,filename:asset.filename,mimeType:asset.mimeType,size:asset.size,width:asset.width??undefined,height:asset.height??undefined,uploadedAt:asset.createdAt};
}
