'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BADGES_REFRESH_EVENT,
  badgeIcon,
  formatPoints,
  type MemberBadge,
} from '@/lib/gamification';

// GAM-F02 — pop-up de "¡Insignia desbloqueada!" en el portal del socio.
// Revisa las insignias no vistas al entrar, al navegar y cuando alguien
// dispara BADGES_REFRESH_EVENT (p. ej. tras marcar asistencia). Las muestra
// de a una y las marca como vistas al cerrarlas.
export default function BadgeUnlockNotifier() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<MemberBadge[]>([]);
  const loading = useRef(false);

  const check = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const unseen = (await api.get('/me/badges/unseen')) as MemberBadge[] | null;
      if (unseen?.length) {
        setQueue((prev) => {
          const known = new Set(prev.map((b) => b.id));
          return [...prev, ...unseen.filter((b) => !known.has(b.id))];
        });
      }
    } catch {
      // Silencioso: la notificación es accesoria, no debe molestar si falla.
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    check();
  }, [pathname, check]);

  useEffect(() => {
    window.addEventListener(BADGES_REFRESH_EVENT, check);
    return () => window.removeEventListener(BADGES_REFRESH_EVENT, check);
  }, [check]);

  const current = queue[0];

  function dismiss() {
    if (!current) return;
    setQueue((prev) => prev.slice(1));
    api.post('/me/badges/seen', { ids: [current.id] }).catch(() => {
      // Si falla, reaparecerá en la próxima revisión; no es crítico.
    });
  }

  if (!current) return null;
  const Icon = badgeIcon(current.badge.icon);
  const remaining = queue.length - 1;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent showCloseButton={false} className="overflow-hidden p-0 sm:max-w-sm">
        <div className="relative flex flex-col items-center bg-gradient-to-b from-amber-100 to-white px-6 pb-6 pt-10 text-center">
          <Sparkles className="absolute left-8 top-6 h-5 w-5 animate-pulse text-amber-400" aria-hidden />
          <Sparkles className="absolute right-10 top-12 h-4 w-4 animate-pulse text-amber-500 [animation-delay:300ms]" aria-hidden />
          <Sparkles className="absolute bottom-24 left-12 h-3 w-3 animate-pulse text-amber-300 [animation-delay:600ms]" aria-hidden />

          <div className="relative mb-5">
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" aria-hidden />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg shadow-amber-600/30 animate-in zoom-in-50 duration-500">
              <Icon className="h-12 w-12" />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">¡Insignia desbloqueada!</p>
          <DialogTitle className="mt-1 text-2xl font-bold text-slate-900">{current.badge.name}</DialogTitle>
          {current.badge.description && (
            <DialogDescription className="mt-1 text-sm text-slate-600">{current.badge.description}</DialogDescription>
          )}
          {current.badge.pointsReward > 0 && (
            <p className="mt-3 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              +{formatPoints(current.badge.pointsReward)} puntos
            </p>
          )}

          <button
            type="button"
            onClick={dismiss}
            autoFocus
            className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            {remaining > 0 ? `Siguiente (${remaining} más)` : '¡Genial!'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
