import { API_BASE, ApiError, authorizedFetch, getToken, refreshSession } from '@/lib/api';

export type ExportResource = 'members' | 'attendance' | 'finances';
export type ExportFormat = 'xlsx' | 'csv';

function fileNameFrom(res: Response, fallback: string): string {
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : fallback;
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const message = body?.message;
  return Array.isArray(message) ? message.join(', ') : message ?? `Error ${res.status}`;
}

// Dispara la descarga de un Blob con su nombre de archivo.
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// MIG-F02 — descarga una exportación con los filtros actuales. Se hace con
// fetch (no con un <a href>) porque el API autentica por header Bearer.
export async function downloadExport(
  resource: ExportResource,
  format: ExportFormat,
  filters: Record<string, string | undefined | null> = {},
) {
  const params = new URLSearchParams({ format });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const res = await authorizedFetch(`/exports/${resource}?${params}`);
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  saveBlob(await res.blob(), fileNameFrom(res, `${resource}.${format}`));
}

// Sube un multipart con progreso real (fetch no expone el progreso de subida).
// Reintenta una vez si el token expiró.
export function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  const send = (retry: boolean): Promise<T> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_BASE + path);
      xhr.withCredentials = true;
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onerror = () => reject(new Error('No se pudo conectar con el servidor'));
      xhr.onload = async () => {
        if (xhr.status === 401 && retry && (await refreshSession())) {
          send(false).then(resolve, reject);
          return;
        }
        let body: any = null;
        try { body = JSON.parse(xhr.responseText); } catch { /* respuesta vacía */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
        else {
          const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
          reject(new ApiError(message || (xhr.status === 413 ? 'El archivo supera los 5 MB' : 'Fallo en la solicitud'), xhr.status));
        }
      };
      xhr.send(form);
    });
  return send(true);
}

// Genera un CSV en el navegador (reporte de errores de la importación).
export function downloadCsv(fileName: string, headers: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    let text = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // evita fórmulas al abrir en Excel
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  saveBlob(new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8' }), fileName);
}
