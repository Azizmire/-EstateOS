import cors from 'cors';
import express from 'express';
import { prisma } from './lib/prisma.js';
import { env } from './config/env.js';
import { createAuditMiddleware } from './middleware/audit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { rateLimit, requestContext, securityHeaders } from './middleware/security.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import docsRoutes from './routes/docs.js';
import expenseRoutes from './routes/expenses.js';
import { createFileRouter } from './routes/files.js';
import leaseRoutes from './routes/leases.js';
import maintenanceRoutes from './routes/maintenance.js';
import notificationRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payments.js';
import portalRoutes from './routes/portal.js';
import propertyRoutes from './routes/properties.js';
import reportRoutes from './routes/reports.js';
import tenantRoutes from './routes/tenants.js';
import { createUploadRouter } from './routes/upload.routes.js';
import { auditService } from './services/audit.service.js';
import { FileValidationService } from './services/file-validation.service.js';
import { ImageService } from './services/image.service.js';
import { fileAssetService } from './services/prisma-file-asset.service.js';
import { UploadService } from './services/upload.service.js';
import { metricsMiddleware } from './services/metrics.service.js';
import { LocalStorageProvider } from './storage/local.provider.js';
import { MalwareScanService } from './services/malware-scan.service.js';
import { redis } from './lib/redis.js';

const storage = new LocalStorageProvider(env.UPLOAD_DIR);
const malwareScanner = new MalwareScanService();
const uploadRoutes = createUploadRouter({
  uploadService: new UploadService(storage),
  imageService: new ImageService(),
  fileValidationService: new FileValidationService(),
  fileAssetService,
  malwareScanner,
});

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestContext);
app.use(securityHeaders);
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(rateLimit({ windowMs: 60_000, limit: 300, keyPrefix: 'api' }));
app.use(metricsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(createAuditMiddleware(auditService));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'estateos-api', timestamp: new Date().toISOString() });
});
app.get('/api/ready', async (_req, res) => {
  try {
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redis?.ping(),
      malwareScanner.ping(),
    ]);
    res.json({ status: 'ready', database: 'connected', rateLimitStore: redis ? 'connected' : 'local', malwareScanner: env.CLAMAV_HOST ? 'connected' : 'disabled', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not-ready', database: 'unavailable' });
  }
});

app.use('/api', docsRoutes);
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 25, keyPrefix: 'auth' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/files', createFileRouter(storage));
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);
