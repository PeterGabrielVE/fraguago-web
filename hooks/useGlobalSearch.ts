'use client';
import { useEffect, useMemo, useState } from 'react';
import { NAV } from '@/lib/navigation';
import { catalogResults, loadCatalogs, memberToResult, rankResults, searchMembers, type CatalogRows, type SearchResult } from '@/lib/search';
import { useT } from '@/components/I18nProvider';
import { LOCALES } from '@/lib/i18n/config';
import { translate, type MessageKey, type Translate } from '@/lib/i18n/translate';

// Atajos a las tareas más frecuentes del día a día (ver manual: acciones rápidas del dashboard).
const QUICK_ACTION_DEFS: Array<{ id: string; href: string; title: MessageKey; keywords: MessageKey }> = [
  { id: 'action:new-member', href: '/members?new=1', title: 'search.actions.newMember', keywords: 'search.actions.newMemberKeywords' },
  { id: 'action:check-in', href: '/attendance', title: 'search.actions.checkIn', keywords: 'search.actions.checkInKeywords' },
  { id: 'action:new-sale', href: '/sales', title: 'search.actions.newSale', keywords: 'search.actions.newSaleKeywords' },
  { id: 'action:new-payment', href: '/payment-records?new=1', title: 'search.actions.newPayment', keywords: 'search.actions.newPaymentKeywords' },
  { id: 'action:new-product', href: '/products?new=1', title: 'search.actions.newProduct', keywords: 'search.actions.newProductKeywords' },
];

// Se busca en los sinónimos de TODOS los idiomas: quien tiene la interfaz en inglés
// y escribe "socios" (o al revés) también encuentra la pantalla.
function allLanguages(key: MessageKey): string[] {
  return LOCALES.flatMap((locale) => [translate(locale, key), ...translate(locale, key).split(',')]).map((word) => word.trim()).filter(Boolean);
}

function buildStatic(t: Translate) {
  const actions: SearchResult[] = QUICK_ACTION_DEFS.map((action) => ({
    id: action.id,
    kind: 'action',
    title: t(action.title),
    href: action.href,
    keywords: [...allLanguages(action.title), ...allLanguages(action.keywords)],
  }));
  const pages: SearchResult[] = NAV.flatMap(({ group, items }) =>
    items.map((item) => ({
      id: `page:${item.href}`,
      kind: 'page' as const,
      title: t(`nav.items.${item.key}`),
      subtitle: t(`nav.groups.${group}`),
      href: item.href,
      keywords: [...allLanguages(`nav.items.${item.key}`), ...allLanguages(`nav.keywords.${item.key}`)],
    })),
  );
  return { actions, pages };
}

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
  /** Versión actual (en el idioma activo) de una página o acción guardada en recientes. */
  refreshRecent: (result: SearchResult) => SearchResult;
};

export function useGlobalSearch(query: string, enabled: boolean): GlobalSearchState {
  const t = useT();
  const [catalog, setCatalog] = useState<CatalogRows>({});
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [memberRows, setMemberRows] = useState<Array<Record<string, any>>>([]);
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
      setMemberRows([]);
      setLoadingMembers(false);
      setMemberError(false);
      return;
    }
    let alive = true;
    setLoadingMembers(true);
    const timer = setTimeout(() => {
      searchMembers(trimmed, PER_GROUP)
        .then((rows) => { if (alive) { setMemberRows(rows); setMemberError(false); } })
        .catch(() => { if (alive) { setMemberRows([]); setMemberError(true); } })
        .finally(() => { if (alive) setLoadingMembers(false); });
    }, MEMBER_DEBOUNCE_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, [trimmed, enabled]);

  const { actions, pages } = useMemo(() => buildStatic(t), [t]);
  const records = useMemo(() => catalogResults(catalog, t), [catalog, t]);
  const members = useMemo(() => memberRows.map((row) => memberToResult(row, t)), [memberRows, t]);

  return useMemo(() => {
    const byId = new Map([...actions, ...pages].map((item) => [item.id, item]));
    const refreshRecent = (result: SearchResult) => byId.get(result.id) ?? result;
    const base = { loadingMembers, loadingCatalogs, memberError, refreshRecent };
    if (!trimmed) {
      return { ...base, actions, pages: [], members: [], records: [] };
    }
    return {
      ...base,
      actions: rankResults(actions, trimmed, 3),
      pages: rankResults(pages, trimmed, PER_GROUP),
      members,
      records: rankResults(records, trimmed, 8),
    };
  }, [trimmed, actions, pages, records, members, loadingMembers, loadingCatalogs, memberError]);
}
