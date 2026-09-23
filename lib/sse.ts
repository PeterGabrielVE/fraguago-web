import { API_BASE, getToken } from '@/lib/api';

export type SseMessage = { event: string; data: string };

export class SseError extends Error {
  constructor(public readonly status: number) {
    super(`SSE HTTP ${status}`);
    this.name = 'SseError';
  }
}

// Cliente SSE sobre fetch (no EventSource): EventSource no permite mandar el
// header Authorization, y el API autentica por Bearer. Resuelve cuando el
// servidor cierra el stream; rechaza con SseError si la respuesta no es 2xx.
export async function streamSse(
  path: string,
  { onMessage, signal }: { onMessage: (msg: SseMessage) => void; signal: AbortSignal },
): Promise<void> {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal,
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok || !res.body) throw new SseError(res.status);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;

    // Los eventos se separan por una línea en blanco.
    let sep: RegExpExecArray | null;
    while ((sep = /\r?\n\r?\n/.exec(buffer))) {
      const block = buffer.slice(0, sep.index);
      buffer = buffer.slice(sep.index + sep[0].length);

      let event = 'message';
      const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (!line || line.startsWith(':')) continue; // comentario / keep-alive
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        const val = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (field === 'event') event = val;
        else if (field === 'data') data.push(val);
      }
      onMessage({ event, data: data.join('\n') });
    }
  }
}
