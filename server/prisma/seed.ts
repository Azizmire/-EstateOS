import {
  ExpenseCategory,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentStatus,
  PrismaClient,
  UnitStatus,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logError, logInfo } from '../src/lib/logger.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME?.trim() || 'EstateOS Administrator';

  if (!email || !password || password.length < 12) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD (at least 12 characters) are required.');
  }

  const admin = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash: await bcrypt.hash(password, 12), role: UserRole.ADMIN },
    update: { name, passwordHash: await bcrypt.hash(password, 12), role: UserRole.ADMIN },
    select: { id: true, email: true, role: true },
  });
  logInfo('EstateOS administrator seeded', admin);

  if (process.env.SEED_TEST_DATA !== 'true') return;
  if (await prisma.property.count()) {
    logInfo('Portfolio data already exists; test fixtures were not duplicated');
    return;
  }

  const testPassword = process.env.TEST_SEED_PASSWORD;
  if (!testPassword || testPassword.length < 16) {
    throw new Error('TEST_SEED_PASSWORD must be explicitly set to at least 16 characters when SEED_TEST_DATA=true');
  }
  const passwordHash = await bcrypt.hash(testPassword, 12);
  const [manager, technician, tenantUser, owner] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'manager@estateos.test' },
      create: { name: 'Aziz Mire', email: 'manager@estateos.test', passwordHash, role: UserRole.MANAGER },
      update: { passwordHash, role: UserRole.MANAGER },
    }),
    prisma.user.upsert({
      where: { email: 'maintenance@estateos.test' },
      create: { name: 'Noah Williams', email: 'maintenance@estateos.test', passwordHash, role: UserRole.MAINTENANCE },
      update: { passwordHash, role: UserRole.MAINTENANCE },
    }),
    prisma.user.upsert({
      where: { email: 'tenant@estateos.test' },
      create: { name: 'Amina Yusuf', email: 'tenant@estateos.test', passwordHash, role: UserRole.TENANT },
      update: { passwordHash, role: UserRole.TENANT },
    }),
    prisma.user.upsert({
      where: { email: 'owner@estateos.test' },
      create: { name: 'Jordan Ellis', email: 'owner@estateos.test', passwordHash, role: UserRole.OWNER },
      update: { passwordHash, role: UserRole.OWNER },
    }),
  ]);

  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), 1);
  const in45Days = new Date(now.getTime() + 45 * 86_400_000);

  const northLoop = await prisma.property.create({
    data: {
      name: 'North Loop Flats',
      address1: '725 Washington Ave N',
      city: 'Minneapolis',
      state: 'MN',
      postalCode: '55401',
      description: 'Modern mixed-use apartments in the North Loop.',
      units: {
        create: [
          { number: '304', bedrooms: 2, bathrooms: 2, squareFeet: 1120, marketRent: 2450, status: UnitStatus.OCCUPIED },
          { number: '407', bedrooms: 1, bathrooms: 1, squareFeet: 780, marketRent: 1850, status: UnitStatus.OCCUPIED },
          { number: '212', bedrooms: 1, bathrooms: 1, squareFeet: 760, marketRent: 1795, status: UnitStatus.VACANT },
        ],
      },
    },
    include: { units: true },
  });
  const cedar = await prisma.property.create({
    data: {
      name: 'Cedar Riverside Homes',
      address1: '1815 Riverside Ave',
      city: 'Minneapolis',
      state: 'MN',
      postalCode: '55454',
      description: 'Community-focused homes near transit and the university.',
      units: {
        create: [
          { number: '2B', bedrooms: 2, bathrooms: 1, squareFeet: 980, marketRent: 1725, status: UnitStatus.OCCUPIED },
          { number: '3A', bedrooms: 3, bathrooms: 2, squareFeet: 1240, marketRent: 2125, status: UnitStatus.VACANT },
        ],
      },
    },
    include: { units: true },
  });
  const summit = await prisma.property.create({
    data: {
      name: 'Summit View Residences',
      address1: '1040 Grand Ave',
      city: 'Saint Paul',
      state: 'MN',
      postalCode: '55105',
      description: 'Classic residences on Grand Avenue.',
      units: {
        create: [
          { number: '3', bedrooms: 2, bathrooms: 1.5, squareFeet: 1050, marketRent: 1925, status: UnitStatus.OCCUPIED },
          { number: '6', bedrooms: 1, bathrooms: 1, squareFeet: 720, marketRent: 1595, status: UnitStatus.OCCUPIED },
        ],
      },
    },
    include: { units: true },
  });

  await prisma.propertyOwner.createMany({
    data: [northLoop.id, cedar.id, summit.id].map((propertyId) => ({ userId: owner.id, propertyId })),
  });

  const amina = await prisma.tenant.create({
    data: {
      userId: tenantUser.id,
      firstName: 'Amina',
      lastName: 'Yusuf',
      email: 'amina.yusuf@example.com',
      phone: '612-555-0101',
      emergencyName: 'Hassan Yusuf',
      emergencyPhone: '612-555-0190',
    },
  });
  const daniel = await prisma.tenant.create({
    data: { firstName: 'Daniel', lastName: 'Brooks', email: 'daniel.brooks@example.com', phone: '612-555-0102' },
  });
  const elena = await prisma.tenant.create({
    data: { firstName: 'Elena', lastName: 'Martinez', email: 'elena.martinez@example.com', phone: '651-555-0103' },
  });

  const aminaLease = await prisma.lease.create({
    data: {
      unitId: cedar.units.find((unit) => unit.number === '2B')!.id,
      startDate: monthAgo,
      endDate: nextYear,
      monthlyRent: 1725,
      securityDeposit: 1725,
      status: LeaseStatus.ACTIVE,
      tenants: { create: { tenantId: amina.id, primary: true } },
    },
  });
  const danielLease = await prisma.lease.create({
    data: {
      unitId: northLoop.units.find((unit) => unit.number === '407')!.id,
      startDate: monthAgo,
      endDate: nextYear,
      monthlyRent: 1850,
      securityDeposit: 1850,
      status: LeaseStatus.ACTIVE,
      tenants: { create: { tenantId: daniel.id, primary: true } },
    },
  });
  await prisma.lease.create({
    data: {
      unitId: summit.units.find((unit) => unit.number === '3')!.id,
      startDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      endDate: in45Days,
      monthlyRent: 1925,
      securityDeposit: 1925,
      status: LeaseStatus.EXPIRING,
      tenants: { create: { tenantId: elena.id, primary: true } },
    },
  });

  await prisma.payment.createMany({
    data: [
      { tenantId: amina.id, leaseId: aminaLease.id, amount: 1725, dueDate: new Date(now.getFullYear(), now.getMonth(), 1), paidAt: new Date(now.getFullYear(), now.getMonth(), 1), status: PaymentStatus.PAID },
      { tenantId: daniel.id, leaseId: danielLease.id, amount: 1850, dueDate: new Date(now.getFullYear(), now.getMonth(), 1), paidAt: new Date(now.getFullYear(), now.getMonth(), 2), status: PaymentStatus.PAID },
      { tenantId: amina.id, leaseId: aminaLease.id, amount: 1725, dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), status: PaymentStatus.PENDING },
    ],
  });
  await prisma.expense.createMany({
    data: [
      { propertyId: northLoop.id, category: ExpenseCategory.UTILITIES, amount: 1320, incurredAt: now, vendor: 'Xcel Energy', description: 'Common-area utilities' },
      { propertyId: cedar.id, category: ExpenseCategory.MAINTENANCE, amount: 480, incurredAt: now, vendor: 'Metro HVAC', description: 'Seasonal system inspection' },
      { propertyId: summit.id, category: ExpenseCategory.INSURANCE, amount: 2150, incurredAt: now, vendor: 'North Star Insurance', description: 'Monthly insurance allocation' },
    ],
  });
  await prisma.maintenanceRequest.createMany({
    data: [
      {
        propertyId: cedar.id,
        unitId: cedar.units.find((unit) => unit.number === '2B')!.id,
        tenantId: amina.id,
        assignedTechnicianId: technician.id,
        title: 'No heat in bedroom',
        description: 'Bedroom radiator stopped producing heat this morning.',
        priority: MaintenancePriority.URGENT,
        status: MaintenanceStatus.ASSIGNED,
      },
      {
        propertyId: northLoop.id,
        unitId: northLoop.units.find((unit) => unit.number === '407')!.id,
        tenantId: daniel.id,
        title: 'Kitchen faucet leaking',
        description: 'Slow leak is visible beneath the kitchen faucet handle.',
        priority: MaintenancePriority.HIGH,
        status: MaintenanceStatus.NEW,
      },
    ],
  });

  logInfo('EstateOS test fixtures seeded', {
    manager: manager.email,
    technician: technician.email,
    tenant: tenantUser.email,
    owner: owner.email,
  });
}

main()
  .catch((error) => {
    logError('EstateOS seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
