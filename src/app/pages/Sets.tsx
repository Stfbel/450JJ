import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, X, BookOpen, Play } from 'lucide-react';
import { toast } from 'sonner';
import { getSets, addSet, deleteSet, getVideos } from '../utils/libraryStorage';
import { VideoSet } from '../data/library';
import { getYouTubeThumbnail } from '../utils/youtube';
import { isAdminActive } from '../utils/libraryStorage';

function CreateSetModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    addSet({ title: title.trim(), description: description.trim(), videoIds: [] });
    onCreate();
    toast.success('Set created');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider">New Collection</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Name *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Guard Passing Series"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection about?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              Create Collection
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-border bg-secondary font-semibold text-sm hover:bg-muted transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetCard({ set, admin, onDelete }: { set: VideoSet; admin: boolean; onDelete: () => void }) {
  const allVideos = getVideos();
  const videos = set.videoIds.map((id) => allVideos.find((v) => v.id === id)).filter(Boolean);
  const coverVideo = set.coverVideoId
    ? allVideos.find((v) => v.id === set.coverVideoId)
    : videos[0];
  const thumbnail = coverVideo ? getYouTubeThumbnail(coverVideo.url) : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group">
      <Link to={`/sets/${set.id}`} className="block">
        <div className="relative aspect-video bg-muted">
          {thumbnail ? (
            <>
              <img src={thumbnail} alt={set.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl">
                  <Play className="w-7 h-7 text-primary-foreground fill-current ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BookOpen className="w-10 h-10 opacity-30" />
            </div>
          )}
          <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {set.videoIds.length} video{set.videoIds.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-base leading-snug mb-1 group-hover:text-primary transition-colors">
            {set.title}
          </h3>
          {set.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{set.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Updated {new Date(set.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </Link>
      {admin && (
        <div className="px-4 pb-3">
          <button
            onClick={(e) => { e.preventDefault(); onDelete(); }}
            className="text-[10px] text-destructive/70 hover:text-destructive transition-colors font-medium"
          >
            Delete collection
          </button>
        </div>
      )}
    </div>
  );
}

export function Sets() {
  const admin = isAdminActive();
  const [sets, setSets] = useState<VideoSet[]>(getSets);
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = (id: string) => {
    if (!confirm('Delete this collection?')) return;
    deleteSet(id);
    setSets(getSets());
    toast.success('Collection deleted');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wider leading-none mb-1">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {sets.length} collection{sets.length !== 1 ? 's' : ''}
          </p>
        </div>
        {admin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        )}
      </div>

      {/* Grid */}
      {sets.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-xl border border-border">
          <div className="text-6xl mb-4 opacity-30">📚</div>
          <p className="text-lg font-semibold mb-2">No collections yet</p>
          <p className="text-sm text-muted-foreground">
            {admin
              ? 'Create your first collection to group related videos.'
              : 'No collections have been created yet.'}
          </p>
          {admin && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              Create Collection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sets.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              admin={admin}
              onDelete={() => handleDelete(set.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSetModal
          onClose={() => setShowCreate(false)}
          onCreate={() => setSets(getSets())}
        />
      )}
    </div>
  );
}
