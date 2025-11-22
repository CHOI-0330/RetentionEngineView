export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export const defaultHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
});

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...defaultHeaders(),
      ...(init?.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error(await response.text());
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return (await response.json()) as T;
}
