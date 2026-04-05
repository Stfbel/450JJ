// Backend URL — empty string when served from Railway (same origin), full URL for GitHub Pages
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'https://450jj-production.up.railway.app';

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

export const searchTechniquesViaBackend = async (
  techniques: { technique: string; position: string; level: string }[],
  onProgress: (done: number, total: number, technique: string, position: string) => void,
  onError: (technique: string, error: string) => void,
  abortRef: { current: boolean }
): Promise<Record<string, any[]>> => {
  const res = await fetch(`${BACKEND_URL}/api/youtube/search-techniques`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ techniques, maxResults: 5 }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let results: Record<string, any[]> = {};

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
        } else if (event.type === 'result') {
          results[event.key] = event.videos;
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

// ─── Shared data (videos + games stored on Railway for all users) ─────────────

export const fetchSharedVideos = async (): Promise<Record<string, any[]>> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/data/videos`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
};

export const fetchSharedGames = async (): Promise<Record<string, any>> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/data/games`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
};

export const pushSharedVideos = async (data: Record<string, any[]>, token: string): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/api/data/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
};

export const pushSharedGames = async (data: Record<string, any>, token: string): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/api/data/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
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
  // Call one technique at a time — avoids Railway long-connection timeout
  const results: Record<string, any> = {};

  for (let i = 0; i < techniques.length; i++) {
    if (abortRef.current) break;
    const t = techniques[i];
    const key = `${t.position}::${t.technique}`;

    onProgress(i, techniques.length, t.technique, t.position);

    try {
      const res = await fetch(`${BACKEND_URL}/api/claude/generate-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technique: t.technique, position: t.position, level: t.level }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(t.technique, err.error || `HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      results[key] = data;
    } catch (err: any) {
      onError(t.technique, err?.message || 'Network error');
    }
  }

  return results;
};
