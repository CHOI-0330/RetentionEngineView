export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const defaultHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
});

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...defaultHeaders(),
      ...(init?.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(await response.text());
  }

  // 204 No Content 처리
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // 빈 응답 처리 (content-length가 0이거나 없는 경우)
  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as unknown as T;
  }

  // content-type 확인
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    // 빈 텍스트인 경우 undefined 반환
    if (!text || text.trim().length === 0) {
      return undefined as unknown as T;
    }
    throw new Error(`Unexpected content-type: ${contentType}`);
  }

  return (await response.json()) as T;
}
