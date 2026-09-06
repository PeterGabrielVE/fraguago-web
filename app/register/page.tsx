'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail, Lock, User, Building2, Zap, CheckCircle2, ArrowLeft } from 'lucide-react';
import Flame from '@/components/Flame';

export default function RegisterGymPage() {
  const router = useRouter();
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validaciones básicas del lado del cliente
    if (ownerPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (ownerPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register-gym`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymName, ownerName, ownerEmail, ownerPassword }),
      });

      if (!res.ok) {
        let msg = 'No se pudo registrar el gimnasio';
        try {
          const data = await res.json();
          msg = data.message || data.error || msg;
        } catch {
          /* respuesta sin cuerpo JSON */
        }
        throw new Error(msg);
      }

      // Registro correcto: iniciamos sesión con las credenciales del propietario
      // reutilizando el mismo flujo de auth que el login.
      try {
        await login(ownerEmail, ownerPassword);
        router.replace('/dashboard');
      } catch {
        // Si el auto-login falla, mandamos al login manual.
        router.replace('/login');
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo registrar el gimnasio');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: CheckCircle2, title: 'Configura tu gimnasio', desc: 'Crea tu espacio en minutos' },
    { icon: CheckCircle2, title: 'Invita a tu equipo', desc: 'Roles y permisos por sucursal' },
    { icon: CheckCircle2, title: 'Empieza a cobrar', desc: 'Membresías y pagos desde el día uno' },
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
              Crea tu gimnasio<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">en minutos.</span>
            </h2>
            <p className="max-w-md text-slate-300">
              Registra tu gimnasio y empieza a gestionar socios, pagos, asistencia e inventario desde un solo lugar.
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

      {/* Right - Register Form */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Card */}
          <Card className="border-0 shadow-xl">
            <div className="p-8 sm:p-10">
              {/* Header */}
              <div className="mb-8 space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">Crea tu cuenta</h2>
                <p className="text-sm text-slate-600">
                  Registra tu gimnasio y su administrador
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
                {/* Gym Name Field */}
                <div className="space-y-2">
                  <label htmlFor="gymName" className="text-sm font-medium text-slate-700">
                    Nombre del gimnasio
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="gymName"
                      type="text"
                      placeholder="Fraguago Fitness"
                      value={gymName}
                      onChange={(e) => setGymName(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Owner Name Field */}
                <div className="space-y-2">
                  <label htmlFor="ownerName" className="text-sm font-medium text-slate-700">
                    Nombre del propietario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ownerName"
                      type="text"
                      placeholder="Gabo Leal"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Owner Email Field */}
                <div className="space-y-2">
                  <label htmlFor="ownerEmail" className="text-sm font-medium text-slate-700">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="admin@fraguago.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="ownerPassword" className="text-sm font-medium text-slate-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ownerPassword"
                      type="password"
                      placeholder="••••••••"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={loading}
                      className="pl-10 border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Mínimo 8 caracteres</p>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
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
                      Creando gimnasio...
                    </div>
                  ) : (
                    'Crear gimnasio'
                  )}
                </Button>
              </form>

              {/* Footer Text */}
              <p className="mt-6 text-center text-xs text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-amber-600 font-medium hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </Card>

          {/* Back to login */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver al inicio de sesión
            </Link>
          </div>

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
