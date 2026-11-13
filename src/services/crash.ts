type CrashReporter = {
  init: () => void;
  captureException: (error: unknown) => void;
};

let reporter: CrashReporter = {
  init() {},
  captureException() {},
};

export function initCrashReporting(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn == null || dsn.length === 0) {
    return;
  }
  try {
    // Lazy load so missing native linking doesn't crash Jest/web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
    });
    reporter = {
      init() {},
      captureException(error) {
        Sentry.captureException(error);
      },
    };
  } catch {
    // keep noop
  }
}

export function captureException(error: unknown): void {
  reporter.captureException(error);
}
