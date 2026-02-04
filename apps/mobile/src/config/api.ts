export const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function apiUrl(path: string) {
  const base = DEFAULT_BASE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = (data as any)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const msg = (data as any)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
