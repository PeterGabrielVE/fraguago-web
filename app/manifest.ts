import type { MetadataRoute } from 'next';

// Manifiesto de la PWA (Next lo sirve en /manifest.webmanifest y lo enlaza solo).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FraguaGo',
    short_name: 'FraguaGo',
    description: 'Gestión de gimnasios: socios, asistencia, membresías y rutinas.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#14161f',
    theme_color: '#ff9500',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
