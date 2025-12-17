/**
 * Simple logger compatible with Next.js serverless/edge runtime
 * Replaces pino which has Node.js-specific dependencies that break Turbopack builds
 *
 * API matches pino's signature: logger.info(data, message) or logger.info(message)
 */

const isProd = process.env.NODE_ENV === "production";

type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = isProd ? levels.info : levels.debug;

function formatMessage(level: LogLevel, message: string, data?: object): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`;
}

// Pino-compatible signature: logger.info(data, message) or logger.info(message)
type LogFn = {
  (msg: string): void;
  (data: object, msg: string): void;
};

function createLogFn(level: LogLevel): LogFn {
  return function (dataOrMsg: string | object, msg?: string) {
    if (currentLevel > levels[level]) return;

    let message: string;
    let data: object | undefined;

    if (typeof dataOrMsg === "string") {
      message = dataOrMsg;
    } else {
      data = dataOrMsg;
      message = msg || "";
    }

    const formatted = formatMessage(level, message, data);

    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  };
}

interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  child: (bindings: object) => Logger;
}

function createLogger(bindings?: object): Logger {
  const wrapWithBindings = (fn: LogFn): LogFn => {
    return function (dataOrMsg: string | object, msg?: string) {
      if (typeof dataOrMsg === "string") {
        fn(bindings || {}, dataOrMsg);
      } else {
        fn({ ...bindings, ...dataOrMsg }, msg || "");
      }
    } as LogFn;
  };

  const baseLogger: Logger = {
    debug: createLogFn("debug"),
    info: createLogFn("info"),
    warn: createLogFn("warn"),
    error: createLogFn("error"),
    child: (childBindings: object) => createLogger({ ...bindings, ...childBindings }),
  };

  if (bindings) {
    return {
      debug: wrapWithBindings(baseLogger.debug),
      info: wrapWithBindings(baseLogger.info),
      warn: wrapWithBindings(baseLogger.warn),
      error: wrapWithBindings(baseLogger.error),
      child: baseLogger.child,
    };
  }

  return baseLogger;
}

export const logger = createLogger();
