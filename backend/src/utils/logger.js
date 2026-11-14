const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  const formatted = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
  return `[${timestamp}] [${level.toUpperCase()}]: ${formatted}`;
};

export const logger = {
  info: (message, ...args) => {
    console.log(formatMessage('info', message), ...args);
  },
  error: (message, ...args) => {
    console.error(formatMessage('error', message), ...args);
  },
  warn: (message, ...args) => {
    console.warn(formatMessage('warn', message), ...args);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message), ...args);
    }
  },
};

export default { logger };
