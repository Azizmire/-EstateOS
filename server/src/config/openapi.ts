export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'EstateOS API',
    version: '1.0.0',
    description:
      'REST API for EstateOS property operations, including portfolio management, leasing, payments, maintenance, and analytics.',
  },
  servers: [
    {
      url: '/api',
      description: 'Current EstateOS API server',
    },
  ],
  tags: [
    { name: 'System' },
    { name: 'Authentication' },
    { name: 'Dashboard' },
    { name: 'Properties' },
    { name: 'Tenants' },
    { name: 'Leases' },
    { name: 'Payments' },
    { name: 'Maintenance' },
    { name: 'Expenses' },
    { name: 'Notifications' },
    { name: 'Files' },
    { name: 'Portals' },
    { name: 'Reports' },
    { name: 'Administration' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'Resource not found' },
          issues: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'MAINTENANCE', 'TENANT', 'OWNER'] },
        },
      },
      Property: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          address1: { type: 'string' },
          address2: { type: 'string', nullable: true },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
        },
      },
      Lease: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          unitId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          monthlyRent: { type: 'number', format: 'double' },
          securityDeposit: { type: 'number', format: 'double' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'EXPIRING', 'ENDED', 'TERMINATED'] },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          leaseId: { type: 'string' },
          amount: { type: 'number', format: 'double' },
          dueDate: { type: 'string', format: 'date-time' },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'PAID', 'LATE', 'FAILED', 'REFUNDED'] },
        },
      },
      MaintenanceRequest: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          propertyId: { type: 'string' },
          unitId: { type: 'string', nullable: true },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
          status: { type: 'string', enum: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'] },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Check API health',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'estateos-api' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered' },
          '400': { description: 'Invalid request' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate and receive a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authentication successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate a refresh session and issue a new access token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string', minLength: 32 } } } } } },
        responses: { '200': { description: 'Session rotated' }, '401': { description: 'Refresh session invalid or expired' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke a refresh session',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { '204': { description: 'Session revoked' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change password and revoke all refresh sessions',
        security: [{ bearerAuth: [] }],
        responses: { '204': { description: 'Password changed and sessions revoked' }, '401': { description: 'Current password invalid' } },
      },
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get portfolio analytics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Portfolio dashboard metrics' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/properties': {
      get: {
        tags: ['Properties'],
        summary: 'List properties',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Property list' } },
      },
      post: {
        tags: ['Properties'],
        summary: 'Create a property',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Property created' } },
      },
    },
    '/properties/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      get: {
        tags: ['Properties'],
        summary: 'Get a property',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Property details' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Properties'],
        summary: 'Update a property',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Property updated' } },
      },
      delete: {
        tags: ['Properties'],
        summary: 'Delete a property',
        security: [{ bearerAuth: [] }],
        responses: { '204': { description: 'Property deleted' } },
      },
    },
    '/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenants',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Tenant list' } },
      },
      post: {
        tags: ['Tenants'],
        summary: 'Create a tenant',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Tenant created' } },
      },
    },
    '/leases': {
      get: {
        tags: ['Leases'],
        summary: 'List leases',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Lease list' } },
      },
      post: {
        tags: ['Leases'],
        summary: 'Create a lease',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Lease created' } },
      },
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Payment list' } },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create a payment',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Payment created' } },
      },
    },
    '/payments/summary': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment summary',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Payment summary' } },
      },
    },
    '/maintenance': {
      get: {
        tags: ['Maintenance'],
        summary: 'List maintenance requests',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Maintenance request list' } },
      },
      post: {
        tags: ['Maintenance'],
        summary: 'Create a maintenance request',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Maintenance request created' } },
      },
    },
    '/maintenance/summary': {
      get: {
        tags: ['Maintenance'],
        summary: 'Get maintenance summary',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Maintenance summary' } },
      },
    },
    '/leases/{id}/activate': {
      post: {
        tags: ['Leases'],
        summary: 'Activate a draft lease and occupy its unit',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Lease activated' }, '409': { description: 'Unit is unavailable' } },
      },
    },
    '/leases/{id}/renew': {
      post: {
        tags: ['Leases'],
        summary: 'Create a renewal lease',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Renewal created' } },
      },
    },
    '/leases/{id}/move-out': {
      post: {
        tags: ['Leases'],
        summary: 'Complete a move-out and release the unit',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Move-out completed' } },
      },
    },
    '/maintenance/{id}/updates': {
      post: {
        tags: ['Maintenance'],
        summary: 'Add a work-order update and optionally transition status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Update recorded' } },
      },
    },
    '/portal/tenant': {
      get: {
        tags: ['Portals'],
        summary: 'Get the authenticated tenant’s scoped workspace',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Tenant workspace' }, '404': { description: 'Tenant profile not linked' } },
      },
    },
    '/portal/tenant/maintenance': {
      post: {
        tags: ['Portals'],
        summary: 'Create a maintenance request for the authenticated tenant',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Maintenance request created' }, '403': { description: 'Unit is not attached to the tenant' } },
      },
    },
    '/portal/owner': {
      get: {
        tags: ['Portals'],
        summary: 'Get properties assigned to the authenticated owner',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Owner portfolio and financial performance' } },
      },
    },
    '/reports/financial': {
      get: {
        tags: ['Reports'],
        summary: 'Get monthly financial reporting for a date range',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { '200': { description: 'Financial report' }, '400': { description: 'Invalid or excessive date range' } },
      },
    },
    '/reports/portfolio': {
      get: {
        tags: ['Reports'],
        summary: 'Get database-aggregated portfolio counts',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Portfolio report' } },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Administration'],
        summary: 'List users and their Tenant/Owner assignments',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User list' }, '403': { description: 'Administrator role required' } },
      },
    },
    '/admin/users/{id}/access': {
      patch: {
        tags: ['Administration'],
        summary: 'Update role and required Tenant/Owner assignments',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Access updated' }, '400': { description: 'Required assignment missing' }, '409': { description: 'Cannot remove own administrator access' } },
      },
    },
    '/admin/audit': {
      get: {
        tags: ['Administration'],
        summary: 'List durable audit events',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Audit event list' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List current-user notifications with pagination',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification list' } },
      },
    },
    '/files': {
      get: {
        tags: ['Files'],
        summary: 'List files visible to the current role with pagination',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Authorized file list' } },
      },
    },
  },
} as const;
