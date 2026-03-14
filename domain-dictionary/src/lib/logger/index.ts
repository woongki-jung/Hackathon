// CMN-LOG-001: 구조화된 로거

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;

  if (level === 'error') {
    console.error(prefix, message, context ?? '');
  } else if (level === 'warn') {
    console.warn(prefix, message, context ?? '');
  } else if (process.env.NODE_ENV !== 'production' || level !== 'debug') {
    console.log(prefix, message, context ?? '');
  }

  return entry;
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};
