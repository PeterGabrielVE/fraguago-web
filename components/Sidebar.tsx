'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Flame from './Flame';
import { logout } from '@/lib/auth';

const NAV = [
  { group: 'General', items: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/members', label: 'Socios' },
    { href: '/attendance', label: 'Asistencia' },
  ]},
  { group: 'Datos Médicos', items: [
    { href: '/health', label: 'Salud' },
    { href: '/medications', label: 'Medicamentos' },
    { href: '/emergency-contacts', label: 'Emergencia' },
  ]},
  { group: 'Membresías', items: [
    { href: '/memberships', label: 'Membresías' },
    { href: '/membership-plans', label: 'Planes' },
    { href: '/training-goals', label: 'Objetivos' },
  ]},
  { group: 'Pagos', items: [
    { href: '/payment-records', label: 'Pagos' },
    { href: '/finances', label: 'Finanzas' },
  ]},
  { group: 'Operación', items: [
    { href: '/concepts', label: 'Conceptos' },
    { href: '/products', label: 'Productos' },
    { href: '/services', label: 'Servicios' },
  ]},
  { group: 'Equipo', items: [
    { href: '/trainers', label: 'Entrenadores' },
    { href: '/schedules', label: 'Horarios' },
  ]},
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark"><Flame size={10} color="#fff" /></span>
        <span className="name">Fragua<span>Go</span></span>
      </div>
      <nav className="nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="group">{g.group}</div>
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} className={path.startsWith(it.href) ? 'active' : ''}>
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="foot">
        <button className="btn btn-sm" style={{ width: '100%' }} onClick={logout}>Cerrar</button>
      </div>
    </aside>
  );
}
