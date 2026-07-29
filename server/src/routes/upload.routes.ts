import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import type { UploadControllerDependencies } from '../controllers/upload.controller.dependencies';

export function createUploadRouter(deps: UploadControllerDependencies){
 const router=Router();
 const controller=new UploadController(deps);
 router.post('/property-image',(req,res,next)=>controller.uploadPropertyImage(req.body).then(r=>res.json(r)).catch(next));
 router.post('/lease-document',(req,res,next)=>controller.uploadLeaseDocument(req.body).then(r=>res.json(r)).catch(next));
 router.post('/maintenance-attachment',(req,res,next)=>controller.uploadMaintenanceAttachment(req.body).then(r=>res.json(r)).catch(next));
 return router;
}
