// Motor del asistente de ayuda: búsqueda por palabras clave, sin IA ni
// servidor. Corre en el navegador sobre la base de conocimiento (knowledge.ts).
//
// Cómo decide:
//  1. Normaliza la pregunta (minúsculas, sin acentos ni signos), quita
//     palabras vacías y reduce cada palabra a su raíz (registrar/registro → regis).
//  2. Corrige errores de tipeo de una letra contra el vocabulario conocido.
//  3. Puntúa cada entrada: suma el peso (IDF) de las raíces que coinciden con
//     sus palabras clave; las frases completas suman extra. Las palabras que
//     aparecen en muchas entradas pesan menos.
//  4. Aplica permisos: si lo mejor que coincide es algo que el rol no puede
//     hacer, responde que no tiene acceso en vez de explicar cómo hacerlo.
import type { Locale } from '@/lib/i18n/config';
import { ENTRIES, type Entry, type Role } from './knowledge';

const STOPWORDS = new Set([
  // es
  'a', 'al', 'algo', 'como', 'con', 'cual', 'cuales', 'cuando', 'de', 'del', 'donde', 'el', 'en', 'es', 'esta', 'este', 'esto',
  'hacer', 'hago', 'hay', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'mis', 'necesito', 'no', 'o', 'para', 'por', 'puede',
  'pueden', 'puedo', 'que', 'quiero', 'se', 'si', 'sin', 'su', 'sus', 'te', 'tengo', 'tu', 'un', 'una', 'uno', 'y', 'ya', 'yo',
  'favor', 'ayuda', 'debo', 'deberia', 'hace', 'sirve', 'manera', 'forma', 'nuevo', 'nueva',
  'estan', 'estas', 'estoy', 'son', 'ser', 'ver', 'veo', 'era', 'fue', 'tiene', 'tienen', 'otra', 'otro', 'muy', 'mas', 'entre',
  // en
  'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to',
  'what', 'when', 'where', 'which', 'with', 'you', 'your', 'need', 'want', 'should', 'please', 'new',
]);

// Sinónimos e irregulares que la raíz no une (se aplican antes de recortar).
const SYNONYMS: Record<string, string> = {
  renueva: 'renovar', renuevo: 'renovar', renuevan: 'renovar', renewal: 'renew',
  miembro: 'socio', miembros: 'socio', cliente: 'socio', clientes: 'socio', alumno: 'socio', alumnos: 'socio', afiliado: 'socio',
  member: 'socio', members: 'socio',
  clave: 'contrasena', password: 'contrasena', pass: 'contrasena', pin: 'contrasena',
  mensualidad: 'membresia', suscripcion: 'membresia', membership: 'membresia', memberships: 'membresia', membrecia: 'membresia',
  entrada: 'checkin', ingreso: 'checkin', asistir: 'asistencia', marcar: 'checkin', check: 'checkin',
  pagar: 'pago', cobrar: 'pago', cobro: 'pago', cobros: 'pago', abono: 'pago', payment: 'pago', pay: 'pago',
  dolar: 'tasa', bcv: 'tasa', divisa: 'tasa', divisas: 'tasa',
  coach: 'entrenador', instructor: 'entrenador', profesor: 'entrenador', trainer: 'entrenador',
  empleado: 'usuario', personal: 'usuario', staff: 'usuario', user: 'usuario',
  borrar: 'eliminar', borro: 'eliminar', borra: 'eliminar', elimino: 'eliminar', elimina: 'eliminar',
  quitar: 'eliminar', quito: 'eliminar', delete: 'eliminar', remove: 'eliminar',
  gano: 'ganar', gana: 'ganar', gane: 'ganar', acumulo: 'ganar', acumular: 'ganar', earn: 'ganar',
  registro: 'registrar', registra: 'registrar', inscribo: 'inscribir', creo: 'crear', crea: 'crear',
  vendo: 'vender', vende: 'vender',
  pausar: 'suspender', congelar: 'suspender', pause: 'suspender', freeze: 'suspender',
  anular: 'cancelar', baja: 'cancelar', cancel: 'cancelar',
};

const MIN_SCORE = 1.2;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/ñ/g, 'n')
    .trim();
}

// Raíz simple: quita el plural y recorta a 5 letras. Suficiente para unir
// registrar/registro/registra, membresia/membresias, suspender/suspension.
export function stem(word: string): string {
  const w = SYNONYMS[word] ?? word;
  const singular = w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
  return singular.length > 5 ? singular.slice(0, 5) : singular;
}

function words(text: string): string[] {
  return normalize(text).split(' ').filter((w) => w && !STOPWORDS.has(w));
}

function tokens(text: string): string[] {
  return words(text).map(stem);
}

// Distancia de edición ≤ 1 (cambio, alta o baja de una letra).
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

type IndexedEntry = { entry: Entry; phrases: string[][]; stems: Set<string> };

// vocab: palabras completas de las palabras clave, para corregir tipeos.
let index: { entries: IndexedEntry[]; idf: Map<string, number>; vocab: string[] } | null = null;

function getIndex() {
  if (index) return index;
  const entries: IndexedEntry[] = ENTRIES.map((entry) => {
    const phrases = [...entry.keywords.es, ...entry.keywords.en].map(tokens).filter((p) => p.length > 0);
    return { entry, phrases, stems: new Set(phrases.flat()) };
  });
  const df = new Map<string, number>();
  for (const e of entries) for (const s of e.stems) df.set(s, (df.get(s) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [s, n] of df) idf.set(s, Math.log(1 + entries.length / n));
  const vocab = new Set<string>();
  for (const entry of ENTRIES) {
    for (const keyword of [...entry.keywords.es, ...entry.keywords.en]) for (const w of words(keyword)) vocab.add(w);
  }
  index = { entries, idf, vocab: [...vocab] };
  return index;
}

// Raíces de la pregunta corrigiendo tipeos: si una palabra (de 5+ letras) no
// es conocida, usa una palabra clave a una letra de distancia
// (membrecia → membresia, renobar → renovar). Se compara la palabra completa
// y no la raíz recortada, para no confundir "receta" con "recepción".
function queryStems(question: string, vocab: string[], idf: Map<string, number>): string[] {
  return words(question).map((w) => {
    const s = stem(w);
    if (idf.has(s) || w.length < 5) return s;
    const fix = vocab.find((v) => v.length >= 5 && withinOneEdit(w, v));
    return fix ? stem(fix) : s;
  });
}

export function canAccess(entry: Entry, role: Role | undefined): boolean {
  if (!entry.roles) return true;
  if (role === 'OWNER') return entry.roles.includes('OWNER') || !entry.roles.includes('MEMBER');
  return Boolean(role && entry.roles.includes(role));
}

export type MatchResult =
  | { kind: 'answer'; entry: Entry; also: Entry[] }
  | { kind: 'denied'; entry: Entry }
  | { kind: 'fallback'; suggestions: Entry[] };

export function findEntry(id: string): Entry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

// Página del panel o del portal donde está el usuario (para "¿qué hago aquí?").
export function pageEntryFor(pathname: string): Entry | undefined {
  return ENTRIES
    .filter((e) => e.page && (pathname === e.page || pathname.startsWith(`${e.page}/`)))
    .sort((a, b) => b.page!.length - a.page!.length)[0];
}

export function match(question: string, ctx: { role?: Role; pathname: string }): MatchResult {
  const { entries, idf, vocab } = getIndex();
  const query = queryStems(question, vocab, idf);
  const querySet = new Set(query);

  const scored = entries
    .map(({ entry, phrases }) => {
      let score = 0;
      const seen = new Set<string>();
      // Sinónimos que quedan en la misma raíz (socios, clientes, miembros…)
      // suman el bono una sola vez.
      const bonused = new Set<string>();
      for (const phrase of phrases) {
        const hits = phrase.filter((s) => querySet.has(s));
        for (const s of hits) {
          if (!seen.has(s)) { seen.add(s); score += idf.get(s) ?? 0; }
        }
        // Palabra clave completa: señal fuerte si es una frase, leve si es una
        // sola palabra (desempata frente a frases que solo coinciden a medias).
        const key = phrase.join(' ');
        if (hits.length === phrase.length && !bonused.has(key)) {
          bonused.add(key);
          score += phrase.length > 1 ? phrase.length * 0.8 : 0.3;
        }
      }
      // Las descripciones de pantalla ceden ante una tarea que coincide igual:
      // "cómo hacerlo" suele ser más útil que "qué es esta pantalla".
      return { entry, score: entry.page ? score * 0.85 : score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // "¿Qué hago aquí?": se responde con la pantalla actual.
  const best = scored[0];
  if (best?.entry.id === 'here') {
    const page = pageEntryFor(ctx.pathname);
    if (page) return canAccess(page, ctx.role) ? { kind: 'answer', entry: page, also: [] } : { kind: 'denied', entry: page };
  }

  if (!best || best.score < MIN_SCORE) {
    const suggestions = scored.filter((s) => canAccess(s.entry, ctx.role) && s.entry.id !== 'here').slice(0, 3).map((s) => s.entry);
    return { kind: 'fallback', suggestions };
  }

  // Preferimos algo que el rol sí puede hacer si puntúa parecido a lo mejor.
  const allowed = scored.filter((s) => canAccess(s.entry, ctx.role));
  const bestAllowed = allowed[0];
  if (!bestAllowed || bestAllowed.score < Math.max(MIN_SCORE, best.score * 0.6)) {
    return { kind: 'denied', entry: best.entry };
  }

  // Otras coincidencias cercanas, por si la pregunta era ambigua.
  const also = allowed
    .slice(1)
    .filter((s) => s.score >= bestAllowed.score * 0.7 && s.entry.id !== 'here')
    .slice(0, 2)
    .map((s) => s.entry);
  return { kind: 'answer', entry: bestAllowed.entry, also };
}

export function text(entry: Entry, field: 'title' | 'answer', locale: Locale): string {
  return entry[field][locale] ?? entry[field].es;
}
