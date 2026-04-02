export interface YouTubeSearchResult {
  title: string;
  url: string;
  videoId: string;
  creator: string;
  stars: number;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export const getApiKey = (): string => localStorage.getItem('bjj-youtube-api-key') || '';
export const saveApiKey = (key: string) => localStorage.setItem('bjj-youtube-api-key', key);

export const getSyncedVideos = (): Record<string, YouTubeSearchResult[]> => {
  const stored = localStorage.getItem('bjj-synced-videos');
  return stored ? JSON.parse(stored) : {};
};
export const saveSyncedVideos = (data: Record<string, YouTubeSearchResult[]>) =>
  localStorage.setItem('bjj-synced-videos', JSON.stringify(data));
export const clearSyncedVideos = () => localStorage.removeItem('bjj-synced-videos');

export const getVideoPool = (): YouTubeSearchResult[] => {
  const stored = localStorage.getItem('bjj-video-pool');
  return stored ? JSON.parse(stored) : [];
};
export const saveVideoPool = (videos: YouTubeSearchResult[]) =>
  localStorage.setItem('bjj-video-pool', JSON.stringify(videos));
export const clearVideoPool = () => localStorage.removeItem('bjj-video-pool');

export const getSyncedKey = (technique: string, position: string) =>
  `${position}::${technique}`;

// ─── Search query tiers (lower tier = fewer quota units) ─────────────────────
export const BJJ_SEARCH_QUERIES_TIER1 = [
  // 10 queries = 1,000 units — covers core positions & techniques
  'jiu jitsu no-gi tutorial guard',
  'BJJ mount back control technique',
  'heel hook leg lock no-gi',
  'guard passing BJJ no-gi',
  'triangle guillotine choke no-gi',
  'half guard sweep BJJ tutorial',
  'side control escape BJJ',
  'armbar kimura no-gi submission',
  'takedown wrestling BJJ',
  'BJJ competition highlights grappling',
];

export const BJJ_SEARCH_QUERIES_TIER2 = [
  // 20 more queries = 2,000 extra units
  'closed guard BJJ no-gi',
  'back control BJJ no-gi',
  'leg entanglement no-gi',
  'turtle position BJJ breakdown',
  'deep half guard tutorial',
  'x guard butterfly guard BJJ',
  '50/50 guard no-gi',
  'guillotine choke BJJ tutorial',
  'rear naked choke technique',
  'kneebar ankle lock footlock BJJ',
  'guard retention no-gi jiu jitsu',
  'smash pass leg drag no-gi',
  'BJJ escape technique tutorial',
  'ashi garami heel hook entries',
  'darce anaconda choke BJJ',
  'omoplata sweep no-gi',
  'jiu jitsu fundamentals no-gi',
  'BJJ positional sparring drill',
  'no-gi grappling competition ADCC',
  'submission wrestling technique 2024',
];

// All queries combined
export const BJJ_SEARCH_QUERIES = [...BJJ_SEARCH_QUERIES_TIER1, ...BJJ_SEARCH_QUERIES_TIER2];

// ─── Fetch one page of search results ────────────────────────────────────────
const fetchSearchPage = async (
  query: string,
  apiKey: string,
  pageToken?: string
): Promise<{ items: YouTubeSearchResult[]; nextPageToken?: string }> => {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '50',
    relevanceLanguage: 'en',
    key: apiKey,
    ...(pageToken ? { pageToken } : {}),
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const items: YouTubeSearchResult[] = (data.items || [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      videoId: item.id.videoId,
      creator: item.snippet.channelTitle,
      stars: 3,
    }));
  return { items, nextPageToken: data.nextPageToken };
};

// ─── Broad crawl: run all queries, deduplicate ────────────────────────────────
export const broadCrawlBJJ = async (
  apiKey: string,
  onProgress: (done: number, total: number, videoCount: number, lastError?: string) => void,
  abortRef: { current: boolean },
  queries = BJJ_SEARCH_QUERIES
): Promise<YouTubeSearchResult[]> => {
  const seen = new Set<string>();
  const all: YouTubeSearchResult[] = [];

  for (let i = 0; i < queries.length; i++) {
    if (abortRef.current) break;
    let lastError: string | undefined;
    try {
      const { items } = await fetchSearchPage(queries[i], apiKey);
      for (const v of items) {
        if (!seen.has(v.videoId)) {
          seen.add(v.videoId);
          all.push(v);
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'Unknown error';
      // If first query fails with auth error, abort immediately
      if (i === 0 && (lastError.includes('key') || lastError.includes('403') || lastError.includes('400'))) {
        throw new Error(lastError);
      }
    }
    onProgress(i + 1, queries.length, all.length, lastError);
    await new Promise((r) => setTimeout(r, 200));
  }
  return all;
};

// ─── Fetch video description (1 quota unit per video) ────────────────────────
export const getVideoDescription = async (
  videoId: string,
  apiKey: string
): Promise<{ title: string; description: string; duration: string } | null> => {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: apiKey,
  });
  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  return {
    title: item.snippet.title,
    description: item.snippet.description || '',
    duration: item.contentDetails?.duration || '',
  };
};

// ─── Match pool videos to a technique ────────────────────────────────────────
export const matchVideosToTechnique = (
  technique: string,
  position: string,
  pool: YouTubeSearchResult[],
  maxResults = 5
): YouTubeSearchResult[] => {
  const techniqueLower = technique.toLowerCase();
  const positionLower = position.toLowerCase();

  // Split into keywords
  const keywords = [
    ...techniqueLower.split(/\s+/),
    ...positionLower.split(/\s+/),
  ].filter((k) => k.length > 2);

  const scored = pool.map((v) => {
    const titleLower = v.title.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 2;
    }
    // Bonus for exact technique name
    if (titleLower.includes(techniqueLower)) score += 5;
    if (titleLower.includes(positionLower)) score += 3;
    // Bonus for BJJ/no-gi keywords
    if (titleLower.includes('bjj') || titleLower.includes('jiu')) score += 1;
    if (titleLower.includes('no-gi') || titleLower.includes('nogi')) score += 1;
    return { ...v, score };
  });

  const filtered = scored
    .filter((v) => v.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  // Assign stars based on rank
  return filtered.map((v, i) => ({
    ...v,
    stars: Math.max(1, maxResults - i),
  }));
};

// ─── Direct YouTube search (for Library search UI) ───────────────────────────
export const searchYouTube = async (
  query: string,
  apiKey: string,
  maxResults = 20
): Promise<YouTubeSearchResult[]> => {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    relevanceLanguage: 'en',
    key: apiKey,
  });
  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.items || [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      videoId: item.id.videoId,
      creator: item.snippet.channelTitle,
      stars: 3,
    }));
};
