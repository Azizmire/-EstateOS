export type Role = 'ADMIN' | 'MANAGER' | 'MAINTENANCE' | 'TENANT' | 'OWNER';
export type Session = {
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: Role };
};

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
let activeTokens: Pick<Session, 'token' | 'refreshToken'> | null = null;
let refreshPromise: Promise<void> | null = null;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${activeTokens?.token || token}`);
  let response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && token && activeTokens?.refreshToken && path !== '/auth/refresh') {
    refreshPromise ??= rotateSession().finally(() => { refreshPromise = null; });
    await refreshPromise;
    headers.set('authorization', `Bearer ${activeTokens.token}`);
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  }
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.message || 'EstateOS could not complete that request.', response.status);
  }
  return payload as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const result = await request<{ token: string; refreshToken: string; user: Session['user'] }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  activeTokens = { token: result.token, refreshToken: result.refreshToken };
  return result;
}

async function rotateSession() {
  if (!activeTokens?.refreshToken) throw new ApiError('Your session has expired. Please sign in again.', 401);
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: activeTokens.refreshToken }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    activeTokens = null;
    throw new ApiError(payload?.message || 'Your session has expired. Please sign in again.', response.status);
  }
  activeTokens = { token: payload.token, refreshToken: payload.refreshToken };
}

export async function logout(session: Session) {
  if (activeTokens?.refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: activeTokens.refreshToken }),
    }).catch(() => undefined);
  }
  activeTokens = null;
}

export async function loadWorkspace(session: Session) {
  if (session.user.role === 'TENANT') {
    return request<{ tenant: unknown }>('/portal/tenant', {}, session.token);
  }
  if (session.user.role === 'OWNER') {
    return request<{ properties: unknown[] }>('/portal/owner', {}, session.token);
  }
  if (session.user.role === 'MAINTENANCE') {
    const [maintenance, notifications] = await Promise.all([
      request<{ requests: unknown[] }>('/maintenance', {}, session.token),
      request<{ notifications: unknown[] }>('/notifications', {}, session.token),
    ]);
    return { maintenance, notifications };
  }
  const [dashboard, properties, tenants, leases, payments, maintenance, notifications] =
    await Promise.all([
      request<Record<string, unknown>>('/dashboard', {}, session.token),
      request<{ properties: unknown[] }>('/properties', {}, session.token),
      request<{ tenants: unknown[] }>('/tenants', {}, session.token),
      request<{ leases: unknown[] }>('/leases', {}, session.token),
      request<{ payments: unknown[] }>('/payments', {}, session.token),
      request<{ requests: unknown[] }>('/maintenance', {}, session.token),
      request<{ notifications: unknown[] }>('/notifications', {}, session.token),
    ]);
  return { dashboard, properties, tenants, leases, payments, maintenance, notifications };
}

export async function uploadFile(
  session: Session,
  kind: 'property-image' | 'lease-document' | 'maintenance-attachment',
  targetField: 'propertyId' | 'leaseId' | 'requestId',
  targetId: string,
  file: File,
) {
  const body = new FormData();
  body.set('file', file);
  body.set(targetField, targetId);
  return request<{ file: unknown }>(`/uploads/${kind}`, { method: 'POST', body }, session.token);
}
