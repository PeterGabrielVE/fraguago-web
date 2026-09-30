'use client';
import { useEffect, useMemo, useState } from 'react';
import { NAV } from '@/lib/navigation';
import { loadCatalogs, rankResults, searchMembers, type SearchResult } from '@/lib/search';

// Atajos a las tareas más frecuentes del día a día (ver manual: acciones rápidas del dashboard).
export const QUICK_ACTIONS: SearchResult[] = [
  { id: 'action:new-member', kind: 'action', title: 'Registrar socio', href: '/members?new=1', keywords: ['nuevo socio', 'crear socio', 'inscribir', 'alta'] },
  { id: 'action:check-in', kind: 'action', title: 'Registrar entrada', href: '/attendance', keywords: ['check-in', 'asistencia', 'marcar entrada'] },
  { id: 'action:new-sale', kind: 'action', title: 'Nueva venta', href: '/sales', keywords: ['vender', 'cobrar producto', 'punto de venta'] },
  { id: 'action:new-payment', kind: 'action', title: 'Registrar pago', href: '/payment-records?new=1', keywords: ['cobrar', 'abono', 'nuevo pago'] },
  { id: 'action:new-product', kind: 'action', title: 'Nuevo producto', href: '/products?new=1', keywords: ['crear producto', 'inventario'] },
];

const PAGES: SearchResult[] = NAV.flatMap(({ group, items }) =>
  items.map((item) => ({
    id: `page:${item.href}`,
    kind: 'page' as const,
    title: item.label,
    subtitle: group,
    href: item.href,
    keywords: item.keywords,
  })),
);

const MEMBER_DEBOUNCE_MS = 250;
const PER_GROUP = 5;

export type GlobalSearchState = {
  actions: SearchResult[];
  pages: SearchResult[];
  members: SearchResult[];
  records: SearchResult[];
  loadingMembers: boolean;
  loadingCatalogs: boolean;
  memberError: boolean;
};

export function useGlobalSearch(query: string, enabled: boolean): GlobalSearchState {
  const [catalog, setCatalog] = useState<SearchResult[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [members, setMembers] = useState<SearchResult[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState(false);
  const trimmed = query.trim();

  // Catálogos: se piden la primera vez que se abre el buscador (y quedan en caché unos minutos).
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoadingCatalogs(true);
    loadCatalogs()
      .then((rows) => { if (alive) setCatalog(rows); })
      .finally(() => { if (alive) setLoadingCatalogs(false); });
    return () => { alive = false; };
  }, [enabled]);

  // Socios: al servidor con debounce; se descartan respuestas de búsquedas anteriores.
  useEffect(() => {
    if (!enabled || trimmed.length < 2) {
      setMembers([]);
      setLoadingMembers(false);
      setMemberError(false);
      return;
    }
    let alive = true;
    setLoadingMembers(true);
    const timer = setTimeout(() => {
      searchMembers(trimmed, PER_GROUP)
        .then((rows) => { if (alive) { setMembers(rows); setMemberError(false); } })
        .catch(() => { if (alive) { setMembers([]); setMemberError(true); } })
        .finally(() => { if (alive) setLoadingMembers(false); });
    }, MEMBER_DEBOUNCE_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, [trimmed, enabled]);

  return useMemo(() => {
    if (!trimmed) {
      return { actions: QUICK_ACTIONS, pages: [], members: [], records: [], loadingMembers, loadingCatalogs, memberError };
    }
    return {
      actions: rankResults(QUICK_ACTIONS, trimmed, 3),
      pages: rankResults(PAGES, trimmed, PER_GROUP),
      members,
      records: rankResults(catalog, trimmed, 8),
      loadingMembers,
      loadingCatalogs,
      memberError,
    };
  }, [trimmed, catalog, members, loadingMembers, loadingCatalogs, memberError]);
}
