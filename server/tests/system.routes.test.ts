import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('system routes', () => {
  it('reports service health with request and security headers', async () => {
    const response = await request(app).get('/api/health').set('x-request-id', 'health-check-1');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'estateos-api' });
    expect(response.headers['x-request-id']).toBe('health-check-1');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['ratelimit-limit']).toBe('300');
  });

  it('returns a structured 404 response for unknown API routes', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Route not found');
  });
});
