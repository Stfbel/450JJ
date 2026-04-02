import { useState } from 'react';
import { ExternalLink, Star, Save, Play, Clock } from 'lucide-react';
import { Video } from '../data/techniques';
import { RatingStars } from './RatingStars';
import { getYouTubeThumbnail, formatTimestamp, parseTimestamp, buildVideoUrl } from '../utils/youtube';

interface VideoItemProps {
  video: Video;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSaveNote: (note: string) => void;
  onSaveTimestamp?: (seconds: number | undefined) => void;
  existingNote?: string;
  technique: string;
  position: string;
}

export function VideoItem({
  video,
  isFavorite,
  onToggleFavorite,
  onSaveNote,
  onSaveTimestamp,
  existingNote,
  technique,
  position,
}: VideoItemProps) {
  const [note, setNote] = useState(existingNote || '');
  const [showNote, setShowNote] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingTimestamp, setEditingTimestamp] = useState(false);
  const [timestampInput, setTimestampInput] = useState(
    video.timestamp ? formatTimestamp(video.timestamp) : ''
  );

  const thumbnail = getYouTubeThumbnail(video.url);
  const videoUrl = buildVideoUrl(video.url, video.timestamp);

  const handleSave = () => {
    onSaveNote(note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTimestampSave = () => {
    if (!onSaveTimestamp) return;
    const parsed = parseTimestamp(timestampInput);
    onSaveTimestamp(parsed ?? undefined);
    setEditingTimestamp(false);
  };

  const handleTimestampKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTimestampSave();
    if (e.key === 'Escape') {
      setTimestampInput(video.timestamp ? formatTimestamp(video.timestamp) : '');
      setEditingTimestamp(false);
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 group">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        {thumbnail && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-muted group/thumb shadow-md"
          >
            <img
              src={thumbnail}
              alt={video.title}
              className="w-full h-full object-cover transition-all duration-300 group-hover/thumb:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center transform scale-90 group-hover/thumb:scale-100 transition-transform">
                  <Play className="w-6 h-6 text-primary-foreground fill-current ml-0.5" />
                </div>
              </div>
            </div>
            {/* Timestamp badge on thumbnail */}
            {video.timestamp !== undefined && (
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                ▶ {formatTimestamp(video.timestamp)}
              </div>
            )}
          </a>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link flex items-start gap-2 mb-1.5"
            >
              <span className="font-semibold text-sm leading-snug text-foreground group-hover/link:text-primary transition-colors line-clamp-2">
                {video.title}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-all flex-shrink-0 mt-0.5" />
            </a>
            <p className="text-xs text-muted-foreground font-medium">{video.creator}</p>
          </div>

          <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <RatingStars rating={video.stars} />
              {/* Timestamp editor */}
              {editingTimestamp ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={timestampInput}
                    onChange={(e) => setTimestampInput(e.target.value)}
                    onKeyDown={handleTimestampKeyDown}
                    onBlur={handleTimestampSave}
                    placeholder="0:00"
                    className="w-16 px-1.5 py-0.5 text-xs font-mono border border-primary rounded bg-background focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTimestamp(true)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                      video.timestamp !== undefined
                        ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                    }`}
                    title={video.timestamp !== undefined ? 'Edit timestamp' : 'Add timestamp'}
                  >
                    <Clock className="w-3 h-3" />
                    {video.timestamp !== undefined ? formatTimestamp(video.timestamp) : '—'}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onToggleFavorite}
              className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center shadow-sm ${
                isFavorite
                  ? 'bg-primary border-primary text-primary-foreground shadow-primary/20'
                  : 'border-border hover:border-primary hover:bg-primary/10 hover:shadow-primary/10'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {showNote || existingNote ? (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-4 bg-muted/20">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your coaching notes here..."
            className="w-full p-3 text-xs rounded-lg border border-border bg-card text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 min-h-[70px] transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saved}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                saved
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? 'Saved!' : 'Save Note'}
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-secondary border border-border hover:bg-muted transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowNote(true)}
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">+</span>
            Add note
          </button>
        </div>
      )}
    </div>
  );
}
