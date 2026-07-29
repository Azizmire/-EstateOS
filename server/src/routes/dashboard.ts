import {
  LeaseStatus,
  MaintenanceStatus,
  PaymentStatus,
  PaymentType,
  UnitStatus,
} from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const expiringBy = new Date(now);
    expiringBy.setDate(expiringBy.getDate() + 60);

    await prisma.payment.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: { lt: now },
      },
      data: { status: PaymentStatus.LATE },
    });

    const [
      propertyCount,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      maintenanceUnits,
      activeLeases,
      expiringLeases,
      tenantCount,
      monthlyRevenue,
      outstandingBalance,
      openMaintenance,
      urgentMaintenance,
      recentPayments,
      recentMaintenance,
      properties,
    ] = await Promise.all([
      prisma.property.count(),
      prisma.unit.count(),
      prisma.unit.count({ where: { status: UnitStatus.OCCUPIED } }),
      prisma.unit.count({ where: { status: UnitStatus.VACANT } }),
      prisma.unit.count({ where: { status: UnitStatus.MAINTENANCE } }),
      prisma.lease.count({ where: { status: LeaseStatus.ACTIVE } }),
      prisma.lease.count({
        where: {
          status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] },
          endDate: { gte: now, lte: expiringBy },
        },
      }),
      prisma.tenant.count(),
      prisma.payment.aggregate({
        where: {
          type: PaymentType.RENT,
          status: PaymentStatus.PAID,
          paidAt: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.FAILED] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.maintenanceRequest.count({
        where: {
          status: {
            in: [
              MaintenanceStatus.NEW,
              MaintenanceStatus.ASSIGNED,
              MaintenanceStatus.IN_PROGRESS,
              MaintenanceStatus.WAITING_PARTS,
            ],
          },
        },
      }),
      prisma.maintenanceRequest.count({
        where: {
          priority: 'URGENT',
          status: { notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
        },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: true,
          lease: { include: { unit: { include: { property: true } } } },
        },
      }),
      prisma.maintenanceRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          property: true,
          unit: true,
          assignedTechnician: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.property.findMany({
        include: {
          units: {
            select: { id: true, status: true, marketRent: true },
          },
          maintenance: {
            where: {
              status: {
                notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
              },
            },
            select: { id: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const occupancyRate = totalUnits === 0
      ? 0
      : Math.round((occupiedUnits / totalUnits) * 1000) / 10;

    const propertyPerformance = properties.map((property) => {
      const units = property.units.length;
      const occupied = property.units.filter((unit) => unit.status === UnitStatus.OCCUPIED).length;
      const potentialMonthlyRent = property.units.reduce(
        (sum, unit) => sum + Number(unit.marketRent),
        0,
      );

      return {
        id: property.id,
        name: property.name,
        city: property.city,
        state: property.state,
        units,
        occupied,
        vacant: property.units.filter((unit) => unit.status === UnitStatus.VACANT).length,
        occupancyRate: units === 0 ? 0 : Math.round((occupied / units) * 1000) / 10,
        potentialMonthlyRent,
        openMaintenanceRequests: property.maintenance.length,
      };
    });

    res.json({
      generatedAt: now.toISOString(),
      overview: {
        properties: propertyCount,
        units: {
          total: totalUnits,
          occupied: occupiedUnits,
          vacant: vacantUnits,
          maintenance: maintenanceUnits,
          occupancyRate,
        },
        tenants: tenantCount,
        leases: {
          active: activeLeases,
          expiringWithin60Days: expiringLeases,
        },
      },
      financials: {
        currentMonthRentCollected: Number(monthlyRevenue._sum.amount ?? 0),
        currentMonthPayments: monthlyRevenue._count,
        outstandingBalance: Number(outstandingBalance._sum.amount ?? 0),
        outstandingPayments: outstandingBalance._count,
      },
      maintenance: {
        open: openMaintenance,
        urgent: urgentMaintenance,
      },
      propertyPerformance,
      recentActivity: {
        payments: recentPayments,
        maintenanceRequests: recentMaintenance,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
