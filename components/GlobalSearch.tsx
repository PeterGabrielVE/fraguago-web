'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command as CommandPrimitive } from 'cmdk';
import {
  ArrowRight,
  Box,
  CornerDownLeft,
  FileText,
  ListChecks,
  Loader2,
  Search,
  Tag,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { clearRecent, getRecent, highlightRanges, pushRecent, type SearchKind, type SearchResult } from '@/lib/search';
import { track } from '@/lib/analytics';
import { NAV } from '@/lib/navigation';

const KIND_META: Record<SearchKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  action: { label: 'Acción', icon: Zap },
  page: { label: 'Página', icon: FileText },
  member: { label: 'Socio', icon: Users },
  product: { label: 'Producto', icon: Box },
  plan: { label: 'Plan', icon: Tag },
  service: { label: 'Servicio', icon: Wrench },
  trainer: { label: 'Entrenador', icon: User },
  exercise: { label: 'Ejercicio', icon: ListChecks },
};

// Grupos de registros del catálogo, en el orden en que se muestran.
const RECORD_GROUPS: Array<{ kind: SearchKind; heading: string }> = [
  { kind: 'product', heading: 'Productos' },
  { kind: 'plan', heading: 'Planes' },
  { kind: 'service', heading: 'Servicios' },
  { kind: 'trainer', heading: 'Entrenadores' },
  { kind: 'exercise', heading: 'Ejercicios' },
];

const PAGE_ICONS = new Map(NAV.flatMap(({ items }) => items.map((item) => [item.href, item.icon] as const)));

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = highlightRanges(text, query);
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={index} className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground">{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function ResultItem({ result, query, onSelect }: { result: SearchResult; query: string; onSelect: (result: SearchResult) => void }) {
  const Icon = (result.kind === 'page' && PAGE_ICONS.get(result.href)) || KIND_META[result.kind].icon;
  return (
    <CommandItem value={result.id} onSelect={() => onSelect(result)} className="gap-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-data-selected/command-item:bg-primary/15 group-data-selected/command-item:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium"><Highlight text={result.title} query={query} /></span>
        {result.subtitle && <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{KIND_META[result.kind].label}</span>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-data-selected/command-item:opacity-60" />
    </CommandItem>
  );
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const results = useGlobalSearch(query, open);
  const trimmed = query.trim();

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('⌘ K');
  }, []);

  // Ctrl/⌘ + K abre o cierra desde cualquier pantalla; "/" abre si no se está escribiendo.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setRecent(getRecent());
    else setQuery('');
  }, [open]);

  const select = useCallback((result: SearchResult) => {
    pushRecent(result);
    track('global_search_selected', { kind: result.kind, query_length: trimmed.length });
    setOpen(false);
    router.push(result.href);
  }, [router, trimmed.length]);

  const recordGroups = useMemo(
    () => RECORD_GROUPS
      .map((group) => ({ ...group, items: results.records.filter((item) => item.kind === group.kind) }))
      .filter((group) => group.items.length > 0),
    [results.records],
  );

  const hasResults = results.actions.length + results.pages.length + results.members.length + results.records.length > 0;
  const stillLoading = results.loadingMembers || results.loadingCatalogs;
  const sections: React.ReactNode[] = [];

  if (!trimmed && recent.length > 0) {
    sections.push(
      <CommandGroup key="recent" heading="Recientes">
        {recent.map((result) => <ResultItem key={result.id} result={result} query="" onSelect={select} />)}
        <CommandItem value="clear-recent" onSelect={() => { clearRecent(); setRecent([]); }} className="justify-center text-xs text-muted-foreground">
          <X className="h-3.5 w-3.5" /> Borrar recientes
        </CommandItem>
      </CommandGroup>,
    );
  }
  if (results.actions.length > 0) {
    sections.push(
      <CommandGroup key="actions" heading="Acciones rápidas">
        {results.actions.map((result) => <ResultItem key={result.id} result={result} query={trimmed} onSelect={select} />)}
      </CommandGroup>,
    );
  }
  if (results.members.length > 0) {
    sections.push(
      <CommandGroup key="members" heading="Socios">
        {results.members.map((result) => <ResultItem key={result.id} result={result} query={trimmed} onSelect={select} />)}
        <CommandItem value="members-all" onSelect={() => select({ id: `members-q:${trimmed}`, kind: 'page', title: `Socios: “${trimmed}”`, href: `/members?q=${encodeURIComponent(trimmed)}` })} className="text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" /> Ver todos los socios que coinciden con “{trimmed}”
        </CommandItem>
      </CommandGroup>,
    );
  }
  for (const group of recordGroups) {
    sections.push(
      <CommandGroup key={group.kind} heading={group.heading}>
        {group.items.map((result) => <ResultItem key={result.id} result={result} query={trimmed} onSelect={select} />)}
      </CommandGroup>,
    );
  }
  if (results.pages.length > 0) {
    sections.push(
      <CommandGroup key="pages" heading="Páginas">
        {results.pages.map((result) => <ResultItem key={result.id} result={result} query={trimmed} onSelect={select} />)}
      </CommandGroup>,
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar en FraguaGo"
        aria-keyshortcuts="Control+K Meta+K /"
        className="hidden h-9 max-w-sm flex-1 items-center gap-2 rounded-lg bg-muted px-3 text-sm text-muted-foreground transition hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar en FraguaGo...</span>
        <Kbd className="bg-card">{shortcut}</Kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar en FraguaGo"
        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar en FraguaGo"
        description="Busca socios, productos, planes, servicios, entrenadores, ejercicios y pantallas."
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Busca socios, cédulas, productos, SKU, planes o pantallas..."
            aria-label="Término de búsqueda"
          />
          <CommandList className="max-h-[60vh] p-1">
            {sections.map((section, index) => (
              <Fragment key={index}>
                {index > 0 && <CommandSeparator />}
                {section}
              </Fragment>
            ))}

            {trimmed && !hasResults && (
              stillLoading ? (
                <CommandPrimitive.Loading>
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                  </div>
                </CommandPrimitive.Loading>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Sin resultados para “{trimmed}”</p>
                  <p className="mt-1">Prueba con el nombre, la cédula, el correo o el SKU, o revisa la ortografía.</p>
                </div>
              )
            )}
            {results.memberError && (
              <p role="alert" className="px-3 py-2 text-xs text-destructive">No se pudo buscar en socios. Revisa tu conexión e inténtalo de nuevo.</p>
            )}
          </CommandList>

          <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="flex items-center gap-1"><Kbd><CornerDownLeft /></Kbd> abrir</span>
            <span className="flex items-center gap-1"><Kbd>Esc</Kbd> cerrar</span>
            {stillLoading && hasResults && (
              <span className="ml-auto flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</span>
            )}
            {!stillLoading && !trimmed && (
              <span className="ml-auto hidden sm:inline">Escribe al menos 2 letras para buscar socios</span>
            )}
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
