import { api } from '@/lib/api';
import type { Translate } from '@/lib/i18n/translate';

// Tipos de resultado del buscador global. `page` y `action` salen del menú;
// el resto son registros del gimnasio.
export type SearchKind = 'page' | 'action' | 'member' | 'product' | 'plan' | 'service' | 'trainer' | 'exercise';

export type SearchResult = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  href: string;
  /** Texto extra que cuenta para la coincidencia pero no se muestra (sinónimos, SKU, correo...). */
  keywords?: string[];
  score?: number;
};

// Minúsculas y sin tildes: "José" encuentra "jose" y viceversa.
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

// Puntúa un texto contra un token: exacto > empieza por > empieza una palabra > contiene.
function tokenScore(text: string, token: string): number {
  if (!text) return 0;
  if (text === token) return 100;
  if (text.startsWith(token)) return 80;
  if (text.includes(` ${token}`) || text.includes(`-${token}`) || text.includes(`@${token}`)) return 60;
  if (text.includes(token)) return 30;
  return 0;
}

// Todos los tokens tienen que aparecer (en el título o en las palabras clave).
// El título pesa más que las palabras clave. 0 = no coincide.
export function scoreResult(result: SearchResult, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const title = normalize(result.title);
  const extra = [result.subtitle ?? '', ...(result.keywords ?? [])].map(normalize);
  let total = 0;
  for (const token of tokens) {
    const inTitle = tokenScore(title, token);
    const inExtra = Math.max(0, ...extra.map((text) => tokenScore(text, token))) * 0.6;
    const best = Math.max(inTitle, inExtra);
    if (best === 0) return 0;
    total += best;
  }
  return total / tokens.length;
}

export function rankResults(results: SearchResult[], query: string, limit: number): SearchResult[] {
  const tokens = tokenize(query);
  return results
    .map((result) => ({ ...result, score: scoreResult(result, tokens) }))
    .filter((result) => (result.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title, 'es'))
    .slice(0, limit);
}

// Tramos del título que coinciden con la búsqueda, para resaltarlos.
// Se compara sobre la versión sin tildes: NFD + quitar diacríticos no cambia la longitud
// de los caracteres base en español, así que los índices sirven para el texto original.
export function highlightRanges(text: string, query: string): Array<[number, number]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const plain = Array.from(text).map((char) => normalize(char) || char).join('').toLowerCase();
  if (plain.length !== text.length) return [];
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    const index = plain.indexOf(token);
    if (index >= 0) ranges.push([index, index + token.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Fuentes de datos
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

function fullName(row: Row): string {
  const profile = row.user?.profile ?? {};
  return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
}

function joinDefined(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

// Enlace a una pantalla de listado que abre el registro (o filtra la tabla por él).
function recordHref(path: string, row: Row, query: string): string {
  const params = new URLSearchParams({ id: String(row.id), q: query });
  return `${path}?${params}`;
}

export function memberToResult(row: Row, t: Translate): SearchResult {
  const name = fullName(row) || row.user?.email || t('search.fallback.member');
  const idNumber = row.identificationNumber ?? row.user?.profile?.identificationNumber;
  return {
    id: `member:${row.id}`,
    kind: 'member',
    title: name,
    subtitle: joinDefined([idNumber ? t('search.subtitles.idNumber', { value: idNumber }) : null, row.user?.email]),
    href: recordHref('/members', row, name),
    keywords: [row.user?.profile?.phone ?? '', idNumber ?? ''],
  };
}

// Socios: la búsqueda va al servidor (puede haber miles). Busca por nombre,
// apellido, correo y cédula, con todas las palabras obligatorias.
// Devuelve filas crudas: el texto se arma al pintar, en el idioma activo.
export async function searchMembers(query: string, limit = 6): Promise<Row[]> {
  const params = new URLSearchParams({ q: query.trim(), page: '1', pageSize: String(limit) });
  const response = await api.get(`/members?${params}`);
  return Array.isArray(response) ? response : response?.data ?? [];
}

// Catálogos pequeños: se descargan una vez y se filtran en el navegador.
const CATALOGS: Array<{ endpoint: string; toResult: (row: Row, t: Translate) => SearchResult }> = [
  {
    endpoint: '/products',
    toResult: (row, t) => ({
      id: `product:${row.id}`,
      kind: 'product',
      title: row.name,
      subtitle: joinDefined([row.sku ? t('search.subtitles.sku', { value: row.sku }) : null, t('search.subtitles.stock', { value: row.stock ?? 0 })]),
      href: recordHref('/products', row, row.name),
      keywords: [row.sku ?? ''],
    }),
  },
  {
    endpoint: '/membership-plans',
    toResult: (row, t) => ({
      id: `plan:${row.id}`,
      kind: 'plan',
      title: row.name,
      subtitle: joinDefined([row.durationDays ? t('search.subtitles.days', { count: Number(row.durationDays) }) : null, row.price != null ? `${row.price} ${row.currency ?? ''}`.trim() : null]),
      href: recordHref('/membership-plans', row, row.name),
      keywords: [row.type ?? ''],
    }),
  },
  {
    endpoint: '/services',
    toResult: (row) => ({
      id: `service:${row.id}`,
      kind: 'service',
      title: row.name,
      subtitle: row.description ?? undefined,
      href: recordHref('/services', row, row.name),
    }),
  },
  {
    endpoint: '/trainers',
    toResult: (row, t) => {
      const name = fullName(row) || row.user?.email || t('search.fallback.trainer');
      return {
        id: `trainer:${row.id}`,
        kind: 'trainer',
        title: name,
        subtitle: joinDefined([row.specialty, row.user?.email]),
        href: recordHref('/trainers', row, name),
        keywords: [row.identificationNumber ?? '', row.user?.email ?? ''],
      };
    },
  },
  {
    endpoint: '/exercises',
    toResult: (row) => ({
      id: `exercise:${row.id}`,
      kind: 'exercise',
      title: row.name,
      subtitle: joinDefined([row.muscleGroup, row.equipment]),
      href: recordHref('/exercises', row, row.name),
      keywords: [row.muscleGroup ?? '', row.equipment ?? ''],
    }),
  },
];

const CATALOG_TTL_MS = 5 * 60 * 1000;
// Filas crudas por endpoint: la caché no depende del idioma.
export type CatalogRows = Record<string, Row[]>;
let catalogCache: { at: number; promise: Promise<CatalogRows> } | null = null;

// Una fuente que falla no tumba el buscador: se omite y el resto sigue funcionando.
export function loadCatalogs(force = false): Promise<CatalogRows> {
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.promise;
  const promise = Promise.allSettled(
    CATALOGS.map(async ({ endpoint }) => [endpoint, (await api.list(endpoint)).filter((row) => row?.id && (row.name || row.user))] as const),
  ).then((settled) => Object.fromEntries(settled.flatMap((entry) => (entry.status === 'fulfilled' ? [entry.value] : []))));
  catalogCache = { at: Date.now(), promise };
  return promise;
}

export function catalogResults(rows: CatalogRows, t: Translate): SearchResult[] {
  return CATALOGS.flatMap(({ endpoint, toResult }) => (rows[endpoint] ?? []).map((row) => toResult(row, t)));
}

// ---------------------------------------------------------------------------
// Recientes (por navegador; es solo una comodidad)
// ---------------------------------------------------------------------------

const RECENT_KEY = 'fg_recent_search';
const RECENT_MAX = 6;

export function getRecent(): SearchResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(result: SearchResult) {
  try {
    const { score: _score, ...clean } = result;
    const next = [clean, ...getRecent().filter((item) => item.id !== result.id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // sin almacenamiento disponible (modo privado): los recientes simplemente no se guardan
  }
}

export function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // ignorado
  }
}
