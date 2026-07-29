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
          role: { type: 'string', example: 'ADMIN' },
        },
      },
      Property: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: { type: 'string' },
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
          status: { type: 'string', example: 'ACTIVE' },
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
          status: { type: 'string', example: 'PENDING' },
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
          priority: { type: 'string', example: 'MEDIUM' },
          status: { type: 'string', example: 'OPEN' },
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
  },
} as const;
