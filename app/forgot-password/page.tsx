'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import Flame from '@/components/Flame';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-8 flex items-center justify-center gap-3 text-2xl font-bold text-slate-900">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <Flame size={11} color="#fff" />
          </span>
          Fragua<span className="text-amber-500">Go</span>
        </Link>

        <Card className="border-0 shadow-xl">
          <div className="p-8 sm:p-10">
            {submitted ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-slate-900">Revisa tu correo</h1>
                  <p className="text-sm leading-6 text-slate-600">
                    Si existe una cuenta asociada a <strong>{email}</strong>, recibirás instrucciones para restablecer tu contraseña.
                  </p>
                </div>
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8 space-y-2">
                  <h1 className="text-3xl font-bold text-slate-900">Recuperar contraseña</h1>
                  <p className="text-sm leading-6 text-slate-600">
                    Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
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
                    <label htmlFor="recovery-email" className="text-sm font-medium text-slate-700">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="recovery-email"
                        type="email"
                        placeholder="admin@gimnasio.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={loading}
                        className="border-slate-200 pl-10 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-base font-semibold transition-all hover:from-amber-600 hover:to-amber-700"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </Button>
                </form>

                <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-amber-600">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
