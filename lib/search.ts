import { api } from '@/lib/api';

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

export function memberToResult(row: Row): SearchResult {
  const name = fullName(row) || row.user?.email || 'Socio sin nombre';
  const idNumber = row.identificationNumber ?? row.user?.profile?.identificationNumber;
  return {
    id: `member:${row.id}`,
    kind: 'member',
    title: name,
    subtitle: joinDefined([idNumber ? `CI ${idNumber}` : null, row.user?.email]),
    href: recordHref('/members', row, name),
    keywords: [row.user?.profile?.phone ?? '', idNumber ?? ''],
  };
}

// Socios: la búsqueda va al servidor (puede haber miles). Busca por nombre,
// apellido, correo y cédula, con todas las palabras obligatorias.
export async function searchMembers(query: string, limit = 6): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query.trim(), page: '1', pageSize: String(limit) });
  const response = await api.get(`/members?${params}`);
  const rows: Row[] = Array.isArray(response) ? response : response?.data ?? [];
  return rows.map(memberToResult);
}

// Catálogos pequeños: se descargan una vez y se filtran en el navegador.
const CATALOGS: Array<{ endpoint: string; toResult: (row: Row) => SearchResult }> = [
  {
    endpoint: '/products',
    toResult: (row) => ({
      id: `product:${row.id}`,
      kind: 'product',
      title: row.name,
      subtitle: joinDefined([row.sku ? `SKU ${row.sku}` : null, `Stock ${row.stock ?? 0}`]),
      href: recordHref('/products', row, row.name),
      keywords: [row.sku ?? ''],
    }),
  },
  {
    endpoint: '/membership-plans',
    toResult: (row) => ({
      id: `plan:${row.id}`,
      kind: 'plan',
      title: row.name,
      subtitle: joinDefined([row.durationDays ? `${row.durationDays} días` : null, row.price != null ? `${row.price} ${row.currency ?? ''}`.trim() : null]),
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
    toResult: (row) => {
      const name = fullName(row) || row.user?.email || 'Entrenador';
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
let catalogCache: { at: number; promise: Promise<SearchResult[]> } | null = null;

// Una fuente que falla no tumba el buscador: se omite y el resto sigue funcionando.
export function loadCatalogs(force = false): Promise<SearchResult[]> {
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.promise;
  const promise = Promise.allSettled(
    CATALOGS.map(async ({ endpoint, toResult }) => (await api.list(endpoint)).filter((row) => row?.id && (row.name || row.user)).map(toResult)),
  ).then((settled) => settled.flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : [])));
  catalogCache = { at: Date.now(), promise };
  return promise;
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
