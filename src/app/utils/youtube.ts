// Format seconds to MM:SS or H:MM:SS
export const formatTimestamp = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Parse "1:23" or "1:23:45" or "83" into seconds
export const parseTimestamp = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Pure number = seconds
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  // MM:SS or H:MM:SS
  const parts = trimmed.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
};

// Build YouTube URL with optional timestamp
export const buildVideoUrl = (url: string, timestamp?: number): string => {
  if (!timestamp) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${timestamp}s`;
};

export const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

export const getYouTubeThumbnail = (url: string, quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
};
