import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Plus, X, Play, ExternalLink, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { getSets, updateSet, getVideos } from '../utils/libraryStorage';
import { LibraryVideo } from '../data/library';
import { getYouTubeThumbnail, getYouTubeVideoId } from '../utils/youtube';
import { isAdminActive } from '../utils/libraryStorage';

function AddVideosModal({
  currentIds,
  onClose,
  onAdd,
}: {
  currentIds: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const allVideos = getVideos();
  const available = allVideos.filter((v) => !currentIds.includes(v.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = search
    ? available.filter(
        (v) =>
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          v.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : available;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    onAdd([...selected]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider">Add Videos</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 border-b border-border shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {available.length === 0 ? 'All library videos are already in this collection.' : 'No videos match your search.'}
            </p>
          ) : (
            filtered.map((video) => {
              const thumb = getYouTubeThumbnail(video.url);
              const isSelected = selected.has(video.id);
              return (
                <button
                  key={video.id}
                  onClick={() => toggle(video.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg mb-1 transition-all text-left ${
                    isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="w-16 h-10 rounded bg-muted overflow-hidden shrink-0">
                    {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{video.title}</p>
                    <p className="text-[10px] text-muted-foreground">{video.type} · {video.level}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {isSelected && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selected.size > 0 ? `${selected.size} video${selected.size !== 1 ? 's' : ''}` : 'Videos'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-border bg-secondary font-semibold text-sm hover:bg-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoRow({ video, admin, onRemove }: { video: LibraryVideo; admin: boolean; onRemove: () => void }) {
  const thumbnail = getYouTubeThumbnail(video.url);
  const videoId = getYouTubeVideoId(video.url);
  const watchUrl = videoId ? `https://youtube.com/watch?v=${videoId}` : video.url;

  return (
    <div className="flex items-center gap-4 p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
      {admin && (
        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
      )}
      <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
        {thumbnail ? (
          <>
            <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
              <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
                </div>
              </a>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-6 h-6 opacity-20" />
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 py-0.5 rounded font-mono">
            {video.duration}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2 flex items-start gap-1.5"
        >
          {video.title}
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5" />
        </a>
        <div className="flex gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{video.type}</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">{video.level}</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">{video.format}</span>
        </div>
      </div>
      {admin && (
        <button
          onClick={onRemove}
          className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground/40"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function SetDetail() {
  const { id } = useParams<{ id: string }>();
  const admin = isAdminActive();

  const set = getSets().find((s) => s.id === id);
  const [videoIds, setVideoIds] = useState<string[]>(set?.videoIds ?? []);
  const [showAddModal, setShowAddModal] = useState(false);

  if (!set) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        <Link to="/sets" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>
        <div className="text-center py-24">
          <p className="text-lg font-semibold">Collection not found</p>
        </div>
      </div>
    );
  }

  const allVideos = getVideos();
  const videos = videoIds.map((id) => allVideos.find((v) => v.id === id)).filter(Boolean) as LibraryVideo[];

  const handleAddVideos = (newIds: string[]) => {
    const updated = [...videoIds, ...newIds];
    updateSet(set.id, { videoIds: updated });
    setVideoIds(updated);
    toast.success(`Added ${newIds.length} video${newIds.length !== 1 ? 's' : ''}`);
  };

  const handleRemoveVideo = (videoId: string) => {
    const updated = videoIds.filter((id) => id !== videoId);
    updateSet(set.id, { videoIds: updated });
    setVideoIds(updated);
    toast.success('Removed from collection');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      <Link to="/sets" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wider leading-none mb-1">{set.title}</h1>
          {set.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{set.description}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-2">
            {videoIds.length} video{videoIds.length !== 1 ? 's' : ''}
          </p>
        </div>
        {admin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
          >
            <Plus className="w-4 h-4" />
            Add Videos
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-xl border border-border">
          <div className="text-6xl mb-4 opacity-30">🎬</div>
          <p className="text-lg font-semibold mb-2">No videos in this collection</p>
          {admin ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              Add Videos
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">Check back later.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {videos.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              admin={admin}
              onRemove={() => handleRemoveVideo(video.id)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddVideosModal
          currentIds={videoIds}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddVideos}
        />
      )}
    </div>
  );
}
