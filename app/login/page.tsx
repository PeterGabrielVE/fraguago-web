'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock, Zap, CheckCircle2 } from 'lucide-react';
import Flame from '@/components/Flame';

export default function LoginPage() {
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
      await login(email, password);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: CheckCircle2, title: 'Gestión de Socios', desc: 'Datos médicos, objetivos y membresías' },
    { icon: CheckCircle2, title: 'Control de Asistencia', desc: 'Check-in rápido y reportes' },
    { icon: CheckCircle2, title: 'Finanzas Completas', desc: 'Ingresos, egresos y balance' },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
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
              El sistema que<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">forja tu gimnasio.</span>
            </h2>
            <p className="max-w-md text-slate-300">
              La plataforma SaaS completa para gestionar socios, pagos, asistencia e inventario en un solo lugar.
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
          <span>Listo para producción • Multi-tenant • Open Source</span>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Card */}
          <Card className="border-0 shadow-xl">
            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className="mb-8 space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">Bienvenido</h2>
                <p className="text-sm text-slate-600">
                  Entra a tu panel de gimnasio
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
                    Correo electrónico
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
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
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
                      Entrando...
                    </div>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-500">O continúa con</span>
                </div>
              </div>

              {/* Demo Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  setEmail('admin@fraguago.com');
                  setPassword('demo123');
                }}
              >
                Usar credenciales de demo
              </Button>

              {/* Footer Text */}
              <p className="mt-6 text-center text-xs text-slate-500">
                ¿Primera vez?{' '}
                <span className="text-amber-600 font-medium">
                  Contacta al administrador
                </span>
              </p>
            </div>
          </Card>

          {/* Bottom Info */}
          <div className="space-y-2 text-center text-xs text-slate-500">
            <p>FraguaGo © 2026 — Gestión profesional de gimnasios</p>
            <p>
              <span className="font-medium text-slate-600">SaaS Multi-tenant</span> •{' '}
              <span>Código abierto</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}