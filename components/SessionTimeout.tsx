'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useT } from '@/components/I18nProvider';
import { refreshSession } from '@/lib/api';
import { clearSession, logout } from '@/lib/auth';
import { isBackendUp } from '@/lib/offline/connectivity';

// Cierre por inactividad: 30 min sin interacción (criterio NIST 800-63B AAL2
// para datos personales y de salud), con aviso 2 min antes para que el usuario
// decida si sigue. Mientras haya actividad la sesión dura hasta 7 días
// (refresh token deslizante). Ajustable con NEXT_PUBLIC_SESSION_IDLE_MINUTES.
const IDLE_MS = (Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES) || 30) * 60_000;
const WARNING_MS = 2 * 60_000;
// Compartido entre pestañas: usar la app en una mantiene vivas las demás.
const ACTIVITY_KEY = 'fg_last_activity';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
// No escribimos en localStorage en cada evento (scroll dispara decenas por segundo).
const WRITE_THROTTLE_MS = 10_000;

function readLastActivity() {
  try {
    const value = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActivity(time = Date.now()) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(time));
  } catch {
    // Sin storage (modo privado estricto): el temporizador sigue por pestaña.
  }
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function SessionTimeout() {
  const t = useT();
  // ms restantes mientras se muestra el aviso; null = sin aviso.
  const [remaining, setRemaining] = useState<number | null>(null);
  const [renewing, setRenewing] = useState(false);
  const warningRef = useRef(false);
  const endingRef = useRef(false);

  const endSession = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    void logout('idle');
  }, []);

  const tick = useCallback(() => {
    if (endingRef.current) return;
    // Basado en la hora y no en un setTimeout: tras suspender el equipo o con
    // la pestaña en segundo plano (timers ralentizados) el cálculo sigue exacto.
    const left = readLastActivity() + IDLE_MS - Date.now();
    // Sin conexión no se puede volver a iniciar sesión: cerrar por inactividad
    // dejaría la recepción bloqueada hasta que vuelva internet. El cierre (y
    // su aviso) se aplazan; al recuperar la conexión se evalúa de nuevo.
    if (!isBackendUp()) {
      warningRef.current = false;
      setRemaining(null);
      return;
    }
    if (left <= 0) {
      endSession();
      return;
    }
    const warn = left <= WARNING_MS;
    warningRef.current = warn;
    setRemaining(warn ? left : null);
  }, [endSession]);

  useEffect(() => {
    let lastWrite = 0;
    const markActive = () => {
      // Con el aviso abierto la continuidad se confirma con el botón, no moviendo el mouse.
      if (warningRef.current) return;
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      writeLastActivity(now);
    };

    const onStorage = (event: StorageEvent) => {
      // Cerró sesión en otra pestaña.
      if (event.key === 'fg_token' && event.newValue === null && !endingRef.current) {
        endingRef.current = true;
        window.location.href = '/login';
        return;
      }
      // Otra pestaña registró actividad o eligió "Seguir conectado".
      if (event.key === ACTIVITY_KEY) tick();
    };

    // Entrar o recargar cuenta como actividad.
    writeLastActivity();
    lastWrite = Date.now();

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }));
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', tick);
    const interval = window.setInterval(tick, 1000);
    tick();

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', tick);
      window.clearInterval(interval);
    };
  }, [tick]);

  async function stay() {
    if (renewing || endingRef.current) return;
    setRenewing(true);
    // Renovar en el servidor confirma que la sesión sigue siendo válida y
    // extiende el refresh token, no solo el temporizador local.
    const token = await refreshSession();
    setRenewing(false);
    if (!token) {
      endingRef.current = true;
      clearSession();
      window.location.href = '/login?reason=expired';
      return;
    }
    writeLastActivity();
    warningRef.current = false;
    setRemaining(null);
  }

  return (
    <AlertDialog
      open={remaining !== null}
      // Escape cuenta como "sigo aquí".
      onOpenChange={(open) => { if (!open) void stay(); }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('session.idleTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('session.idleDesc', { time: formatCountdown(remaining ?? 0) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction variant="outline" onClick={endSession} disabled={renewing}>
            {t('session.logout')}
          </AlertDialogAction>
          <AlertDialogAction onClick={stay} disabled={renewing} autoFocus>
            {renewing && <Loader2 className="h-4 w-4 animate-spin" />}
            {renewing ? t('session.renewing') : t('session.stay')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
