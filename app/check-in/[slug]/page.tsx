'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useParams } from 'next/navigation';
import { liveQuery } from 'dexie';
import { AlertCircle, CheckCircle2, CloudUpload, IdCard, WifiOff } from 'lucide-react';
import Flame from '@/components/Flame';
import { api, NetworkError } from '@/lib/api';
import { getConnectivity, isBackendUp, startConnectivityMonitor, subscribeConnectivity } from '@/lib/offline/connectivity';
import { flushKiosk, listKioskEntries, queueKioskEntry } from '@/lib/offline/kiosk';
import { registerServiceWorker } from '@/lib/offline/service-worker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/components/I18nProvider';

// Tras marcar, la pantalla vuelve sola al formulario para el siguiente socio.
const RESET_AFTER_MS = 5000;

type CheckInResult = {
  firstName: string | null;
  checkedInAt: string;
  alreadyCheckedIn: boolean;
  pointsAwarded: number;
  // Guardada sin conexión: todavía no la validó el servidor.
  queued?: boolean;
};

const FLUSH_EVERY_MS = 20_000;

// Pantalla pública de asistencia: pensada para una tablet en la recepción.
// No requiere sesión; el gym sale de la URL (/check-in/<slug>, o el id en
// enlaces viejos: el API acepta ambos).
export default function PublicCheckInPage() {
  const { t, intlLocale } = useI18n();
  const timeFormat = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' });
  const { slug } = useParams<{ slug: string }>();
  const [gymName, setGymName] = useState<string | null>(null);
  const [gymError, setGymError] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  // null hasta montar: el servidor (UTC) daría otra hora que el navegador y
  // rompería la hidratación.
  const [now, setNow] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Candado síncrono contra doble clic/Enter: `loading` tarda un render en
  // deshabilitar el botón y en ese hueco cabe un segundo envío.
  const submittingRef = useRef(false);

  const connectivity = useSyncExternalStore(subscribeConnectivity, getConnectivity, getConnectivity);
  const online = connectivity.browserOnline && connectivity.backend !== 'down';
  const [pending, setPending] = useState(0);

  // Nombre del gym. Se recuerda en el dispositivo para que el kiosko siga
  // operativo si se recarga sin conexión; al volver se confirma con el API.
  useEffect(() => {
    const cacheKey = `fg_kiosk_gym:${slug}`;
    api.get(`/public/attendance/${encodeURIComponent(slug)}`)
      .then((gym: { name: string }) => {
        setGymName(gym.name);
        setGymError('');
        try { localStorage.setItem(cacheKey, gym.name); } catch { /* sin storage */ }
      })
      .catch((err) => {
        let remembered: string | null = null;
        try { remembered = localStorage.getItem(cacheKey); } catch { /* sin storage */ }
        if (err instanceof NetworkError && remembered) setGymName(remembered);
        else setGymError(err instanceof NetworkError ? err.message : t('attendance.kiosk.invalidLink'));
      });
  }, [slug, online]);

  // Modo offline del kiosko: vigila la conexión, deja la pantalla disponible
  // sin internet y envía lo guardado en cuanto vuelve.
  useEffect(() => {
    const stopMonitor = startConnectivityMonitor();
    void registerServiceWorker([`/check-in/${slug}`]);
    const subscription = liveQuery(() => listKioskEntries(slug)).subscribe({
      next: (entries) => setPending(entries.length),
      error: () => { /* sin IndexedDB no hay cola */ },
    });
    return () => {
      stopMonitor();
      subscription.unsubscribe();
    };
  }, [slug]);

  useEffect(() => {
    if (!online || pending === 0) return;
    const flush = () => { void flushKiosk(slug).catch(() => {}); };
    flush();
    const id = setInterval(flush, FLUSH_EVERY_MS);
    return () => clearInterval(id);
  }, [slug, online, pending > 0]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(reset, RESET_AFTER_MS);
    return () => clearTimeout(id);
  }, [result]);

  function reset() {
    setResult(null);
    setError('');
    setIdentificationNumber('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identificationNumber.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setLoading(true);

    const id = identificationNumber.trim();
    try {
      // Sin conexión conocida no se espera a que falle la red.
      if (!isBackendUp()) throw new NetworkError(t('api.offline'));
      const data = await api.post(`/public/attendance/${encodeURIComponent(slug)}/check-in`, {
        identificationNumber: id,
      }) as CheckInResult;
      setResult(data);
    } catch (requestError) {
      // Sin internet: se guarda a ciegas y el servidor la valida al recibirla.
      const saved = requestError instanceof NetworkError ? await queueKioskEntry(slug, id).catch(() => null) : null;
      if (saved) {
        setResult({ firstName: null, checkedInAt: saved.createdAt, alreadyCheckedIn: false, pointsAwarded: 0, queued: true });
        return;
      }
      setError(requestError instanceof Error ? requestError.message : t('attendance.kiosk.failed'));
      setIdentificationNumber('');
      inputRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="theme-static flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <Flame size={11} color="#fff" />
            </span>
            Fragua<span className="text-amber-500">Go</span>
          </div>
          {gymName && <p className="text-lg font-semibold text-slate-700">{gymName}</p>}
          <p className="h-10 text-4xl font-bold tabular-nums text-slate-900">{now ? timeFormat.format(now) : ''}</p>
        </div>

        <Card className="border-0 shadow-xl">
          <div className="p-6 sm:p-10">
            {gymError ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{gymError}</AlertDescription>
              </Alert>
            ) : result?.queued ? (
              <div className="space-y-5 text-center" role="status" aria-live="polite">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <CloudUpload className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-slate-900">{t('attendance.kiosk.savedOffline')}</h1>
                  <p className="text-sm leading-6 text-slate-600">
                    {t('attendance.kiosk.savedOfflineDesc', { time: timeFormat.format(new Date(result.checkedInAt)) })}
                  </p>
                </div>
                <Button variant="outline" onClick={reset} className="w-full">
                  {t('attendance.kiosk.done')}
                </Button>
              </div>
            ) : result ? (
              <div className="space-y-5 text-center" role="status" aria-live="polite">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {result.alreadyCheckedIn
                      ? t('attendance.kiosk.alreadyIn')
                      : result.firstName ? t('attendance.kiosk.welcomeName', { name: result.firstName }) : t('attendance.kiosk.welcome')}
                  </h1>
                  <p className="text-sm leading-6 text-slate-600">
                    {t('attendance.kiosk.registeredAt', { time: timeFormat.format(new Date(result.checkedInAt)) })}
                  </p>
                  {result.pointsAwarded > 0 && (
                    <p className="text-sm font-semibold text-amber-600">{t('attendance.kiosk.points', { count: result.pointsAwarded })}</p>
                  )}
                </div>
                <Button variant="outline" onClick={reset} className="w-full">
                  {t('attendance.kiosk.done')}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-8 space-y-2 text-center">
                  <h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{t('attendance.kiosk.title')}</h1>
                  <p className="text-sm leading-6 text-slate-600">
                    {t('attendance.kiosk.intro')}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="identification-number" className="text-sm font-medium text-slate-700">
                      {t('attendance.kiosk.idLabel')}
                    </label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="identification-number"
                        ref={inputRef}
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        placeholder={t('attendance.kiosk.idPlaceholder')}
                        value={identificationNumber}
                        onChange={(event) => setIdentificationNumber(event.target.value)}
                        maxLength={30}
                        required
                        disabled={loading || !gymName}
                        className="border-slate-200 pl-10 text-lg focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !gymName}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-base font-semibold transition-all hover:from-amber-600 hover:to-amber-700"
                  >
                    {loading ? t('attendance.kiosk.registering') : t('attendance.kiosk.submit')}
                  </Button>
                </form>
              </>
            )}
          </div>
        </Card>

        {(!online || pending > 0) && (
          <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {!online && t('attendance.kiosk.offlineBanner')}
              {pending > 0 && <span className="font-semibold">{!online && ' '}{t('attendance.kiosk.pending', { count: pending })}</span>}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
