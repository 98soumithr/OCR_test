export type ParsedResponse = {
  fields: Array<{
    canonical: string;
    candidates: Array<{ value: string; confidence: number; bbox: [number,number,number,number]; sourceText?: string; page: number }>;
    chosen?: { value: string; confidence: number; bbox: [number,number,number,number]; sourceText?: string; page: number };
    validations: Array<{ rule: string; passed: boolean; message?: string }>;
  }>;
  tables: Array<Record<string,string>[]>;
  meta: { scanned: boolean; pages: number; file_id: string };
};

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://127.0.0.1:8000';

export async function parsePdf(file: File): Promise<ParsedResponse> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE_URL}/parse`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function previewUrl(file_id: string, page: number, boxes?: Array<{ page: number; bbox: [number,number,number,number] }>) {
  const url = new URL(`${BASE_URL}/preview`);
  url.searchParams.set('file_id', file_id);
  url.searchParams.set('page', String(page));
  if (boxes && boxes.length) url.searchParams.set('boxes', JSON.stringify(boxes));
  return url.toString();
}
