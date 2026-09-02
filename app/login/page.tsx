'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Left side - Branding */}
      <div className="flex flex-col justify-center bg-slate-900 px-14 text-white">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500">
            <Flame size={10} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold">
            Fragua<span className="text-amber-500">Go</span>
          </h1>
        </div>

        <h2 className="text-4xl font-bold leading-tight">
          El sistema que forja<br />tu gimnasio.
        </h2>

        <p className="mt-4 max-w-sm text-slate-400">
          Socios, pagos, asistencia e inventario en un solo lugar. Todo lo que necesitas para gestionar tu gimnasio profesionalmente.
        </p>

        {/* Features list */}
        <div className="mt-12 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-sm font-bold text-slate-900">✓</div>
            <div>
              <p className="font-semibold">Gestión de Socios</p>
              <p className="text-sm text-slate-400">Datos médicos, objetivos y membresías</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-sm font-bold text-slate-900">✓</div>
            <div>
              <p className="font-semibold">Control de Asistencia</p>
              <p className="text-sm text-slate-400">Check-in rápido y reportes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-sm font-bold text-slate-900">✓</div>
            <div>
              <p className="font-semibold">Finanzas Completas</p>
              <p className="text-sm text-slate-400">Ingresos, egresos y balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Inicia sesión</CardTitle>
              <CardDescription>
                Entra a tu panel de gimnasio
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Correo electrónico
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@gimnasio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  ¿Primera vez? Contacta al administrador para registrarte.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            FraguaGo v0.1.0 — Gestión profesional de gimnasios
          </p>
        </div>
      </div>
    </div>
  );
}