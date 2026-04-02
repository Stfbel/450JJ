import { Video } from '../data/techniques';

export const getFavorites = (): Set<string> => {
  const stored = localStorage.getItem('bjj-favorites');
  return stored ? new Set(JSON.parse(stored)) : new Set();
};

export const saveFavorites = (favorites: Set<string>) => {
  localStorage.setItem('bjj-favorites', JSON.stringify([...favorites]));
};

export const toggleFavorite = (videoUrl: string): Set<string> => {
  const favorites = getFavorites();
  if (favorites.has(videoUrl)) {
    favorites.delete(videoUrl);
  } else {
    favorites.add(videoUrl);
  }
  saveFavorites(favorites);
  return favorites;
};

export interface Note {
  videoUrl: string;
  videoTitle: string;
  technique: string;
  position: string;
  note: string;
  timestamp: number;
}

export const getNotes = (): Note[] => {
  const stored = localStorage.getItem('bjj-notes');
  return stored ? JSON.parse(stored) : [];
};

export const saveNote = (note: Note) => {
  const notes = getNotes();
  const existingIndex = notes.findIndex((n) => n.videoUrl === note.videoUrl);
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }
  localStorage.setItem('bjj-notes', JSON.stringify(notes));
};

export const deleteNote = (videoUrl: string) => {
  const notes = getNotes().filter((n) => n.videoUrl !== videoUrl);
  localStorage.setItem('bjj-notes', JSON.stringify(notes));
};

export const getNote = (videoUrl: string): Note | undefined => {
  const notes = getNotes();
  return notes.find((n) => n.videoUrl === videoUrl);
};

// Timestamps — stored as { [videoUrl]: seconds }
export const getTimestamps = (): Record<string, number> => {
  const stored = localStorage.getItem('bjj-timestamps');
  return stored ? JSON.parse(stored) : {};
};

export const saveTimestamp = (videoUrl: string, seconds: number | undefined) => {
  const timestamps = getTimestamps();
  if (seconds === undefined) {
    delete timestamps[videoUrl];
  } else {
    timestamps[videoUrl] = seconds;
  }
  localStorage.setItem('bjj-timestamps', JSON.stringify(timestamps));
};
