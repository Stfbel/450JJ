import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

// ─── Google OAuth2 setup ───────────────────────────────────────────────────────

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Restore saved refresh token on startup
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

// ─── Auth routes ───────────────────────────────────────────────────────────────

// Step 1: redirect user to Google login
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// Step 2: Google redirects back here with a code
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Show the refresh token so you can save it in Railway env vars
    res.send(`
      <h2>✅ Auth successful!</h2>
      <p>Copy this refresh token into Railway as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
      <textarea rows="3" style="width:100%;font-family:monospace">${tokens.refresh_token || '(already set — check logs)'}</textarea>
      <p>Once saved in Railway, you can close this page.</p>
    `);

    console.log('GOOGLE_REFRESH_TOKEN:', tokens.refresh_token);
  } catch (err) {
    res.status(500).send('Auth error: ' + err.message);
  }
});

// Auth status check
app.get('/auth/status', (req, res) => {
  const hasToken = !!process.env.GOOGLE_REFRESH_TOKEN ||
    !!oauth2Client.credentials?.refresh_token;
  res.json({ authenticated: hasToken });
});

// ─── Transcript route ──────────────────────────────────────────────────────────

app.get('/api/transcript/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    // List available caption tracks
    const captionList = await youtube.captions.list({
      part: ['snippet'],
      videoId,
    });

    const tracks = captionList.data.items || [];
    if (tracks.length === 0) {
      return res.status(404).json({ error: 'No captions available for this video' });
    }

    // Prefer English track, fallback to first available
    const track =
      tracks.find(t => t.snippet?.language === 'en') ||
      tracks.find(t => t.snippet?.language?.startsWith('en')) ||
      tracks[0];

    // Download the caption track as SRT
    const captionDownload = await youtube.captions.download({
      id: track.id,
      tfmt: 'srt',
    }, { responseType: 'text' });

    const srt = captionDownload.data;

    // Parse SRT into [{start, text}] array
    const entries = parseSRT(srt);

    res.json({
      videoId,
      language: track.snippet?.language,
      trackName: track.snippet?.name,
      entries,
    });

  } catch (err) {
    console.error('Transcript error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Analyze timestamp route ───────────────────────────────────────────────────

app.post('/api/analyze-timestamp', async (req, res) => {
  const { videoId, technique, position, claudeApiKey } = req.body;

  if (!videoId || !technique || !position) {
    return res.status(400).json({ error: 'Missing videoId, technique, or position' });
  }

  const apiKey = claudeApiKey || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Missing Claude API key' });
  }

  try {
    // 1. Get transcript
    const transcriptRes = await fetch(`http://localhost:${PORT}/api/transcript/${videoId}`);
    if (!transcriptRes.ok) {
      const err = await transcriptRes.json();
      return res.status(404).json({ error: err.error || 'Transcript unavailable' });
    }
    const { entries } = await transcriptRes.json();

    // 2. Build chunked context for Claude
    const chunks = buildChunks(entries, 30);
    const formatted = chunks
      .map(c => `[${toTimestamp(c.start)}] ${c.text.slice(0, 200)}`)
      .join('\n');

    // 3. Ask Claude
    const prompt = `You are a No-Gi BJJ expert. Find the timestamp where "${technique}" (position: ${position}) starts being demonstrated.

Transcript (format [MM:SS] text):
---
${formatted.slice(0, 4000)}
---

Rules:
- Return the timestamp where the instructor begins teaching "${technique}"
- If the whole video is about this from the start, return "0:00"
- If not found, return "SKIP"
- Respond with ONLY a timestamp like "3:45" or "SKIP"`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 64,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text?.trim() || 'SKIP';

    if (text === 'SKIP' || !text.match(/\d+:\d+/)) {
      return res.json({ videoId, timestamp: null, message: 'Technique not found in transcript' });
    }

    const match = text.match(/\d{1,2}:\d{2}(?::\d{2})?/);
    const seconds = match ? toSeconds(match[0]) : null;

    res.json({ videoId, technique, position, timestampStr: match?.[0], seconds });

  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Batch analyze route ───────────────────────────────────────────────────────

app.post('/api/analyze-timestamps-batch', async (req, res) => {
  const { videos, claudeApiKey } = req.body;
  // videos: [{ videoId, url, technique, position }]

  if (!Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ error: 'Missing videos array' });
  }

  const results = {};
  const errors = [];

  for (const v of videos) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/analyze-timestamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: v.videoId,
          technique: v.technique,
          position: v.position,
          claudeApiKey,
        }),
      });
      const data = await r.json();
      if (data.seconds !== null && data.seconds !== undefined) {
        results[v.url] = data.seconds;
      }
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      errors.push({ videoId: v.videoId, error: err.message });
    }
  }

  res.json({ results, errors, found: Object.keys(results).length });
});

// ─── Health check ──────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: '450JJ Timestamp Backend',
    authenticated: !!process.env.GOOGLE_REFRESH_TOKEN,
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseSRT(srt) {
  const entries = [];
  const blocks = srt.trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!match) continue;
    const [h, m, s] = match[1].split(/[:,]/).map(Number);
    const start = h * 3600 + m * 60 + s;
    const text = lines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) entries.push({ start, text });
  }
  return entries;
}

function buildChunks(entries, windowSeconds) {
  const chunks = [];
  let current = null;
  for (const e of entries) {
    if (!current || e.start - current.start >= windowSeconds) {
      if (current) chunks.push(current);
      current = { start: e.start, text: '' };
    }
    current.text += ' ' + e.text;
  }
  if (current) chunks.push(current);
  return chunks;
}

function toTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ 450JJ Backend running on port ${PORT}`);
  console.log(`   Auth: http://localhost:${PORT}/auth/google`);
  console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✓ configured' : '✗ missing GOOGLE_CLIENT_ID'}`);
});
