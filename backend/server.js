import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const VIDEOS_FILE = join(DATA_DIR, 'videos.json');
const GAMES_FILE = join(DATA_DIR, 'games.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// In-memory store (survives requests, resets on redeploy)
let sharedVideos = {};
let sharedGames = {};

// Load from file on startup
try { sharedVideos = JSON.parse(fs.readFileSync(VIDEOS_FILE, 'utf8')); } catch {}
try { sharedGames = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8')); } catch {}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*' }));

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const YT_KEY = process.env.YOUTUBE_API_KEY;
const CLAUDE_KEY = process.env.CLAUDE_API_KEY;
const SYNC_TOKEN = process.env.SYNC_TOKEN;

// ─── Google OAuth2 (kept for future transcript feature) ───────────────────────

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send(`<h2>✅ Auth successful!</h2><p>Refresh token:</p><textarea rows="3" style="width:100%;font-family:monospace">${tokens.refresh_token}</textarea>`);
    console.log('GOOGLE_REFRESH_TOKEN:', tokens.refresh_token);
  } catch (err) {
    res.status(500).send('Auth error: ' + err.message);
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '450JJ Backend',
    youtube: !!YT_KEY,
    claude: !!CLAUDE_KEY,
  });
});

// ─── Shared data — public read, token-protected write ─────────────────────────

app.get('/api/data/videos', (req, res) => {
  res.json(sharedVideos);
});

app.get('/api/data/games', (req, res) => {
  res.json(sharedGames);
});

const requireSyncToken = (req, res, next) => {
  if (!SYNC_TOKEN) return res.status(503).json({ error: 'SYNC_TOKEN not configured on server' });
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${SYNC_TOKEN}`) return res.status(401).json({ error: 'Invalid sync token' });
  next();
};

app.post('/api/data/videos', requireSyncToken, (req, res) => {
  sharedVideos = req.body;
  try { fs.writeFileSync(VIDEOS_FILE, JSON.stringify(sharedVideos)); } catch {}
  res.json({ ok: true, count: Object.keys(sharedVideos).length });
});

app.post('/api/data/games', requireSyncToken, (req, res) => {
  sharedGames = req.body;
  try { fs.writeFileSync(GAMES_FILE, JSON.stringify(sharedGames)); } catch {}
  res.json({ ok: true, count: Object.keys(sharedGames).length });
});

// ─── YouTube Search ────────────────────────────────────────────────────────────

app.get('/api/youtube/search', async (req, res) => {
  const { q, maxResults = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  if (!YT_KEY) return res.status(500).json({ error: 'YouTube API key not configured on server' });

  try {
    const params = new URLSearchParams({
      part: 'snippet', q, type: 'video',
      maxResults: String(maxResults),
      relevanceLanguage: 'en',
      key: YT_KEY,
    });
    const r = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || `HTTP ${r.status}` });

    const items = (data.items || [])
      .filter(item => item.id?.videoId)
      .map(item => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        videoId: item.id.videoId,
        creator: item.snippet.channelTitle,
        stars: 3,
      }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── YouTube: Search per technique (SSE stream) ───────────────────────────────

app.post('/api/youtube/search-techniques', async (req, res) => {
  const { techniques, maxResults = 5 } = req.body;
  if (!Array.isArray(techniques) || techniques.length === 0) {
    return res.status(400).json({ error: 'Missing techniques array' });
  }
  if (!YT_KEY) return res.status(500).json({ error: 'YouTube API key not configured on server' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const results = {};
  let errors = 0;

  for (let i = 0; i < techniques.length; i++) {
    const t = techniques[i];
    const key = `${t.position}::${t.technique}`;
    const query = `${t.technique} ${t.position} no-gi bjj`;

    res.write(`data: ${JSON.stringify({ type: 'progress', done: i, total: techniques.length, technique: t.technique, position: t.position })}\n\n`);

    try {
      const params = new URLSearchParams({
        part: 'snippet', q: query, type: 'video',
        maxResults: String(maxResults), relevanceLanguage: 'en', key: YT_KEY,
      });
      const r = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
      const data = await r.json();

      if (!r.ok) {
        errors++;
        res.write(`data: ${JSON.stringify({ type: 'error', technique: t.technique, error: data?.error?.message || `HTTP ${r.status}` })}\n\n`);
        if (r.status === 403) break; // quota exceeded — stop early
        continue;
      }

      const videos = (data.items || [])
        .filter(item => item.id?.videoId)
        .map((item, idx) => ({
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          videoId: item.id.videoId,
          creator: item.snippet.channelTitle,
          stars: Math.max(1, maxResults - idx),
        }));

      if (videos.length > 0) {
        results[key] = videos;
        res.write(`data: ${JSON.stringify({ type: 'result', key, videos })}\n\n`);
      }
    } catch (err) {
      errors++;
      res.write(`data: ${JSON.stringify({ type: 'error', technique: t.technique, error: err.message })}\n\n`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  res.write(`data: ${JSON.stringify({ type: 'done', results, errors, total: techniques.length })}\n\n`);
  res.end();
});

// ─── Claude: Generate game for one technique ──────────────────────────────────

app.post('/api/claude/generate-game', async (req, res) => {
  const { technique, position, level } = req.body;
  if (!technique || !position) return res.status(400).json({ error: 'Missing technique or position' });
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key not configured on server' });

  const prompt = `No-Gi BJJ. Technique: "${technique}" from "${position}". Level: ${level || 'Mixed'}.
Output JSON only — no markdown, no explanation. Keep each value under 15 words. All 7 keys required:
{"positional":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"constraintBased":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"gripEngagement":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"continuousFlow":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"problemSolving":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"microGame":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"competitive":{"setup":"","objective":"","rules":"","coachCue":"","duration":""}}
No gi grips. Be specific and actionable.`;

  try {
    const text = await callClaude(prompt, 3, 2048);
    try {
      res.json(JSON.parse(text));
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { res.json(JSON.parse(match[0])); }
        catch { res.status(500).json({ error: 'Invalid JSON from Claude', raw: text.slice(0, 200) }); }
      } else {
        res.status(500).json({ error: 'Invalid JSON from Claude', raw: text.slice(0, 200) });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Claude: Generate games for all techniques (batch) ────────────────────────

app.post('/api/claude/generate-games-batch', async (req, res) => {
  const { techniques } = req.body;
  if (!Array.isArray(techniques)) return res.status(400).json({ error: 'Missing techniques array' });
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key not configured on server' });

  // Use SSE to stream progress back to client
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const results = {};
  let errors = 0;

  for (let i = 0; i < techniques.length; i++) {
    const t = techniques[i];
    const key = `${t.position}::${t.technique}`;

    res.write(`data: ${JSON.stringify({ type: 'progress', done: i, total: techniques.length, technique: t.technique, position: t.position })}\n\n`);

    try {
      const prompt = `No-Gi BJJ. Technique: "${t.technique}" from "${t.position}". Level: ${t.level || 'Mixed'}.
Output JSON only — no markdown, no explanation. Keep each value under 15 words. All 7 keys required:
{"positional":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"constraintBased":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"gripEngagement":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"continuousFlow":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"problemSolving":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"microGame":{"setup":"","objective":"","rules":"","coachCue":"","duration":""},"competitive":{"setup":"","objective":"","rules":"","coachCue":"","duration":""}}
No gi grips. Be specific and actionable.`;

      const text = await callClaude(prompt, 3, 2048);
      let gameData;
      try {
        gameData = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try { gameData = JSON.parse(m[0]); } catch (e2) {
            console.error(`JSON parse failed for ${t.technique}:`, text.slice(0, 200));
          }
        } else {
          console.error(`No JSON found for ${t.technique}:`, text.slice(0, 200));
        }
      }

      if (gameData) results[key] = gameData;
      else {
        errors++;
        res.write(`data: ${JSON.stringify({ type: 'error', technique: t.technique, error: 'Invalid JSON from Claude' })}\n\n`);
        continue;
      }
    } catch (err) {
      errors++;
      res.write(`data: ${JSON.stringify({ type: 'error', technique: t.technique, error: err.message })}\n\n`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  res.write(`data: ${JSON.stringify({ type: 'done', results, errors, total: techniques.length })}\n\n`);
  res.end();
});

// ─── Claude helper ─────────────────────────────────────────────────────────────

async function callClaude(prompt, retries = 3, maxTokens = 512) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    const err = await res.json().catch(() => ({}));
    if ((res.status === 429 || res.status === 529) && attempt < retries) {
      const wait = Math.pow(2, attempt + 1) * 2000;
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  throw new Error('Max retries exceeded');
}

// ─── Serve frontend (Railway deployment) ──────────────────────────────────────

const distPath = join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));
}

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ 450JJ Backend running on port ${PORT}`);
  console.log(`   YouTube API: ${YT_KEY ? '✓' : '✗ missing YOUTUBE_API_KEY'}`);
  console.log(`   Claude API:  ${CLAUDE_KEY ? '✓' : '✗ missing CLAUDE_API_KEY'}`);
});
