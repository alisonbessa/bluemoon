import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Scrub potential PII from log messages in production
 */
function scrubPII(message: string): string {
  if (isDev) return message;
  // Mask email addresses
  message = message.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL_REDACTED]"
  );
  // Mask potential tokens/secrets (long alphanumeric strings)
  message = message.replace(
    /(?:token|secret|key|password|authorization)[=:\s]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
    "$&[REDACTED]"
  );
  return message;
}

/**
 * Scrub PII from context values in production
 */
function scrubContext(context: LogContext): LogContext {
  if (isDev) return context;
  const scrubbed: LogContext = {};
  const sensitiveKeys = [
    "email",
    "name",
    "password",
    "token",
    "secret",
    "authorization",
  ];
  for (const [key, value] of Object.entries(context)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      scrubbed[key] = "[REDACTED]";
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

function formatMessage(
  _level: LogLevel,
  module: string,
  message: string
): string {
  return `[${module}] ${message}`;
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  debug(message: string, context?: LogContext): void {
    if (!isDev) return; // Only log debug in development
    const formatted = formatMessage("debug", this.module, message);
    console.debug(formatted, context ? context : "");
  }

  info(message: string, context?: LogContext): void {
    const formatted = formatMessage("info", this.module, scrubPII(message));
    const scrubbedCtx = context ? scrubContext(context) : undefined;
    // Always log info to console (visible in Vercel Runtime Logs)
    console.info(formatted, scrubbedCtx || "");
    // In production, also add as Sentry breadcrumb
    if (!isDev) {
      Sentry.addBreadcrumb({
        category: this.module,
        message: scrubPII(message),
        level: "info",
        data: scrubbedCtx,
      });
    }
  }

  warn(message: string, context?: LogContext): void {
    const formatted = formatMessage("warn", this.module, scrubPII(message));
    const scrubbedCtx = context ? scrubContext(context) : undefined;
    // Always log warnings to console (visible in Vercel Runtime Logs)
    console.warn(formatted, scrubbedCtx || "");
    if (!isDev) {
      Sentry.addBreadcrumb({
        category: this.module,
        message: scrubPII(message),
        level: "warning",
        data: scrubbedCtx,
      });
    }
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const formatted = formatMessage("error", this.module, scrubPII(message));
    const scrubbedCtx = context ? scrubContext(context) : undefined;
    // Always log errors to console (visible in Vercel Runtime Logs)
    console.error(formatted, error || "", scrubbedCtx || "");
    // Also report to Sentry in production
    if (!isDev) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: { module: this.module },
          extra: { ...scrubbedCtx, originalMessage: scrubPII(message) },
        });
      } else {
        Sentry.captureMessage(scrubPII(message), {
          level: "error",
          tags: { module: this.module },
          extra: { ...scrubbedCtx, errorDetail: error },
        });
      }
    }
  }
}

/**
 * Create a logger instance for a specific module
 * @example
 * const logger = createLogger("stripe-webhook");
 * logger.info("Processing event", { eventType: "invoice.paid" });
 * logger.error("Failed to process", error, { userId: "123" });
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}

export default createLogger;
