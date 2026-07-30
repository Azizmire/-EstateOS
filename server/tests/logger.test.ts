import { afterEach, describe, expect, it, vi } from 'vitest';
import { logError, logInfo } from '../src/lib/logger.js';

describe('structured logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes structured informational events to stdout', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    logInfo('service ready', { port: 4000 });

    const entry = JSON.parse(String(write.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: 'info',
      message: 'service ready',
      port: 4000,
    });
    expect(entry.timestamp).toEqual(expect.any(String));
  });

  it('writes safe structured error details to stderr', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    logError('operation failed', new Error('database unavailable'), { requestId: 'request-1' });

    const entry = JSON.parse(String(write.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: 'error',
      message: 'operation failed',
      errorName: 'Error',
      errorMessage: 'database unavailable',
      requestId: 'request-1',
    });
  });
});
