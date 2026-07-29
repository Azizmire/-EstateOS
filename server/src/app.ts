import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { createAuditMiddleware } from './middleware/audit.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import docsRoutes from './routes/docs.js';
import leaseRoutes from './routes/leases.js';
import maintenanceRoutes from './routes/maintenance.js';
import paymentRoutes from './routes/payments.js';
import propertyRoutes from './routes/properties.js';
import tenantRoutes from './routes/tenants.js';
import { createUploadRouter } from './routes/upload.routes.js';
import { auditService } from './services/audit.service.js';
import { FileValidationService } from './services/file-validation.service.js';
import { ImageService } from './services/image.service.js';
import { fileAssetService } from './services/prisma-file-asset.service.js';
import { UploadService } from './services/upload.service.js';
import { LocalStorageProvider } from './storage/local.provider.js';

const storage = new LocalStorageProvider(env.UPLOAD_DIR);
const uploadRoutes = createUploadRouter({
  uploadService: new UploadService(storage),
  imageService: new ImageService(),
  fileValidationService: new FileValidationService(),
  fileAssetService,
});

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(createAuditMiddleware(auditService));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'estateos-api', timestamp: new Date().toISOString() });
});

app.use('/api', docsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);
