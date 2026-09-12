import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Flame from '@/components/Flame';

export default function ForbiddenPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-amber-100/70 sm:-left-20 sm:h-112 sm:w-md" />
      <div className="absolute -bottom-36 -right-32 h-96 w-96 rounded-full bg-orange-100/80" />

      <section className="relative w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
        <div className="grid items-center lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-7 py-12 sm:px-14 sm:py-16 lg:px-20">
            <Link href="/dashboard" className="mb-16 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <span className="flex h-9 w-7 items-center justify-center rounded-full bg-amber-500">
                <Flame size={13} color="#fff" />
              </span>
              FraguaGo
            </Link>

            <p className="mb-5 text-sm font-bold uppercase tracking-[0.28em] text-orange-500">Permiso insuficiente</p>
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 sm:text-8xl">403</h1>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">No puedes acceder aquí</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
              Tu cuenta está activa, pero no tiene permisos suficientes para ver este contenido. Regresa al dashboard o contacta al administrador.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-600">
                <ArrowLeft className="h-4 w-4" />
                Volver al dashboard
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-xl px-4 font-semibold text-slate-700 transition-colors hover:bg-amber-50 hover:text-amber-700">
                <ShieldAlert className="h-4 w-4" />
                Cambiar de cuenta
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-14 sm:min-h-96">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="absolute h-64 w-64 rounded-full border border-amber-400/20 bg-slate-800/70 sm:h-80 sm:w-80" />
            <div className="absolute h-48 w-48 rounded-full border border-amber-400/20 sm:h-60 sm:w-60" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border-4 border-amber-500 bg-slate-900 shadow-[10px_12px_0_#f59e0b] sm:h-40 sm:w-40">
              <ShieldAlert className="h-16 w-16 text-amber-400 sm:h-20 sm:w-20" strokeWidth={1.7} />
              <span className="absolute -right-6 -top-5 rounded-xl bg-amber-500 px-4 py-2 text-xl font-black tracking-[0.16em] text-slate-950">403</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
