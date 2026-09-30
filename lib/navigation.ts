import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  Stethoscope,
  Phone,
  CreditCard,
  BarChart3,
  DollarSign,
  Tag,
  Box,
  Wrench,
  User,
  Calendar,
  Zap,
  Coins,
  Dumbbell,
  ShoppingCart,
  Activity,
  ShieldCheck,
  Settings,
  ScrollText,
  Gift,
  Ticket,
  Award,
  Crown,
  Trophy,
  MessageSquareText,
  UserX,
  Inbox,
  Share2,
  Upload,
  ListChecks,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Sinónimos para el buscador global (cómo lo diría el usuario, no cómo se llama la pantalla). */
  keywords?: string[];
};

export type NavGroup = { group: string; items: NavItem[] };

// Menú del panel: lo usan la barra lateral y el buscador global.
export const NAV: NavGroup[] = [
  {
    group: 'General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['inicio', 'resumen', 'panel', 'indicadores', 'kpi'] },
      { href: '/members', label: 'Socios', icon: Users, keywords: ['clientes', 'miembros', 'afiliados', 'alumnos'] },
      { href: '/attendance', label: 'Asistencia', icon: Clock, keywords: ['entrada', 'check-in', 'checkin', 'aforo', 'ingreso', 'salida'] },
    ],
  },
  {
    group: 'Datos Médicos',
    items: [
      { href: '/health', label: 'Salud', icon: Stethoscope, keywords: ['ficha medica', 'lesiones', 'alergias', 'condiciones'] },
      { href: '/progress', label: 'Progreso', icon: Activity, keywords: ['medidas', 'peso', 'mediciones', 'evolucion'] },
      { href: '/emergency-contacts', label: 'Emergencia', icon: Phone, keywords: ['contacto de emergencia', 'familiar'] },
    ],
  },
  {
    group: 'Membresías',
    items: [
      { href: '/memberships', label: 'Membresías', icon: CreditCard, keywords: ['suscripciones', 'vencimientos', 'renovar'] },
      { href: '/membership-plans', label: 'Planes', icon: Tag, keywords: ['tarifas', 'precios', 'mensualidad', 'anualidad'] },
      { href: '/training-goals', label: 'Objetivos', icon: Zap, keywords: ['metas', 'entrenamiento'] },
    ],
  },
  {
    group: 'Pagos',
    items: [
      { href: '/payment-records', label: 'Pagos', icon: DollarSign, keywords: ['cobros', 'recibos', 'facturas', 'abonos'] },
      { href: '/finances', label: 'Finanzas', icon: BarChart3, keywords: ['ingresos', 'egresos', 'gastos', 'balance', 'contabilidad'] },
      { href: '/exchange-rates', label: 'Tasas de cambio', icon: Coins, keywords: ['dolar', 'bcv', 'divisas', 'bolivares', 'euro'] },
    ],
  },
  {
    group: 'Operación',
    items: [
      { href: '/sales', label: 'Ventas', icon: ShoppingCart, keywords: ['punto de venta', 'pos', 'caja', 'vender'] },
      { href: '/concepts', label: 'Conceptos', icon: Tag, keywords: ['categorias', 'clasificacion'] },
      { href: '/products', label: 'Productos', icon: Box, keywords: ['inventario', 'stock', 'suplementos', 'sku'] },
      { href: '/services', label: 'Servicios', icon: Wrench, keywords: ['clases', 'extras'] },
    ],
  },
  {
    group: 'Comunidad',
    items: [
      { href: '/challenges', label: 'Retos', icon: Trophy, keywords: ['desafios', 'competencias', 'ranking'] },
    ],
  },
  {
    group: 'Retención',
    items: [
      { href: '/automations', label: 'Mensajes automáticos', icon: MessageSquareText, keywords: ['whatsapp', 'recordatorios', 'notificaciones'] },
      { href: '/inactive-members', label: 'Socios inactivos', icon: UserX, keywords: ['abandono', 'churn', 'ausentes'] },
      { href: '/message-logs', label: 'Envíos', icon: Inbox, keywords: ['historial de mensajes'] },
      { href: '/referrals', label: 'Referidos', icon: Share2, keywords: ['recomendaciones', 'invitaciones'] },
    ],
  },
  {
    group: 'Gamificación',
    items: [
      { href: '/rewards', label: 'Recompensas', icon: Gift, keywords: ['premios', 'puntos'] },
      { href: '/redemptions', label: 'Canjes', icon: Ticket, keywords: ['redimir', 'puntos'] },
      { href: '/badges', label: 'Insignias', icon: Award, keywords: ['logros', 'medallas'] },
      { href: '/tiers', label: 'Niveles', icon: Crown, keywords: ['rangos', 'categorias'] },
    ],
  },
  {
    group: 'Equipo',
    items: [
      { href: '/trainers', label: 'Entrenadores', icon: User, keywords: ['coach', 'instructores', 'profesores'] },
      { href: '/routines', label: 'Rutinas', icon: Dumbbell, keywords: ['plan de entrenamiento', 'workout'] },
      { href: '/exercises', label: 'Ejercicios', icon: ListChecks, keywords: ['musculos', 'maquinas'] },
      { href: '/schedules', label: 'Horarios', icon: Calendar, keywords: ['turnos', 'agenda', 'clases'] },
    ],
  },
  {
    group: 'Administración',
    items: [
      { href: '/users', label: 'Usuarios', icon: ShieldCheck, keywords: ['permisos', 'roles', 'staff', 'cuentas'] },
      { href: '/import', label: 'Importar datos', icon: Upload, keywords: ['excel', 'csv', 'migrar', 'carga masiva'] },
      { href: '/settings', label: 'Configuración', icon: Settings, keywords: ['ajustes', 'gimnasio', 'preferencias', 'capacidad'] },
      { href: '/audit-logs', label: 'Auditoría', icon: ScrollText, keywords: ['bitacora', 'historial', 'registros', 'logs'] },
    ],
  },
];
