// Maintenance request API
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router(); router.use(requireAuth);
router.get('/',async(req,res)=>{const requests=await prisma.maintenanceRequest.findMany({include:{property:true,unit:true,tenant:true,assignedTechnician:true,updates:true},orderBy:{createdAt:'desc'}});res.json({requests});});
router.get('/summary',async(req,res)=>{const [open,urgent,completed]=await Promise.all([prisma.maintenanceRequest.count({where:{status:{in:['NEW','ASSIGNED','IN_PROGRESS','WAITING_PARTS']}}}),prisma.maintenanceRequest.count({where:{priority:'URGENT'}}),prisma.maintenanceRequest.count({where:{status:'COMPLETED'}})]);res.json({summary:{open,urgent,completed}});});
export default router;