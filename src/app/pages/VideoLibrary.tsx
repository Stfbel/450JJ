import { useState, useMemo } from 'react';
import { Search, Plus, X, Play, ExternalLink, Youtube, Loader2, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';
import { getVideos, addVideo, deleteVideo, isAdminActive } from '../utils/libraryStorage';
import { LibraryVideo, VideoType, SkillLevel, GiFormat } from '../data/library';
import { getYouTubeThumbnail, getYouTubeVideoId } from '../utils/youtube';
import { techniques } from '../data/techniques';
import { getSyncedVideos, getSyncedKey, getApiKey, searchYouTube, YouTubeSearchResult } from '../utils/youtubeApi';
import { Technique } from '../data/techniques';

// ─── Unified video type for display ──────────────────────────────────────────

type VideoSource = 'library' | 'technique';

interface UnifiedVideo {
  id: string;
  title: string;
  url: string;
  creator: string;
  source: VideoSource;
  type: string;
  level: string;
  format: string;
  tags: string[];
  // technique-specific
  techniqueName?: string;
  position?: string;
  stars?: number;
}

function techniqueVideosFlat(): UnifiedVideo[] {
  const syncedVideos = getSyncedVideos();
  const seen = new Set<string>();
  const result: UnifiedVideo[] = [];

  for (const t of techniques) {
    const key = getSyncedKey(t.technique, t.position);
    const vids = syncedVideos[key] || t.videos;
    for (const v of vids) {
      const url = v.url;
      if (seen.has(url)) continue;
      seen.add(url);
      result.push({
        id: `technique::${url}`,
        title: v.title,
        url,
        creator: v.creator || '',
        source: 'technique',
        type: t.category === 'Instruction' ? 'Technique' : t.category === 'Live' ? 'Live Examples' : 'Discussion',
        level: t.level === 'White' ? 'Beginner' : t.level === 'Blue' ? 'Intermediate' : 'Advanced',
        format: t.format,
        tags: [t.position],
        techniqueName: t.technique,
        position: t.position,
        stars: v.stars,
      });
    }
  }
  return result;
}

// ─── YouTube search panel ─────────────────────────────────────────────────────

function YouTubeSearchPanel({
  onAddToLibrary,
  libraryUrls,
}: {
  onAddToLibrary: (result: YouTubeSearchResult) => void;
  libraryUrls: Set<string>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiKey = getApiKey();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (!apiKey) {
      setError('Add your YouTube API key in the Sync panel first (Techniques page).');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const res = await searchYouTube(query.trim(), apiKey, 20);
      setResults(res);
      if (res.length === 0) setError('No results found.');
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-red-500/5">
        <Youtube className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-sm font-bold">Search YouTube & Add to Library</span>
        {!apiKey && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500 font-medium">
            <Key className="w-3 h-3" /> API key required (Sync panel)
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube — e.g. heel hook no-gi tutorial..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error && (
          <p className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((r) => {
              const thumb = `https://img.youtube.com/vi/${r.videoId}/mqdefault.jpg`;
              const inLibrary = libraryUrls.has(r.url);
              return (
                <div key={r.videoId} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/30 transition-all">
                  <div className="w-20 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold line-clamp-2 leading-snug">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.creator}</p>
                  </div>
                  <button
                    onClick={() => onAddToLibrary(r)}
                    disabled={inLibrary}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inLibrary
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default'
                        : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                    }`}
                  >
                    {inLibrary ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add video modal (manual) ─────────────────────────────────────────────────

function AddVideoModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [form, setForm] = useState({
    title: '', url: '', description: '',
    type: 'Technique' as VideoType,
    level: 'Beginner' as SkillLevel,
    format: 'No-Gi' as GiFormat,
    tags: '', duration: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) { toast.error('Title and URL are required'); return; }
    addVideo({
      title: form.title.trim(), url: form.url.trim(), description: form.description.trim(),
      type: form.type, level: form.level, format: form.format,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      duration: form.duration.trim() || undefined,
    });
    onAdd();
    toast.success('Video added to library');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider">Add Video Manually</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">YouTube URL *</label>
            <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Video title" className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Type', value: form.type, key: 'type', options: ['Technique','Rolls','Troubleshooting','Live Examples','Discussion'] },
              { label: 'Level', value: form.level, key: 'level', options: ['Beginner','Intermediate','Advanced'] },
              { label: 'Format', value: form.format, key: 'format', options: ['Gi','No-Gi','Both'] },
            ].map(({ label, value, key, options }) => (
              <div key={key}>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
                <select value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="guard, sweep..." className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Duration</label>
              <input type="text" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="12:34" className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all">Add Video</button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border bg-secondary font-semibold text-sm hover:bg-muted transition-all">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ video, admin, onDelete, onAddToLibrary, inLibrary }: {
  video: UnifiedVideo;
  admin: boolean;
  onDelete?: () => void;
  onAddToLibrary?: () => void;
  inLibrary?: boolean;
}) {
  const thumbnail = getYouTubeThumbnail(video.url);
  const videoId = getYouTubeVideoId(video.url);
  const watchUrl = videoId ? `https://youtube.com/watch?v=${videoId}` : video.url;

  const sourceLabel = video.source === 'technique'
    ? { text: video.techniqueName!, color: 'bg-primary/10 text-primary border-primary/30' }
    : { text: video.type, color: 'bg-muted text-muted-foreground border-border' };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
      <div className="relative aspect-video bg-muted">
        {thumbnail ? (
          <>
            <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
              <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl">
                  <Play className="w-7 h-7 text-primary-foreground fill-current ml-0.5" />
                </div>
              </a>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-10 h-10 opacity-20" />
          </div>
        )}
        {video.source === 'technique' && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Technique
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <a href={watchUrl} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-sm leading-snug text-foreground hover:text-primary transition-colors line-clamp-2 flex-1">
            {video.title}
          </a>
          <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-0.5">
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
          </a>
        </div>
        {video.creator && <p className="text-[10px] text-muted-foreground mb-2">{video.creator}</p>}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border truncate max-w-[140px] ${sourceLabel.color}`}>
            {sourceLabel.text}
          </span>
          {video.position && video.source === 'technique' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground truncate max-w-[120px]">
              {video.position}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{video.level}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{video.format}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {video.source === 'technique' && !inLibrary && admin && (
            <button onClick={onAddToLibrary}
              className="text-[10px] font-bold text-primary hover:text-primary/80 border border-primary/30 hover:bg-primary/10 px-2 py-1 rounded-lg transition-all">
              + Save to Library
            </button>
          )}
          {video.source === 'technique' && inLibrary && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ In Library</span>
          )}
          {video.source === 'library' && admin && onDelete && (
            <button onClick={onDelete} className="text-[10px] text-destructive/60 hover:text-destructive transition-colors font-medium">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const VIDEO_TYPES = ['Technique', 'Rolls', 'Troubleshooting', 'Live Examples', 'Discussion'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const GI_FORMATS = ['Gi', 'No-Gi', 'Both'];

type SourceFilter = 'all' | 'library' | 'technique';

export function VideoLibrary() {
  const admin = isAdminActive();
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>(getVideos);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);

  const refreshLibrary = () => setLibraryVideos(getVideos());

  // Flatten all technique videos
  const techniqueVideos = useMemo(() => techniqueVideosFlat(), []);

  // All library videos as unified format
  const libraryAsUnified = useMemo<UnifiedVideo[]>(() =>
    libraryVideos.map((v) => ({
      id: v.id,
      title: v.title,
      url: v.url,
      creator: v.description,
      source: 'library' as VideoSource,
      type: v.type,
      level: v.level,
      format: v.format,
      tags: v.tags,
    })),
    [libraryVideos]
  );

  // Set of URLs already in library (for duplicate detection)
  const libraryUrls = useMemo(() => new Set(libraryVideos.map((v) => v.url)), [libraryVideos]);

  // Combined: library first, then technique videos not already in library
  const allVideos = useMemo<UnifiedVideo[]>(() => {
    const techNotInLib = techniqueVideos.filter((v) => !libraryUrls.has(v.url));
    return [...libraryAsUnified, ...techNotInLib];
  }, [libraryAsUnified, techniqueVideos, libraryUrls]);

  const filtered = useMemo(() => {
    let result = allVideos;
    if (sourceFilter !== 'all') result = result.filter((v) => v.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v) =>
        v.title.toLowerCase().includes(q) ||
        v.creator.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q)) ||
        (v.techniqueName?.toLowerCase().includes(q)) ||
        (v.position?.toLowerCase().includes(q))
      );
    }
    if (typeFilter) result = result.filter((v) => v.type === typeFilter);
    if (levelFilter) result = result.filter((v) => v.level === levelFilter);
    if (formatFilter) result = result.filter((v) => v.format === formatFilter);
    return result;
  }, [allVideos, search, typeFilter, levelFilter, formatFilter, sourceFilter]);

  const handleDeleteLibraryVideo = (id: string) => {
    if (!confirm('Remove this video from the library?')) return;
    deleteVideo(id);
    refreshLibrary();
    toast.success('Video removed');
  };

  const handleAddTechniqueToLibrary = (video: UnifiedVideo) => {
    addVideo({
      title: video.title,
      url: video.url,
      description: video.creator || '',
      type: (video.type || 'Technique') as VideoType,
      level: (video.level || 'Beginner') as SkillLevel,
      format: (video.format || 'No-Gi') as GiFormat,
      tags: video.techniqueName ? [video.techniqueName, ...(video.position ? [video.position] : [])] : video.tags,
    });
    refreshLibrary();
    toast.success('Saved to Library', { description: video.title });
  };

  const handleAddYouTubeResult = (result: YouTubeSearchResult) => {
    addVideo({
      title: result.title,
      url: result.url,
      description: result.creator,
      type: 'Technique',
      level: 'Beginner',
      format: 'No-Gi',
      tags: [],
    });
    refreshLibrary();
    toast.success('Added to Library', { description: result.title });
  };

  const hasFilters = search || typeFilter || levelFilter || formatFilter || sourceFilter !== 'all';

  const stats = {
    library: libraryVideos.length,
    technique: techniqueVideos.length,
    total: allVideos.length,
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wider leading-none mb-1">Video Library</h1>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span><span className="text-foreground font-bold">{stats.library}</span> in library</span>
            <span><span className="text-foreground font-bold">{stats.technique}</span> from techniques</span>
            <span><span className="text-foreground font-bold">{stats.total}</span> total</span>
          </div>
        </div>
        {admin && (
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => setShowYouTubeSearch(!showYouTubeSearch)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm transition-all ${
                showYouTubeSearch
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Youtube className="w-4 h-4" />
              YouTube Search
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              <Plus className="w-4 h-4" />
              Add Manually
            </button>
          </div>
        )}
      </div>

      {/* YouTube Search Panel */}
      {showYouTubeSearch && (
        <div className="mb-6">
          <YouTubeSearchPanel
            onAddToLibrary={handleAddYouTubeResult}
            libraryUrls={libraryUrls}
          />
        </div>
      )}

      {/* Source tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'library', 'technique'] as SourceFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              sourceFilter === s
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {s === 'all' ? 'All' : s === 'library' ? 'My Library' : 'From Techniques'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, technique, position..."
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All Types</option>
          {VIDEO_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All Levels</option>
          {SKILL_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">All Formats</option>
          {GI_FORMATS.map((f) => <option key={f}>{f}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setLevelFilter(''); setFormatFilter(''); setSourceFilter('all'); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border bg-secondary text-sm font-medium hover:bg-muted transition-all"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-xl border border-border">
          <div className="text-6xl mb-4 opacity-30">🎥</div>
          <p className="text-lg font-semibold mb-2">No videos found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                admin={admin}
                inLibrary={video.source === 'technique' ? libraryUrls.has(video.url) : undefined}
                onDelete={video.source === 'library' ? () => handleDeleteLibraryVideo(video.id) : undefined}
                onAddToLibrary={video.source === 'technique' ? () => handleAddTechniqueToLibrary(video) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <AddVideoModal onClose={() => setShowAddModal(false)} onAdd={refreshLibrary} />
      )}
    </div>
  );
}
