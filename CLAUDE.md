# 450 Jiu-Jitsu Games Lab — Project Context

## What this is
A single-file HTML/CSS/JS web app — a Jiu-Jitsu technique library with ~1000 YouTube videos.
File: `index.html` (deployed at https://stfbel.github.io/450JJ/)

## Tech stack
- Pure HTML/CSS/JS — no framework, no build step
- All data is inline in a `const DATA = [...]` array in the `<script>` tag
- Fonts: Bebas Neue (display), Space Grotesk (body), JetBrains Mono
- Dark/light theme via `data-theme` attribute on `<html>`

## Data structure
Each entry in DATA:
```js
{
  position: "Closed Guard",       // e.g. Mount, Back Control, Half Guard, Side Control...
  technique: "Triangle Choke",
  format: "Both" | "Gi" | "No-Gi",
  level: "White" | "Blue" | "Advanced",
  category: "Instruction" | "Live" | "Competition",
  game: "...",                    // short description of the positional game
  coach: "...",                   // one coaching cue
  videos: [
    { title, url, creator, stars: 1-5 }
  ]
}
```

## UI features
- Filter by: search text, format (Gi/No-Gi/Both), level, category, position pills
- 3 pedagogical tracks: Instruction / Live / Competition
- Favorites (☆) + per-video notes saved to localStorage
- Coach Notebook sidebar showing favorited videos with notes
- Stats counters: techniques, videos, favs, notes
- Sort: by position, rating, or level
- Light/dark theme toggle

## Skills to use in this project
- `/bjj-instructor` — for analyzing techniques, creating games, building lesson plans based on the data
- `/frontend-design` — for UI/UX improvements, new features, visual redesigns

## Owner
450 Jiu-Jitsu — No-Gi school. Mixed-level students (white to advanced).
