// Backend URL — calls Railway instead of YouTube/Claude directly
export const BACKEND_URL = 'https://450jj-production.up.railway.app';

export const isBackendConfigured = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
};

// ─── YouTube via backend ───────────────────────────────────────────────────────

export const searchYouTubeViaBackend = async (
  query: string,
  maxResults = 20
): Promise<any[]> => {
  const res = await fetch(`${BACKEND_URL}/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const crawlYouTubeViaBackend = async (
  queries: string[],
  onProgress: (done: number, total: number, videoCount: number) => void
): Promise<any[]> => {
  // Send all queries at once — backend handles the crawl
  const res = await fetch(`${BACKEND_URL}/api/youtube/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  onProgress(queries.length, queries.length, data.total);
  return data.videos;
};

// ─── Claude via backend ────────────────────────────────────────────────────────

export const generateGameViaBackend = async (
  technique: string,
  position: string,
  level: string
): Promise<any> => {
  const res = await fetch(`${BACKEND_URL}/api/claude/generate-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technique, position, level }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const generateGamesBatchViaBackend = async (
  techniques: { technique: string; position: string; level: string }[],
  onProgress: (done: number, total: number, technique: string, position: string) => void,
  onError: (technique: string, error: string) => void,
  abortRef: { current: boolean }
): Promise<Record<string, any>> => {
  const res = await fetch(`${BACKEND_URL}/api/claude/generate-games-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ techniques }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  // Parse SSE stream
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let results: Record<string, any> = {};

  while (true) {
    if (abortRef.current) break;
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'progress') {
          onProgress(event.done, event.total, event.technique, event.position);
        } else if (event.type === 'error') {
          onError(event.technique, event.error);
        } else if (event.type === 'done') {
          results = event.results;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return results;
};
