import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Sun, Moon, Star, BookOpen, Filter, Video as VideoIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from './VisuallyHidden';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (category: string) => void;
  onSelectPosition: (position: string) => void;
  onToggleFavorites: () => void;
  onToggleTheme: () => void;
  onOpenNotebook: () => void;
  positions: string[];
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelectCategory,
  onSelectPosition,
  onToggleFavorites,
  onToggleTheme,
  onOpenNotebook,
  positions,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200" aria-describedby="command-palette-description">
          <VisuallyHidden>
            <Dialog.Title>Command Palette</Dialog.Title>
          </VisuallyHidden>
          <VisuallyHidden>
            <Dialog.Description id="command-palette-description">
              Search and navigate through categories, positions, and quick actions
            </Dialog.Description>
          </VisuallyHidden>
          <Command className="rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center border-b border-border px-4">
              <Search className="w-5 h-5 text-muted-foreground mr-2" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type a command or search..."
                className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">ESC</span>
              </kbd>
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                <Command.Item
                  onSelect={() => handleSelect(onToggleFavorites)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <Star className="w-4 h-4" />
                  <span>Toggle Favorites</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(onToggleTheme)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <Moon className="w-4 h-4" />
                  <span>Toggle Theme</span>
                  <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘D
                  </kbd>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(onOpenNotebook)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Notebook</span>
                  <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘B
                  </kbd>
                </Command.Item>
              </Command.Group>

              <Command.Separator className="h-px bg-border my-2" />

              <Command.Group heading="Categories" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                <Command.Item
                  onSelect={() => handleSelect(() => onSelectCategory('Instruction'))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <span className="text-base">📘</span>
                  <span>Instruction Videos</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => onSelectCategory('Live'))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <span className="text-base">🎥</span>
                  <span>Live Training</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleSelect(() => onSelectCategory('Competition'))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                >
                  <span className="text-base">🏆</span>
                  <span>Competition</span>
                </Command.Item>
              </Command.Group>

              <Command.Separator className="h-px bg-border my-2" />

              <Command.Group heading="Positions" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {positions.map((position) => (
                  <Command.Item
                    key={position}
                    value={position}
                    onSelect={() => handleSelect(() => onSelectPosition(position))}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>{position}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground bg-muted/30">
              <div className="flex items-center justify-between">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">↑↓</kbd> to navigate</span>
                <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">⌘K</kbd> to open</span>
              </div>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}