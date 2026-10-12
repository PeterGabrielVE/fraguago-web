'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRoleRedirect, isRoleSelection, login, selectRole, type RoleSelection } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { APP_VERSION } from '@/lib/version';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/PasswordInput';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock, Zap, CheckCircle2, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { ROLE_META, isRoleKey } from '@/lib/roles';
import Flame from '@/components/Flame';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT } from '@/components/I18nProvider';

// Bandera de entorno: muestra u oculta el registro público.
// Definir en .env.local -> NEXT_PUBLIC_ENABLE_REGISTRATION=true
const REGISTRATION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === 'true';

// Campos: en móvil solo una línea inferior (sin caja), en escritorio la caja habitual.
// text-base (16px) en móvil: con menos, iOS hace zoom al enfocar.
const fieldClass =
  'h-12 pl-7 text-base border-slate-200 focus:border-amber-500 focus:ring-amber-500 lg:h-10 lg:pl-10 lg:text-sm ' +
  'max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-slate-300 max-lg:bg-transparent max-lg:shadow-none ' +
  'max-lg:focus-visible:border-amber-500 max-lg:focus-visible:ring-0';

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Cuenta con varios roles: tras validar la contraseña se elige con cuál entrar.
  const [selection, setSelection] = useState<RoleSelection | null>(null);
  const [choosingRole, setChoosingRole] = useState<string | null>(null);
  // Motivo del cierre de sesión anterior (inactividad o expiración).
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'idle') setNotice(t('session.idleLoggedOut'));
    else if (reason === 'expired') setNotice(t('session.expired'));
  }, [t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await login(email, password);
      if (isRoleSelection(session)) {
        setSelection(session);
        return;
      }
      goToApp(session);
    } catch (e: any) {
      setError(e instanceof ApiError && e.status === 401 ? t('login.invalidCredentials') : e.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  function goToApp(session: Parameters<typeof getRoleRedirect>[0]) {
    const requestedPath = new URLSearchParams(window.location.search).get('next');
    const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
      ? requestedPath
      : getRoleRedirect(session);
    router.replace(destination);
  }

  async function chooseRole(role: string) {
    if (!selection || choosingRole) return;
    setChoosingRole(role);
    setError('');
    try {
      goToApp(await selectRole(selection.selectionToken, role));
    } catch (e: any) {
      // Token de selección vencido (5 min): se vuelve a pedir la contraseña.
      if (e instanceof ApiError && e.status === 401) {
        backToCredentials();
        setError(t('login.roleSelectionExpired'));
      } else {
        setError(e.message || t('login.failed'));
      }
      setChoosingRole(null);
    }
  }

  function backToCredentials() {
    setSelection(null);
    setChoosingRole(null);
    setPassword('');
  }

  const features = [
    { icon: CheckCircle2, title: t('login.feature1Title'), desc: t('login.feature1Desc') },
    { icon: CheckCircle2, title: t('login.feature2Title'), desc: t('login.feature2Desc') },
    { icon: CheckCircle2, title: t('login.feature3Title'), desc: t('login.feature3Desc') },
  ];

  return (
    // En móvil: cabecera con formas orgánicas y el saludo, una ola que da paso
    // al formulario en blanco, todo sin desplazarse. El panel completo (lema y
    // ventajas) y la tarjeta son para escritorio.
    <div className="theme-static grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] bg-white lg:grid-cols-2 lg:grid-rows-1 lg:bg-slate-900">
      {/* Left - Branding & Features */}
      <div className="relative flex min-h-[38dvh] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-12 lg:min-h-0 lg:px-16 lg:py-12">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        {/* Solo móvil: manchas orgánicas en los tonos de la marca y la ola inferior. */}
        <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden="true">
          <div className="absolute -right-16 -top-10 h-64 w-72 rounded-[42%_58%_36%_64%/55%_38%_62%_45%] bg-slate-950/45" />
          <div className="absolute -left-20 bottom-4 h-48 w-64 rounded-[61%_39%_52%_48%/44%_58%_42%_56%] bg-slate-950/35" />
          <div className="absolute right-8 top-16 h-20 w-24 rounded-[58%_42%_47%_53%/46%_57%_43%_54%] bg-amber-500/25" />
          <div className="absolute right-28 top-6 h-5 w-6 rounded-[55%_45%_60%_40%/50%_60%_40%_50%] bg-amber-400/40" />
          <div className="absolute bottom-20 left-10 h-12 w-16 rounded-[45%_55%_40%_60%/60%_45%_55%_40%] bg-amber-500/20" />
          <div className="absolute bottom-28 right-12 h-7 w-8 rounded-[60%_40%_55%_45%/45%_55%_45%_55%] bg-amber-400/30" />
          <svg viewBox="0 0 390 64" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-14 w-full">
            <path fill="#fff" d="M0 34 C 55 4, 115 2, 190 24 S 320 62, 390 22 V64 H0 Z" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-3 lg:mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg lg:h-12 lg:w-12">
              <Flame size={11} color="#fff" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white lg:text-2xl">
                Fragua<span className="text-amber-400">Go</span>
              </h1>
              <p className="hidden text-xs text-slate-400 lg:block">v{APP_VERSION}</p>
            </div>
            <LanguageSwitcher tone="onDark" className="ml-auto lg:hidden" />
          </div>

          {/* Main heading */}
          <div className="hidden space-y-4 lg:block">
            <h2 className="text-5xl font-bold leading-tight text-white">
              {t('login.tagline1')}<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{t('login.tagline2')}</span>
            </h2>
            <p className="max-w-md text-slate-300">
              {t('login.intro')}
            </p>
          </div>

          {/* Saludo (móvil): en escritorio va dentro de la tarjeta. */}
          <div className="mt-10 space-y-2 lg:hidden">
            <h2 className="text-4xl font-bold leading-tight text-white">{t('login.welcome')}</h2>
            <p className="text-sm text-slate-300">{t('login.subtitle')}</p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 hidden space-y-4 lg:block">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="flex gap-3 rounded-lg bg-white/5 p-3 backdrop-blur-sm transition-all hover:bg-white/10"
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-white text-sm">{feature.title}</p>
                  <p className="text-xs text-slate-400">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="relative z-10 hidden items-center gap-2 text-xs text-slate-400 lg:flex">
          <Zap className="h-4 w-4 text-amber-400" />
          <span>{t('login.footerBadges')}</span>
        </div>
      </div>

      {/* Right - Login Form. En móvil va directo sobre blanco, sin tarjeta. */}
      <div className="flex items-start justify-center bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:items-center lg:bg-slate-50 lg:px-8 lg:py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="hidden justify-end lg:flex">
            <LanguageSwitcher />
          </div>
          {/* Card */}
          <Card className="border-0 shadow-xl max-lg:rounded-none max-lg:bg-transparent max-lg:py-0 max-lg:shadow-none max-lg:ring-0">
            <div className="lg:p-10">
              {/* Header */}
              <div className="mb-8 hidden space-y-2 lg:block">
                <h2 className="text-2xl font-bold sm:text-3xl text-slate-900">{t('login.welcome')}</h2>
                <p className="text-sm text-slate-600">
                  {t('login.subtitle')}
                </p>
              </div>

              {notice && !error && (
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {notice}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {selection ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{t('login.chooseRole')}</p>
                    <p className="text-xs text-slate-600">{t('login.chooseRoleHint')}</p>
                  </div>
                  <ul className="space-y-2">
                    {selection.roles.filter(isRoleKey).map((role) => {
                      const { icon: RoleIcon, name, hint } = ROLE_META[role];
                      const busy = choosingRole === role;
                      return (
                        <li key={role}>
                          <button
                            type="button"
                            onClick={() => chooseRole(role)}
                            disabled={Boolean(choosingRole)}
                            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-60"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                              <RoleIcon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900">{t(name)}</span>
                              <span className="block text-xs text-slate-500">{t(hint)}</span>
                            </span>
                            {busy
                              ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                              : <ChevronRight className="h-4 w-4 text-slate-400" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={backToCredentials}
                    disabled={Boolean(choosingRole)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:underline disabled:opacity-60"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('login.otherAccount')}
                  </button>
                </div>
              ) : (
              <>
              {/* Form */}
              <form onSubmit={submit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    {t('common.email')}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-0 top-1/2 z-10 lg:left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="admin@gimnasio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    {t('common.password')}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-0 top-1/2 z-10 lg:left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className={fieldClass}
                    />
                  </div>
                  <div className="text-right">
                    <Link href="/forgot-password" className="inline-block py-2 text-sm font-medium text-amber-600 hover:underline lg:py-0 lg:text-xs">
                      {t('login.forgot')}
                    </Link>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-base font-semibold hover:from-amber-600 hover:to-amber-700 transition-all lg:mt-6 lg:h-10"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t('login.submitting')}
                    </div>
                  ) : (
                    t('login.submit')
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-500">{t('login.orContinue')}</span>
                </div>
              </div>

              {/* Demo Button */}
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl border-slate-300 hover:bg-slate-50 lg:h-10"
                disabled={loading}
                onClick={() => {
                  // Cuenta del gym ficticio "Gym Demo" (fraguago-api: npm run seed:demo).
                  setEmail('demo@fraguago.com');
                  setPassword('demo123');
                }}
              >
                {t('login.demo')}
              </Button>
              </>
              )}

              {/* Footer Text */}
              {REGISTRATION_ENABLED ? (
                <p className="mt-6 text-center text-sm text-slate-600">
                  {t('login.noAccount')}{' '}
                  <Link href="/register" className="font-medium text-amber-600 hover:underline">
                    {t('login.registerGym')}
                  </Link>
                </p>
              ) : (
                <p className="mt-6 text-center text-xs text-slate-500">
                  {t('login.firstTime')}{' '}
                  <span className="text-amber-600 font-medium">
                    {t('login.contactAdmin')}
                  </span>
                </p>
              )}
            </div>
          </Card>

          {/* Bottom Info */}
          <div className="space-y-2 text-center text-xs text-slate-500">
            <p>{t('login.copyright')}</p>
            <p>
              <span className="font-medium text-slate-600">{t('login.saas')}</span> •{' '}
              <span>{t('login.openSource')}</span>
            </p>
          </div>
        </div>
      </div>
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-2xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
            {t('login.verifying')}
          </div>
        </div>
      )}
    </div>
  );
}
