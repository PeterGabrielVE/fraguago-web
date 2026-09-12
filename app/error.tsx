'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { reportError } from '@/lib/errorReporter';
import Flame from '@/components/Flame';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({ type: 'nextjs', error, digest: error.digest });
  }, [error]);

  return (
    <main
      role="alert"
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#b9e3fa] px-4 py-8 text-[#11102f] sm:px-8"
    >
      <div className="absolute -left-32 top-24 -z-10 h-80 w-80 rounded-full bg-[#9bd5f5]/70 sm:-left-20 sm:h-112 sm:w-md" />
      <div className="absolute -bottom-36 -right-32 -z-10 h-96 w-96 rounded-full bg-[#a6daf6]/80" />

      <section className="relative flex min-h-[min(820px,calc(100vh-4rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-[#f4fbff] shadow-[0_24px_70px_rgba(35,111,157,0.16)] sm:min-h-155 lg:flex-row">
        <div className="flex flex-1 flex-col px-7 pb-12 pt-8 sm:px-14 sm:pb-16 sm:pt-10 lg:px-20 lg:pb-20 lg:pt-12">
          <Link href="/dashboard" className="inline-flex w-fit items-center gap-2 text-xl font-bold tracking-tight text-[#171639]">
            <span className="flex h-9 w-7 items-center justify-center rounded-full bg-[#1aa9d1]">
              <Flame size={13} color="#fff" />
            </span>
            FraguaGo
          </Link>

          <div className="my-auto max-w-md pt-16 lg:pt-20">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.28em] text-[#ff6a57]">Error inesperado</p>
            <h1 className="text-5xl font-black tracking-tighter text-[#11102f] sm:text-7xl">Oooops!</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#515775] sm:text-lg">
              No pudimos cargar esta sección. Vuelve al inicio del dashboard o inténtalo de nuevo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#5424ad] px-6 font-bold text-white shadow-lg shadow-[#5424ad]/20 transition-colors hover:bg-[#431a94]">
                <ArrowLeft className="h-4 w-4" />
                Volver al dashboard
              </Link>
              <Button type="button" variant="ghost" onClick={reset} className="h-12 rounded-xl px-4 font-semibold text-[#5424ad] hover:bg-[#5424ad]/10 hover:text-[#431a94]">
                <RotateCcw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-80 flex-1 items-center justify-center overflow-hidden bg-[#dff4ff] px-8 py-12 sm:min-h-104 lg:min-h-0">
          <div className="absolute h-76 w-76 rounded-full border border-[#6dc5ed]/70 bg-[#a8def7] sm:h-100 sm:w-100" />
          <div className="absolute h-56 w-56 rounded-full border border-[#6dc5ed]/60 sm:h-76 sm:w-76" />
          <div className="relative w-full max-w-sm">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-2xl bg-[#7443e4] px-8 py-3 text-4xl font-black tracking-[0.25em] text-white shadow-xl shadow-[#5424ad]/20 sm:text-5xl">
              404
            </div>
            <div className="mx-auto mt-12 w-[min(100%,20rem)] rounded-2xl border-4 border-[#5424ad] bg-[#f7fcff] p-4 shadow-[12px_16px_0_#5424ad]">
              <div className="flex items-center justify-between border-b border-[#d4e7f1] pb-3">
                <span className="h-2 w-16 rounded-full bg-[#ff6a57]" />
                <span className="flex gap-1"><i className="h-2 w-2 rounded-full bg-[#ffb52e]" /><i className="h-2 w-2 rounded-full bg-[#42c49a]" /></span>
              </div>
              <div className="flex h-36 items-center justify-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#ffcd2f]">
                  <Flame size={42} color="#5424ad" />
                  <span className="absolute -right-4 top-3 h-4 w-4 rounded-full bg-[#ff6a57]" />
                  <span className="absolute -left-3 bottom-5 h-3 w-3 rounded-full bg-[#1aa9d1]" />
                </div>
              </div>
              <div className="mx-auto h-2 w-28 rounded-full bg-[#c5dce9]" />
            </div>
            <div className="absolute -bottom-8 -right-2 rounded-xl bg-[#5424ad] px-5 py-3 text-2xl font-bold tracking-[0.2em] text-white shadow-lg sm:-right-8">
              ...
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}