'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, IdCard } from 'lucide-react';
import Flame from '@/components/Flame';
import { api } from '@/lib/api';
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
};

// Pantalla pública de asistencia: pensada para una tablet en la recepción.
// No requiere sesión; el gym sale de la URL (/check-in/<gymId>).
export default function PublicCheckInPage() {
  const { t, intlLocale } = useI18n();
  const timeFormat = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' });
  const { gymId } = useParams<{ gymId: string }>();
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

  useEffect(() => {
    api.get(`/public/attendance/${gymId}`)
      .then((gym: { name: string }) => setGymName(gym.name))
      .catch(() => setGymError(t('attendance.kiosk.invalidLink')));
  }, [gymId]);

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

    try {
      const data = await api.post(`/public/attendance/${gymId}/check-in`, {
        identificationNumber: identificationNumber.trim(),
      }) as CheckInResult;
      setResult(data);
    } catch (requestError) {
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
          <div className="p-8 sm:p-10">
            {gymError ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{gymError}</AlertDescription>
              </Alert>
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
                  <h1 className="text-3xl font-bold text-slate-900">{t('attendance.kiosk.title')}</h1>
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
      </div>
    </main>
  );
}
