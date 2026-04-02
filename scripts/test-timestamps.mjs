/**
 * Test script: fetch YouTube transcript → Claude finds the technique timestamp
 *
 * Usage:
 *   node scripts/test-timestamps.mjs <youtube-url> <technique> <position> <claude-api-key>
 *
 * Example:
 *   node scripts/test-timestamps.mjs "https://youtube.com/watch?v=XYZ" "Triangle Choke" "Closed Guard" "sk-ant-..."
 */

import { YoutubeTranscript } from '../node_modules/youtube-transcript/dist/youtube-transcript.esm.js';

const [,, url, technique, position, claudeKey] = process.argv;

if (!url || !technique || !position || !claudeKey) {
  console.error('Usage: node scripts/test-timestamps.mjs <url> <technique> <position> <claude-key>');
  process.exit(1);
}

// Extract video ID from any YouTube URL format
function extractVideoId(url) {
  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /embed\/([^?&]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function secondsToTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function getTranscript(videoId) {
  try {
    const entries = await YoutubeTranscript.fetchTranscript(videoId);
    return entries.map(e => ({
      text: e.text.replace(/\n/g, ' '),
      start: Math.round(e.offset / 1000), // ms → seconds
    }));
  } catch (err) {
    throw new Error(`Transcript unavailable: ${err.message}`);
  }
}

async function askClaude(prompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

async function findTimestamp(transcript, technique, position) {
  // Group transcript into 30-second chunks with timestamps
  const chunks = [];
  let current = { start: 0, text: '' };
  for (const entry of transcript) {
    if (entry.start - current.start >= 30 && current.text) {
      chunks.push(current);
      current = { start: entry.start, text: '' };
    }
    current.text += ' ' + entry.text;
  }
  if (current.text) chunks.push(current);

  // Format for Claude
  const formatted = chunks
    .map(c => `[${secondsToTimestamp(c.start)}] ${c.text.trim().slice(0, 200)}`)
    .join('\n');

  const prompt = `You are a No-Gi BJJ expert. Find the timestamp where "${technique}" (position: ${position}) starts being demonstrated in this video transcript.

Transcript (format: [MM:SS] text):
---
${formatted.slice(0, 4000)}
---

Rules:
- Find where the instructor starts teaching "${technique}"
- If the whole video covers this technique from the start, return "0:00"
- If it's not in the transcript, return "SKIP"
- Respond with ONLY a timestamp like "3:45" or "SKIP"`;

  const response = await askClaude(prompt, claudeKey);
  return response;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const videoId = extractVideoId(url);
if (!videoId) {
  console.error('❌ Could not extract video ID from URL:', url);
  process.exit(1);
}

console.log(`\n🎥 Video ID: ${videoId}`);
console.log(`🥋 Technique: ${technique} — ${position}`);
console.log('⏳ Fetching transcript...\n');

try {
  const transcript = await getTranscript(videoId);
  console.log(`✅ Transcript: ${transcript.length} entries (${secondsToTimestamp(transcript[transcript.length - 1]?.start || 0)} total)`);

  // Show a sample
  console.log('\nSample (first 5 entries):');
  transcript.slice(0, 5).forEach(e => {
    console.log(`  [${secondsToTimestamp(e.start)}] ${e.text}`);
  });

  console.log('\n🤖 Asking Claude...\n');
  const result = await findTimestamp(transcript, technique, position);

  if (result === 'SKIP' || !result) {
    console.log('⊘ Claude could not find the technique in this transcript.');
  } else {
    console.log(`✅ Timestamp found: ${result}`);
    console.log(`\n👉 YouTube link: https://youtube.com/watch?v=${videoId}&t=${result.replace(':', 'm')}s`);
  }
} catch (err) {
  console.error('❌ Error:', err.message);
}
