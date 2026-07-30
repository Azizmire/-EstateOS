export type PropertyRecord = {
  id: string; name: string; address: string; city: string; units: number;
  occupied: number; monthlyRent: number; openMaintenance: number;
  unitOptions?: { id: string; number: string; status?: string }[];
};
export type TenantRecord = {
  id: string; name: string; email: string; phone: string; property: string; unit: string; status: string;
};
export type LeaseRecord = {
  id: string; tenant: string; property: string; unit: string; rent: number;
  startDate: string; endDate: string; status: 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'ENDED' | 'TERMINATED';
  tenantId?: string; unitId?: string;
};
export type WorkOrder = {
  id: string; title: string; property: string; unit: string; tenant: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string; technician?: string;
};
export type PaymentRecord = {
  id: string; tenant: string; property: string; amount: number; dueDate: string;
  status: 'PENDING' | 'PAID' | 'LATE' | 'FAILED' | 'REFUNDED';
};
export type NotificationRecord = { id: string; title: string; message: string; read: boolean; createdAt: string };
export type Workspace = {
  properties: PropertyRecord[]; tenants: TenantRecord[]; leases: LeaseRecord[];
  maintenance: WorkOrder[]; payments: PaymentRecord[]; notifications: NotificationRecord[];
  summary?: { revenue: number; expenses: number; netOperatingIncome: number };
};
