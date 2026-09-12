import Flame from '@/components/Flame';
import { Spinner } from '@/components/ui/spinner';

export default function LoginLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
          <Flame size={14} color="#fff" />
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-slate-900">
            Fragua<span className="text-amber-500">Go</span>
          </p>
          <p className="text-sm text-slate-500">Preparando tu acceso...</p>
        </div>
        <Spinner className="size-5 text-amber-500" aria-label="Cargando inicio de sesión" />
      </div>
    </main>
  );
}
