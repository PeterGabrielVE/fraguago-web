// lib/errorReporter.ts
type ErrorType =
  | 'nextjs' | 'global-error' | 'uncaught'
  | 'unhandledrejection' | 'resource' | 'http';

interface RawError {
  type?: ErrorType;
  message?: string;
  error?: unknown;
  reason?: unknown;
  source?: string | null;
  digest?: string | null;
  componentStack?: string | null;
}

const seen = new Map<string, number>();
const DEDUP_WINDOW = 5000;

export function reportError(raw: RawError): void {
  const payload = normalize(raw);
  const key = `${payload.type}:${payload.message}:${payload.source ?? ''}`;
  const now = Date.now();

  if (seen.has(key) && now - seen.get(key)! < DEDUP_WINDOW) return;
  seen.set(key, now);

  try {
    console.error('[app-error]', payload);
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify(payload);
      const sent = navigator.sendBeacon?.('/api/errors', body);
      if (!sent) {
        void fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    }
  } catch {
    /* el reporter nunca debe lanzar */
  }
}

function normalize(raw: RawError) {
  const err = (raw.error ?? raw.reason) as Error | undefined;
  return {
    type: raw.type ?? 'uncaught',
    message: raw.message ?? err?.message ?? String(raw.reason ?? 'Unknown error'),
    stack: err?.stack ?? null,
    digest: raw.digest ?? null,
    source: raw.source ?? null,
    componentStack: raw.componentStack ?? null,
    url: typeof location !== 'undefined' ? location.href : null,
    timestamp: new Date().toISOString(),
  };
}