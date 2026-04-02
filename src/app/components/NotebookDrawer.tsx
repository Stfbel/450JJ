import { Drawer } from 'vaul';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { Note } from '../utils/storage';

interface NotebookDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  onDeleteNote: (videoUrl: string) => void;
  onClearAll: () => void;
}

export function NotebookDrawer({ open, onOpenChange, notes, onDeleteNote, onClearAll }: NotebookDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-2xl h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-border shadow-2xl">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-2xl flex-shrink-0 border-b border-border/50">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mb-4" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider">Notebook</h3>
                  <p className="text-[10px] text-muted-foreground">Your saved notes</p>
                </div>
              </div>
              <div className="flex gap-2">
                {notes.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all shadow-sm"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {notes.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">No notes yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Click ⭐ on videos to save notes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.videoUrl}
                    className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 relative group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
                  >
                    <button
                      onClick={() => onDeleteNote(note.videoUrl)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:border-destructive hover:text-destructive-foreground shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="pr-8">
                      <h4 className="font-bold text-sm mb-2 line-clamp-2 leading-snug">{note.videoTitle}</h4>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-primary">
                          {note.position}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {note.technique}
                        </span>
                      </div>
                      {note.note && (
                        <div className="bg-primary/5 border-l-2 border-primary/30 rounded-r-lg pl-3 pr-2 py-2">
                          <p className="text-xs text-foreground/90 leading-relaxed">
                            {note.note}
                          </p>
                        </div>
                      )}
                      <a
                        href={note.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Watch video
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
