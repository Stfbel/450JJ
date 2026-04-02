import { GameData } from '../data/techniques';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export const getClaudeApiKey = (): string => {
  return localStorage.getItem('bjj-claude-api-key') || '';
};

export const saveClaudeApiKey = (key: string) => {
  localStorage.setItem('bjj-claude-api-key', key);
};

export const getSyncedGames = (): Record<string, GameData> => {
  const stored = localStorage.getItem('bjj-synced-games');
  return stored ? JSON.parse(stored) : {};
};

export const saveSyncedGames = (data: Record<string, GameData>) => {
  localStorage.setItem('bjj-synced-games', JSON.stringify(data));
};

export const clearSyncedGames = () => {
  localStorage.removeItem('bjj-synced-games');
};

export const getTimestampAnalyses = (): Record<string, number> => {
  const stored = localStorage.getItem('bjj-timestamps');
  return stored ? JSON.parse(stored) : {};
};

export const saveTimestampAnalysis = (videoUrl: string, seconds: number) => {
  const all = getTimestampAnalyses();
  all[videoUrl] = seconds;
  localStorage.setItem('bjj-timestamps', JSON.stringify(all));
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const callClaude = async (prompt: string, apiKey: string, retries = 3): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    const err = await res.json().catch(() => ({}));
    const status = res.status;

    // Rate limit or overloaded — wait and retry
    if ((status === 429 || status === 529) && attempt < retries) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt + 1) * 2000;
      await sleep(wait);
      continue;
    }

    throw new Error(err?.error?.message || `HTTP ${status}`);
  }
  throw new Error('Max retries exceeded');
};

// Parse "1:23" or "1:23:45" into seconds
const tsToSeconds = (ts: string): number => {
  const parts = ts.trim().split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// Extract chapter lines from a YouTube description
// Matches patterns like: "0:00 Intro", "1:23 - Triangle", "(2:45) Guard Pass", "3:45:12 something"
const extractChapters = (description: string): { ts: string; label: string }[] => {
  const lines = description.split('\n');
  const chapterRe = /^\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-–—]?\s*(.+)$/;
  const chapters: { ts: string; label: string }[] = [];
  for (const line of lines) {
    const match = line.trim().match(chapterRe);
    if (match) {
      chapters.push({ ts: match[1], label: match[2].trim() });
    }
  }
  return chapters;
};

export const analyzeTimestampForVideo = async (
  videoTitle: string,
  videoDescription: string,
  technique: string,
  position: string,
  apiKey: string
): Promise<number | null> => {
  // Step 1: try to extract chapters from description directly
  const chapters = extractChapters(videoDescription);

  if (chapters.length === 0) {
    // No chapter markers in description — skip Claude call, not enough info
    // Only proceed if description mentions the technique by name
    const desc = videoDescription.toLowerCase();
    const tech = technique.toLowerCase();
    if (!desc.includes(tech) && desc.length < 100) {
      return null;
    }
  }

  // Step 2: Build prompt — send chapters if found, else send first 1500 chars of description
  const contextBlock = chapters.length > 0
    ? `Chapters found in description:\n${chapters.map((c) => `${c.ts} - ${c.label}`).join('\n')}`
    : `Description (no chapters detected):\n${videoDescription.slice(0, 1500)}`;

  const prompt = `You are a No-Gi BJJ expert. Find the timestamp where "${technique}" (position: ${position}) is demonstrated in this YouTube video.

Title: "${videoTitle}"

${contextBlock}

Rules:
- If chapters are listed, pick the one most relevant to "${technique}" / "${position}"
- If the whole video is about this technique, return "0:00"
- If you cannot determine a relevant timestamp, return "SKIP"
- Respond with ONLY a timestamp like "3:45" or "SKIP" — nothing else`;

  const text = await callClaude(prompt, apiKey);
  const clean = text.trim();

  if (!clean || clean === 'SKIP' || clean.toLowerCase().includes('skip')) return null;

  // Extract first MM:SS or H:MM:SS pattern from response
  const tsMatch = clean.match(/\d{1,2}:\d{2}(?::\d{2})?/);
  if (!tsMatch) return null;

  return tsToSeconds(tsMatch[0]);
};

export const generateGameForTechnique = async (
  technique: string,
  position: string,
  level: string,
  apiKey: string
): Promise<GameData> => {
  const prompt = `You are a No-Gi BJJ instructor designing a competitive positional game for class.

Technique: "${technique}"
Position: "${position}"
Student Level: ${level}

Create a 2-player positional game that trains this technique. One player is on TOP, one is on BOTTOM.

Respond with a JSON object only, no markdown, no explanation:
{
  "situation": "<one sentence: the starting scenario/setup>",
  "topObjective": "<what the TOP player must accomplish — be specific, 1-2 sentences>",
  "bottomObjective": "<what the BOTTOM player must accomplish — be specific, 1-2 sentences>",
  "coachCue": "<single most critical coaching point that separates good from sloppy execution>",
  "duration": "<e.g., '3-min rounds, first to 3 reps'>",
  "scoring": "<e.g., '1pt per successful finish, 2pt for clean setup + finish'>"
}

Rules:
- No gi grips (no collar, no sleeve, no lapel)
- Winning condition must reward correct technique, not just athleticism
- Keep rules simple enough to explain in 60 seconds
- Use standard BJJ/grappling English terminology`;

  const text = await callClaude(prompt, apiKey);

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON response from Claude');
  }
};
