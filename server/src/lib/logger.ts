type LogContext = Record<string, unknown>;

function errorContext(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }
  return { error };
}

function write(level: 'info' | 'error', message: string, context: LogContext = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${entry}\n`);
}

export function logInfo(message: string, context?: LogContext) {
  write('info', message, context);
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  write('error', message, { ...context, ...(error === undefined ? {} : errorContext(error)) });
}
