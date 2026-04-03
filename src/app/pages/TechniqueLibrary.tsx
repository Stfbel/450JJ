import { useState, useMemo, useEffect } from 'react';
import { Search, Star, X, SlidersHorizontal, Sparkles, BookOpen, Command } from 'lucide-react';
import { toast } from 'sonner';
import { techniques } from '../data/techniques';
import { TechniqueCard } from '../components/TechniqueCard';
import { Notebook } from '../components/Notebook';
import { NotebookDrawer } from '../components/NotebookDrawer';
import { CommandPalette } from '../components/CommandPalette';
import { Tooltip } from '../components/Tooltip';
import { SyncPanel } from '../components/SyncPanel';
import { getSyncedVideos, getSyncedKey } from '../utils/youtubeApi';
import { getSyncedGames } from '../utils/claudeApi';
import {
  getFavorites,
  toggleFavorite as toggleFavoriteStorage,
  saveNote as saveNoteStorage,
  getNotes,
  deleteNote as deleteNoteStorage,
} from '../utils/storage';

interface TechniqueLibraryProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function TechniqueLibrary({ theme, onToggleTheme }: TechniqueLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'position' | 'stars' | 'level'>('position');
  const [favorites, setFavorites] = useState<Set<string>>(getFavorites());
  const [notes, setNotes] = useState(getNotes());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotebookDrawer, setShowNotebookDrawer] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [syncedVideos, setSyncedVideos] = useState(getSyncedVideos);
  const [syncedGames, setSyncedGames] = useState(getSyncedGames);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setShowNotebookDrawer(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        onToggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleTheme]);

  const handleToggleFavorite = (videoUrl: string, videoTitle: string) => {
    const newFavorites = toggleFavoriteStorage(videoUrl);
    const isFavorite = newFavorites.has(videoUrl);
    setFavorites(newFavorites);

    if (isFavorite) {
      toast.success('Added to favorites', { description: videoTitle, duration: 2000 });
    } else {
      toast.info('Removed from favorites', { description: videoTitle, duration: 2000 });
    }
  };

  const handleSaveNote = (
    videoUrl: string,
    note: string,
    videoTitle: string,
    technique: string,
    position: string
  ) => {
    saveNoteStorage({ videoUrl, videoTitle, technique, position, note, timestamp: Date.now() });
    setNotes(getNotes());
    toast.success('Note saved', { description: videoTitle, duration: 2000 });
  };

  const handleDeleteNote = (videoUrl: string) => {
    deleteNoteStorage(videoUrl);
    setNotes(getNotes());
    toast.success('Note deleted', { duration: 2000 });
  };

  const handleClearAllNotes = () => {
    if (confirm('Clear all notes? This cannot be undone.')) {
      localStorage.removeItem('bjj-notes');
      setNotes([]);
      toast.success('All notes cleared', { duration: 2000 });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFormatFilter('');
    setLevelFilter('');
    setCategoryFilter('');
    setPositionFilter('');
    setSortBy('position');
    setShowFavoritesOnly(false);
    toast.info('Filters cleared', { duration: 2000 });
  };

  const positions = useMemo(() => {
    const uniquePositions = [...new Set(techniques.map((t) => t.position))];
    return uniquePositions.sort();
  }, []);

  const mergedTechniques = useMemo(() => {
    return techniques.map((t) => {
      const key = getSyncedKey(t.technique, t.position);
      const syncedVids = syncedVideos[key];
      const syncedGame = syncedGames[key];
      return {
        ...t,
        ...(syncedVids && syncedVids.length > 0 ? { videos: syncedVids } : {}),
        ...(syncedGame ? { gameData: syncedGame } : {}),
      };
    });
  }, [syncedVideos, syncedGames]);

  const filteredTechniques = useMemo(() => {
    let filtered = mergedTechniques;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.technique.toLowerCase().includes(query) ||
          t.position.toLowerCase().includes(query) ||
          t.game.toLowerCase().includes(query) ||
          t.coach.toLowerCase().includes(query) ||
          t.videos.some(
            (v) =>
              v.title.toLowerCase().includes(query) ||
              v.creator.toLowerCase().includes(query)
          )
      );
    }

    if (formatFilter) filtered = filtered.filter((t) => t.format === formatFilter);
    if (levelFilter) filtered = filtered.filter((t) => t.level === levelFilter);
    if (categoryFilter) filtered = filtered.filter((t) => t.category === categoryFilter);
    if (positionFilter) filtered = filtered.filter((t) => t.position === positionFilter);
    if (showFavoritesOnly) {
      filtered = filtered.filter((t) => t.videos.some((v) => favorites.has(v.url)));
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'position') return a.position.localeCompare(b.position);
      if (sortBy === 'stars') {
        const aStars = Math.max(...a.videos.map((v) => v.stars));
        const bStars = Math.max(...b.videos.map((v) => v.stars));
        return bStars - aStars;
      }
      if (sortBy === 'level') {
        const levelOrder = { White: 0, Blue: 1, Advanced: 2 };
        return levelOrder[a.level] - levelOrder[b.level];
      }
      return 0;
    });

    return filtered;
  }, [searchQuery, formatFilter, levelFilter, categoryFilter, positionFilter, sortBy, showFavoritesOnly, favorites, mergedTechniques]);

  const stats = useMemo(() => {
    const totalVideos = mergedTechniques.reduce((sum, t) => sum + t.videos.length, 0);
    return {
      techniques: mergedTechniques.length,
      videos: totalVideos,
      favorites: favorites.size,
      notes: notes.length,
    };
  }, [mergedTechniques, favorites, notes]);

  const hasActiveFilters = formatFilter || levelFilter || categoryFilter || positionFilter || showFavoritesOnly;

  return (
    <div className="bg-background">
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onSelectCategory={(category) => {
          setCategoryFilter(category);
          setPositionFilter('');
        }}
        onSelectPosition={(position) => {
          setPositionFilter(position);
        }}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
        onToggleTheme={onToggleTheme}
        onOpenNotebook={() => setShowNotebookDrawer(true)}
        positions={positions}
      />

      {/* Page sub-header with category filters */}
      <div className="border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-1.5 sm:gap-2 items-center flex-wrap">
              <Tooltip content="Instruction videos">
                <button
                  onClick={() => { setCategoryFilter('Instruction'); setPositionFilter(''); }}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    categoryFilter === 'Instruction'
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <span className="hidden sm:inline">📘 Instruction</span>
                  <span className="sm:hidden">📘</span>
                </button>
              </Tooltip>
              <Tooltip content="Live training videos">
                <button
                  onClick={() => { setCategoryFilter('Live'); setPositionFilter(''); }}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    categoryFilter === 'Live'
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <span className="hidden sm:inline">🎥 Live</span>
                  <span className="sm:hidden">🎥</span>
                </button>
              </Tooltip>
              <Tooltip content="Competition highlights">
                <button
                  onClick={() => { setCategoryFilter('Competition'); setPositionFilter(''); }}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                    categoryFilter === 'Competition'
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <span className="hidden sm:inline">🏆 Competition</span>
                  <span className="sm:hidden">🏆</span>
                </button>
              </Tooltip>
              <Tooltip content="Show favorites only">
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
                    showFavoritesOnly
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">Favs</span>
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content={`Notebook (⌘B) · ${notes.length} notes`}>
                <button
                  onClick={() => setShowNotebookDrawer(true)}
                  className="lg:hidden relative px-2 sm:px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  {notes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notes.length}
                    </span>
                  )}
                </button>
              </Tooltip>
              <Tooltip content="AI BJJ Coach">
                <button
                  onClick={() => setShowSyncPanel(true)}
                  className={`px-2.5 sm:px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                    Object.keys(syncedGames).length > 0
                      ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                      : Object.keys(syncedVideos).length > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                      : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                  }`}
                  aria-label="AI BJJ Coach"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    AI Coach
                  </span>
                </button>
              </Tooltip>
              <Tooltip content="Command menu (⌘K)">
                <button
                  onClick={() => setShowCommandPalette(true)}
                  className="hidden sm:flex px-2 sm:px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all items-center gap-1.5"
                >
                  <Command className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="py-8 sm:py-12 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-2xl blur-3xl"></div>
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-center">
            <div>
              <div className="inline-block mb-4 px-4 py-1.5 bg-primary/10 border border-primary/30 rounded-full">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">No-Gi Technique Library</span>
              </div>
              <h1 className="font-['Bebas_Neue'] text-5xl sm:text-6xl lg:text-7xl tracking-wider leading-[0.9] mb-4">
                JIU-JITSU<br />
                <span className="text-primary">GAMES LAB</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                Master your game with curated YouTube videos, expert coaching notes, and 3 pedagogical tracks designed for progression.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 sm:gap-4">
              {[
                { value: stats.techniques, label: 'Techniques' },
                { value: stats.videos, label: 'Videos' },
                { value: stats.favorites, label: 'Favorites' },
                { value: stats.notes, label: 'Notes' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-card border border-border rounded-xl px-4 sm:px-6 py-4 sm:py-5 text-center shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
                  <div className="font-['Bebas_Neue'] text-4xl sm:text-5xl text-primary leading-none mb-1">{value}</div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Position Pills */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">Positions</h2>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {positions.map((position) => (
              <Tooltip key={position} content={`Filter by ${position}`}>
                <button
                  onClick={() => setPositionFilter(positionFilter === position ? '' : position)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all border ${
                    positionFilter === position
                      ? 'bg-primary/20 text-primary border-primary/50 shadow-md'
                      : 'bg-card border-border hover:border-primary/30'
                  }`}
                >
                  {position}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 sm:mb-8 space-y-3">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search techniques, creators, positions..."
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm shadow-sm transition-all"
              />
            </div>
            <Tooltip content="Advanced filters">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-lg border transition-all shadow-sm flex items-center gap-2 ${
                  showFilters || hasActiveFilters
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-bold hidden sm:inline">Filters</span>
                {hasActiveFilters && <span className="w-2 h-2 bg-accent rounded-full"></span>}
              </button>
            </Tooltip>
          </div>

          {showFilters && (
            <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm shadow-sm"
                >
                  <option value="">All Formats</option>
                  <option>Gi</option>
                  <option>No-Gi</option>
                  <option>Both</option>
                </select>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm shadow-sm"
                >
                  <option value="">All Levels</option>
                  <option>White</option>
                  <option>Blue</option>
                  <option>Advanced</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm shadow-sm"
                >
                  <option value="">All Categories</option>
                  <option>Instruction</option>
                  <option>Live</option>
                  <option>Competition</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'position' | 'stars' | 'level')}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm shadow-sm"
                >
                  <option value="position">Sort by Position</option>
                  <option value="stars">Sort by Rating</option>
                  <option value="level">Sort by Level</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-border bg-secondary hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 pb-12">
          <div className="min-w-0">
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {filteredTechniques.length} Result{filteredTechniques.length !== 1 ? 's' : ''}
              </p>
            </div>
            {filteredTechniques.length === 0 ? (
              <div className="text-center py-16 sm:py-24 bg-card rounded-xl border border-border">
                <div className="text-5xl sm:text-7xl mb-4 sm:mb-5 opacity-50">🥋</div>
                <p className="text-base sm:text-lg font-semibold text-foreground mb-2">No techniques found</p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={handleClearFilters}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 text-sm sm:text-base"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:gap-5">
                {filteredTechniques.map((technique, idx) => (
                  <TechniqueCard
                    key={`${technique.position}-${technique.technique}-${idx}`}
                    technique={technique}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onSaveNote={handleSaveNote}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="sticky top-24 h-[calc(100vh-7rem)] hidden lg:block">
            <Notebook
              notes={notes}
              onDeleteNote={handleDeleteNote}
              onClearAll={handleClearAllNotes}
            />
          </aside>
        </div>
      </div>

      <NotebookDrawer
        open={showNotebookDrawer}
        onOpenChange={setShowNotebookDrawer}
        notes={notes}
        onDeleteNote={handleDeleteNote}
        onClearAll={handleClearAllNotes}
      />

      {showSyncPanel && (
        <SyncPanel
          onClose={() => setShowSyncPanel(false)}
          onSyncComplete={() => {
            setSyncedVideos(getSyncedVideos());
            setSyncedGames(getSyncedGames());
          }}
        />
      )}
    </div>
  );
}
