'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRoleRedirect, login } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/PasswordInput';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock, Zap, CheckCircle2 } from 'lucide-react';
import Flame from '@/components/Flame';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT } from '@/components/I18nProvider';

// Bandera de entorno: muestra u oculta el registro público.
// Definir en .env.local -> NEXT_PUBLIC_ENABLE_REGISTRATION=true
const REGISTRATION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === 'true';

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await login(email, password);
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : getRoleRedirect(session);
      router.replace(destination);
    } catch (e: any) {
      setError(e instanceof ApiError && e.status === 401 ? t('login.invalidCredentials') : e.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: CheckCircle2, title: t('login.feature1Title'), desc: t('login.feature1Desc') },
    { icon: CheckCircle2, title: t('login.feature2Title'), desc: t('login.feature2Desc') },
    { icon: CheckCircle2, title: t('login.feature3Title'), desc: t('login.feature3Desc') },
  ];

  return (
    <div className="theme-static grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left - Branding & Features */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-12 sm:px-12 lg:px-16">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <Flame size={11} color="#fff" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Fragua<span className="text-amber-400">Go</span>
              </h1>
              <p className="text-xs text-slate-400">v0.1.0</p>
            </div>
          </div>

          {/* Main heading */}
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              {t('login.tagline1')}<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{t('login.tagline2')}</span>
            </h2>
            <p className="max-w-md text-slate-300">
              {t('login.intro')}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
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
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <Zap className="h-4 w-4 text-amber-400" />
          <span>{t('login.footerBadges')}</span>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-end">
            <LanguageSwitcher />
          </div>
          {/* Card */}
          <Card className="border-0 shadow-xl">
            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className="mb-8 space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">{t('login.welcome')}</h2>
                <p className="text-sm text-slate-600">
                  {t('login.subtitle')}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={submit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    {t('common.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@gimnasio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    {t('common.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div className="text-right">
                    <Link href="/forgot-password" className="text-xs font-medium text-amber-600 hover:underline">
                      {t('login.forgot')}
                    </Link>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-base font-semibold hover:from-amber-600 hover:to-amber-700 transition-all"
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
                className="w-full border-slate-200 hover:bg-slate-50"
                disabled={loading}
                onClick={() => {
                  // Cuenta del gym ficticio "Gym Demo" (fraguago-api: npm run seed:demo).
                  setEmail('demo@fraguago.com');
                  setPassword('demo123');
                }}
              >
                {t('login.demo')}
              </Button>

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
