import posthog from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Sin NEXT_PUBLIC_POSTHOG_KEY todo es no-op (desarrollo sin cuenta).
export const analyticsEnabled = Boolean(KEY);

let initialized = false;

export function initAnalytics() {
  if (!KEY || initialized || typeof window === 'undefined') return;
  initialized = true;
  posthog.init(KEY, {
    // Proxy vía Next (rewrites en next.config.mjs) para que los bloqueadores
    // de anuncios no descarten los eventos.
    api_host: '/ingest',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace('.i.posthog.com', '.posthog.com') || 'https://us.posthog.com',
    defaults: '2026-08-30', // incluye $pageview en cada navegación del App Router
    person_profiles: 'identified_only',
    // La app muestra nombres de socios y datos de salud: no enviar el texto
    // de los elementos clicados ni lo tecleado en inputs.
    mask_all_text: true,
    session_recording: { maskAllInputs: true, maskTextSelector: '*' },
  });
}

type TokenPayload = { sub?: string; gymId?: string; role?: string };

function readTokenPayload(token: string): TokenPayload {
  try {
    const payload = token.split('.')[1];
    return payload ? JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) : {};
  } catch {
    return {};
  }
}

/** Asocia la sesión de PostHog al usuario y a su gimnasio (grupo "gym"). */
export function identifyFromToken(token: string | null | undefined) {
  if (!initialized || !token) return;
  const { sub, gymId, role } = readTokenPayload(token);
  if (!sub) return;
  if (posthog.get_distinct_id() !== sub) posthog.identify(sub, { role, gymId });
  if (gymId) posthog.group('gym', gymId);
}

export function resetAnalytics() {
  if (initialized) posthog.reset();
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (initialized) posthog.capture(event, properties);
}

export function captureException(error: unknown, properties?: Record<string, unknown>) {
  if (initialized) posthog.captureException(error, properties);
}
