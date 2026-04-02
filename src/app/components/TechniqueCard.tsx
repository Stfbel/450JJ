import { useState } from 'react';
import { ChevronDown, ChevronUp, Video as VideoIcon } from 'lucide-react';
import { Technique } from '../data/techniques';
import { VideoItem } from './VideoItem';
import { getNote, getTimestamps, saveTimestamp } from '../utils/storage';

interface TechniqueCardProps {
  technique: Technique;
  favorites: Set<string>;
  onToggleFavorite: (videoUrl: string, videoTitle: string) => void;
  onSaveNote: (
    videoUrl: string,
    note: string,
    videoTitle: string,
    technique: string,
    position: string
  ) => void;
}

export function TechniqueCard({
  technique,
  favorites,
  onToggleFavorite,
  onSaveNote,
}: TechniqueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timestamps, setTimestamps] = useState(getTimestamps);

  const formatBadgeColor = (format: string) => {
    switch (format) {
      case 'Gi':
        return 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30';
      case 'No-Gi':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'Both':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const levelBadgeColor = (level: string) => {
    switch (level) {
      case 'White':
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
      case 'Blue':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'Advanced':
        return 'bg-primary/20 text-primary border-primary/40';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const displayedVideos = isExpanded ? technique.videos : technique.videos.slice(0, 2);
  const hasMoreVideos = technique.videos.length > 2;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 group">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {technique.position}
              </span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-1 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              {technique.technique}
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${formatBadgeColor(technique.format)}`}>
              {technique.format}
            </span>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${levelBadgeColor(technique.level)}`}>
              {technique.level}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {technique.gameData ? (
            <>
              {/* Situation */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <p className="text-[10px] text-primary uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary"></span>
                  Game · {technique.gameData.duration}
                </p>
                <p className="text-sm text-foreground leading-relaxed">{technique.gameData.situation}</p>
              </div>
              {/* Top / Bottom */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-sky-500/5 rounded-xl p-3 border border-sky-500/20">
                  <p className="text-[9px] text-sky-500 uppercase font-bold tracking-wider mb-1.5">▲ Top Player</p>
                  <p className="text-xs text-foreground leading-relaxed">{technique.gameData.topObjective}</p>
                </div>
                <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20">
                  <p className="text-[9px] text-amber-500 uppercase font-bold tracking-wider mb-1.5">▼ Bottom Player</p>
                  <p className="text-xs text-foreground leading-relaxed">{technique.gameData.bottomObjective}</p>
                </div>
              </div>
              {/* Scoring + Coach */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Scoring</p>
                  <p className="text-xs text-foreground leading-relaxed">{technique.gameData.scoring}</p>
                </div>
                <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-3 border border-accent/20">
                  <p className="text-[9px] text-accent uppercase font-bold tracking-wider mb-1">Coach Cue</p>
                  <p className="text-xs text-foreground leading-relaxed font-medium">{technique.gameData.coachCue}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <p className="text-[10px] text-primary uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary"></span>
                  Game Situation
                </p>
                <p className="text-sm text-foreground leading-relaxed">{technique.game}</p>
              </div>
              <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-4 border border-accent/20">
                <p className="text-[10px] text-accent uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent"></span>
                  Coach Tip
                </p>
                <p className="text-sm text-foreground leading-relaxed font-medium">{technique.coach}</p>
              </div>
            </>
          )}
        </div>

        {/* Video Count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <VideoIcon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {technique.videos.length} Video{technique.videos.length !== 1 ? 's' : ''}
            </span>
          </div>
          {hasMoreVideos && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {isExpanded ? (
                <>
                  Show Less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show All {technique.videos.length} <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Videos */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-col gap-3">
          {displayedVideos.map((video) => (
            <VideoItem
              key={video.url}
              video={{ ...video, timestamp: timestamps[video.url] ?? video.timestamp }}
              isFavorite={favorites.has(video.url)}
              onToggleFavorite={() => onToggleFavorite(video.url, video.title)}
              onSaveNote={(note) =>
                onSaveNote(
                  video.url,
                  note,
                  video.title,
                  technique.technique,
                  technique.position
                )
              }
              onSaveTimestamp={(seconds) => {
                saveTimestamp(video.url, seconds);
                setTimestamps(getTimestamps());
              }}
              existingNote={getNote(video.url)?.note}
              technique={technique.technique}
              position={technique.position}
            />
          ))}
        </div>
      </div>
    </div>
  );
}