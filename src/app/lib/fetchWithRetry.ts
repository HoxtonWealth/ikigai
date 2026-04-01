const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { retries = 2, delay = 2000 }: { retries?: number; delay?: number } = {},
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
    }
  }

  throw lastError ?? new Error('Request failed');
}
