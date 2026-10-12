'use client';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { Bot, Loader2, X } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

// Botón flotante del asistente de ayuda. El panel (motor + base de
// conocimiento, ~80 KB) se descarga al abrirlo, no con cada página; se
// adelanta la descarga al pasar el puntero o enfocar el botón.
const loadPanel = () => import('@/components/assistant/AssistantPanel');
const AssistantPanel = dynamic(loadPanel, { ssr: false, loading: () => null });

export default function HelpAssistant() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // El foco vuelve al botón que abrió el panel.
    buttonRef.current?.focus();
  }, []);

  function toggle() {
    if (open) { close(); return; }
    setLoading(true);
    loadPanel().finally(() => setLoading(false));
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        onPointerEnter={() => { void loadPanel(); }}
        onFocus={() => { void loadPanel(); }}
        aria-label={open ? t('assistant.close') : t('assistant.open')}
        aria-expanded={open}
        aria-controls="help-assistant"
        title={t('assistant.open')}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
      >
        {open && loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          : open ? <X className="h-5 w-5" aria-hidden="true" />
          : <Bot className="h-6 w-6" aria-hidden="true" />}
      </button>
      {open && <AssistantPanel onClose={close} />}
    </>
  );
}
