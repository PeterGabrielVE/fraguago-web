'use client';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, RotateCcw, Send, X } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { getRole } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { canAccess, findEntry, match, pageEntryFor, text as entryText } from '@/lib/assistant/engine';
import { ROLE_NAMES, STARTERS, type Entry, type Role } from '@/lib/assistant/knowledge';

// Asistente de ayuda sin IA: responde con la base de conocimiento local
// (lib/assistant). No llama al servidor, no tiene costo y es instantáneo.

// options: ids de entradas para mostrar como botones (relacionadas o sugerencias).
type ChatMessage = { role: 'user' | 'bot'; text: string; options?: string[] };

// Se conserva mientras la pestaña esté abierta (al navegar entre pantallas).
const STORAGE_KEY = 'fg_assistant_chat';
const MAX_INPUT = 300;
const ROLES: Role[] = ['OWNER', 'ADMIN', 'STAFF', 'TRAINER', 'MEMBER'];

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
  } catch {
    // Sin storage: el chat funciona igual, solo no sobrevive a recargar.
  }
}

// Markdown mínimo que pide el asistente: **negrita** y [texto](/ruta).
// Solo se enlazan rutas internas; cualquier otra URL queda como texto.
function renderInline(text: string, onNavigate: () => void) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith('/') && !href.startsWith('//')) {
        return (
          <Link key={i} href={href} onClick={onNavigate} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {label}
          </Link>
        );
      }
      return <Fragment key={i}>{label}</Fragment>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function AssistantText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const ListTag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <ListTag key={blocks.length} className={cn('space-y-1 pl-5', list.ordered ? 'list-decimal' : 'list-disc')}>
        {list.items.map((item, i) => <li key={i}>{renderInline(item, onNavigate)}</li>)}
      </ListTag>,
    );
    list = null;
  };

  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (line.trim()) blocks.push(<p key={blocks.length}>{renderInline(line, onNavigate)}</p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

// Panel del asistente. Se carga bajo demanda desde HelpAssistant (el botón
// flotante), así la base de conocimiento no viaja en cada página.
export default function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const rawRole = getRole()?.toUpperCase();
  const role = ROLES.find((r) => r === rawRole);
  const starters = (role === 'MEMBER' ? STARTERS.member : role === 'TRAINER' ? STARTERS.trainer : STARTERS.desk)
    .map(findEntry)
    .filter((e): e is Entry => Boolean(e) && canAccess(e!, role))
    // "¿Qué hago aquí?" solo si hay ayuda para la pantalla actual.
    .filter((e) => e.id !== 'here' || Boolean(pageEntryFor(pathname)));

  useEffect(() => { setMessages(loadHistory()); }, []);
  useEffect(() => { saveHistory(messages); }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Nombres de los roles que sí pueden hacer algo (sin repetir Propietario,
  // que puede todo, salvo que sea el único).
  const roleList = (roles: Role[] | undefined) =>
    (roles ?? []).filter((r) => r !== 'OWNER' || roles!.length === 1).map((r) => ROLE_NAMES[r][locale]).join(', ');

  // Respuesta a una entrada concreta (botones de sugerencia o relacionadas).
  function reply(entry: Entry): ChatMessage {
    if (entry.id === 'here') {
      const page = pageEntryFor(pathname);
      if (page) return reply(page);
    }
    if (!canAccess(entry, role)) {
      return { role: 'bot', text: t('assistant.denied', { roles: roleList(entry.roles) }) };
    }
    const options = entry.id === 'greeting'
      ? starters.map((e) => e.id)
      : (entry.related ?? []).filter((id) => {
        const related = findEntry(id);
        return related && canAccess(related, role);
      });
    return { role: 'bot', text: entryText(entry, 'answer', locale), options };
  }

  function answerQuestion(question: string): ChatMessage {
    const result = match(question, { role, pathname });
    if (result.kind === 'answer') {
      const base = reply(result.entry);
      // Si la pregunta era ambigua, ofrecemos también las otras coincidencias.
      const options = [...result.also.map((e) => e.id), ...(base.options ?? [])];
      return { ...base, options: [...new Set(options)].slice(0, 4) };
    }
    if (result.kind === 'denied') return reply(result.entry);
    const fallback = result.suggestions.length ? result.suggestions : starters;
    return {
      role: 'bot',
      text: t(result.suggestions.length ? 'assistant.notSure' : 'assistant.noMatch'),
      options: fallback.map((e) => e.id).slice(0, 4),
    };
  }

  function send(text: string) {
    const question = text.trim().slice(0, MAX_INPUT);
    if (!question) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }, answerQuestion(question)]);
    setInput('');
  }

  function choose(entry: Entry) {
    setMessages((prev) => [...prev, { role: 'user', text: entryText(entry, 'title', locale) }, reply(entry)]);
  }

  function reset() {
    setMessages([]);
    inputRef.current?.focus();
  }

  const optionButton = (id: string) => {
    const entry = findEntry(id);
    if (!entry) return null;
    return (
      <button
        key={id}
        type="button"
        onClick={() => choose(entry)}
        className="rounded-xl border border-border px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5"
      >
        {entryText(entry, 'title', locale)}
      </button>
    );
  };

  return (
        <section
          id="help-assistant"
          role="dialog"
          aria-label={t('assistant.title')}
          className="fixed bottom-20 right-4 z-40 flex h-[min(560px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t('assistant.title')}</p>
              <p className="truncate text-xs text-muted-foreground">{t('assistant.subtitle')}</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                aria-label={t('assistant.reset')}
                title={t('assistant.reset')}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('assistant.close')}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">{t('assistant.welcome')}</p>
                <div className="flex flex-col gap-2">
                  {starters.map((e) => optionButton(e.id))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed',
                      m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted',
                    )}
                  >
                    {m.role === 'user'
                      ? <p className="whitespace-pre-wrap">{m.text}</p>
                      : <AssistantText text={m.text} onNavigate={onClose} />}
                  </div>
                </div>
                {/* Botones de seguimiento solo en la última respuesta. */}
                {m.role === 'bot' && m.options && m.options.length > 0 && i === messages.length - 1 && (
                  <div className="flex flex-col gap-2 pl-1">
                    <p className="text-xs text-muted-foreground">{t('assistant.related')}</p>
                    {m.options.map(optionButton)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">{t('assistant.placeholder')}</label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_INPUT}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter envía; Shift+Enter hace salto de línea.
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); }
              }}
              placeholder={t('assistant.placeholder')}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label={t('assistant.send')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="px-4 pb-2 text-[11px] text-muted-foreground">{t('assistant.disclaimer')}</p>
        </section>
  );
}
