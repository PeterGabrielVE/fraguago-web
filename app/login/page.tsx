'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import Flame from '@/components/Flame';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message || 'No se pudo iniciar sesión');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ background: 'var(--iron)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--amber)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 8, left: 16 }}><Flame size={12} /></span>
          </span>
          <span style={{ fontSize: 26, fontWeight: 700 }}>Fragua<span style={{ color: 'var(--amber)' }}>Go</span></span>
        </div>
        <h1 style={{ fontSize: 30, lineHeight: 1.2 }}>El sistema que forja<br />tu gimnasio.</h1>
        <p style={{ color: '#9aa5b1', marginTop: 14, maxWidth: 360 }}>
          Socios, pagos, asistencia e inventario en un solo lugar.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form onSubmit={submit} style={{ width: 320 }}>
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>Inicia sesión</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Entra a tu panel de gimnasio.</p>
          {error && <div className="error">{error}</div>}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Correo</label>
            <input className="input" type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} placeholder="tu@gimnasio.com" />
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Contraseña</label>
            <input className="input" type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-amber" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
