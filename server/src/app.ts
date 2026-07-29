import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import docsRoutes from './routes/docs.js';
import leaseRoutes from './routes/leases.js';
import maintenanceRoutes from './routes/maintenance.js';
import paymentRoutes from './routes/payments.js';
import propertyRoutes from './routes/properties.js';
import tenantRoutes from './routes/tenants.js';
import { errorHandler, notFound } from './middleware/error.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

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

app.use(notFound);
app.use(errorHandler);
