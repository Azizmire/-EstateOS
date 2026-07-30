import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paginationResult, parsePagination } from '../utils/pagination.js';
import type { StorageProvider } from '../storage/provider.js';

export function createFileRouter(storage: StorageProvider) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query);
      const role = req.user!.role;
      let where = {};
      if (role === UserRole.MAINTENANCE) where = { maintenanceFile: { isNot: null } };
      if (role === UserRole.TENANT) {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
        if (!tenant) return res.json({ files: [] });
        where = {
          OR: [
            { leaseDocument: { lease: { tenants: { some: { tenantId: tenant.id } } } } },
            { maintenanceFile: { request: { tenantId: tenant.id } } },
            { propertyImage: { property: { units: { some: { leases: { some: { tenants: { some: { tenantId: tenant.id } }, status: { in: ['ACTIVE', 'EXPIRING'] } } } } } } } },
          ],
        };
      }
      if (role === UserRole.OWNER) {
        where = {
          OR: [
            { propertyImage: { property: { owners: { some: { userId: req.user!.id } } } } },
            { leaseDocument: { lease: { unit: { property: { owners: { some: { userId: req.user!.id } } } } } } },
            { maintenanceFile: { request: { property: { owners: { some: { userId: req.user!.id } } } } } },
          ],
        };
      }
      const files = await prisma.fileAsset.findMany({
        skip, take,
        where,
        select: {
          id: true, category: true, originalFilename: true, mimeType: true,
          size: true, width: true, height: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ files, pagination: paginationResult(files.length, page, pageSize) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const file = await prisma.fileAsset.findUnique({
        where: { id: req.params.id },
        include: {
          propertyImage: true,
          leaseDocument: { include: { lease: { include: { unit: true, tenants: true } } } },
          maintenanceFile: { include: { request: true } },
        },
      });
      if (!file) return res.status(404).json({ message: 'File not found' });

      const role = req.user!.role;
      const unrestrictedRoles: readonly UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];
      let permitted = unrestrictedRoles.includes(role);
      if (role === UserRole.MAINTENANCE) permitted = Boolean(file.maintenanceFile);

      if (role === UserRole.TENANT) {
        const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
        if (tenant) {
          permitted = Boolean(
            file.leaseDocument?.lease.tenants.some((item) => item.tenantId === tenant.id)
            || file.maintenanceFile?.request.tenantId === tenant.id
            || (file.propertyImage && await prisma.lease.count({
              where: {
                unit: { propertyId: file.propertyImage.propertyId },
                tenants: { some: { tenantId: tenant.id } },
                status: { in: ['ACTIVE', 'EXPIRING'] },
              },
            })),
          );
        }
      }

      if (role === UserRole.OWNER) {
        const propertyId = file.propertyImage?.propertyId
          || file.leaseDocument?.lease.unit.propertyId
          || file.maintenanceFile?.request.propertyId;
        permitted = Boolean(propertyId && await prisma.propertyOwner.findUnique({
          where: { userId_propertyId: { userId: req.user!.id, propertyId } },
        }));
      }

      if (!permitted) return res.status(403).json({ message: 'You do not have access to this file' });
      const contents = await storage.getObject(file.key);
      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': String(contents.length),
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`,
        'Cache-Control': 'private, max-age=300',
      });
      res.send(contents);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', requireRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res, next) => {
    try {
      const file = await prisma.fileAsset.findUnique({ where: { id: String(req.params.id) } });
      if (!file) return res.status(404).json({ message: 'File not found' });
      await storage.deleteObject(file.key);
      await prisma.fileAsset.delete({ where: { id: file.id } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
