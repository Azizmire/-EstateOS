import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './api';

vi.mock('./api', async (loadOriginal) => {
  const original = await loadOriginal<typeof import('./api')>();
  return {
    ...original,
    login: vi.fn(),
    loadWorkspace: vi.fn(),
    logout: vi.fn(),
  };
});

const managerSession: api.Session = {
  token: 'access',
  refreshToken: 'refresh',
  user: { id: 'manager-1', name: 'Morgan Manager', email: 'manager@example.com', role: 'MANAGER' },
};

describe('EstateOS application', () => {
  beforeEach(() => {
    vi.mocked(api.login).mockReset();
    vi.mocked(api.loadWorkspace).mockResolvedValue({
      dashboard: {},
      properties: { properties: [] },
      tenants: { tenants: [] },
      leases: { leases: [] },
      payments: { payments: [] },
      maintenance: { requests: [] },
      notifications: { notifications: [] },
    });
  });

  it('does not expose local demo roles in the normal build', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ADMIN' })).not.toBeInTheDocument();
  });

  it('authenticates and loads the manager workspace', async () => {
    vi.mocked(api.login).mockResolvedValue(managerSession);
    render(<App />);
    await userEvent.type(screen.getByLabelText('Email address'), managerSession.user.email);
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery staple');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(api.loadWorkspace).toHaveBeenCalledWith(managerSession));
    expect(await screen.findByText('Portfolio workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Residents/ })).toBeInTheDocument();
  });

  it('shows authentication errors without entering the workspace', async () => {
    vi.mocked(api.login).mockRejectedValue(new api.ApiError('Invalid email or password', 401));
    render(<App />);
    await userEvent.type(screen.getByLabelText('Email address'), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
