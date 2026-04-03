import { LibraryVideo, VideoSet, ClassSession } from '../data/library';

const VIDEOS_KEY = 'bjj-library-videos';
const SETS_KEY = 'bjj-sets';
const CLASSES_KEY = 'bjj-classes';
const ADMIN_PIN_KEY = 'bjj-admin-pin';
const ADMIN_ACTIVE_KEY = 'bjj-admin-active';
const SYNC_TOKEN_KEY = 'bjj-sync-token';

export const getSyncToken = (): string => localStorage.getItem(SYNC_TOKEN_KEY) || '';
export const setSyncToken = (token: string) => localStorage.setItem(SYNC_TOKEN_KEY, token);
export const clearSyncToken = () => localStorage.removeItem(SYNC_TOKEN_KEY);

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Videos ──────────────────────────────────────────────────────────────────

export const getVideos = (): LibraryVideo[] => {
  const s = localStorage.getItem(VIDEOS_KEY);
  return s ? JSON.parse(s) : [];
};

const saveVideos = (videos: LibraryVideo[]) =>
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));

export const addVideo = (data: Omit<LibraryVideo, 'id' | 'addedAt'>): LibraryVideo => {
  const video: LibraryVideo = { ...data, id: uid(), addedAt: new Date().toISOString() };
  saveVideos([...getVideos(), video]);
  return video;
};

export const updateVideo = (id: string, data: Partial<LibraryVideo>) => {
  saveVideos(getVideos().map((v) => (v.id === id ? { ...v, ...data } : v)));
};

export const deleteVideo = (id: string) => {
  saveVideos(getVideos().filter((v) => v.id !== id));
  // Remove from sets
  getSets().forEach((s) => {
    if (s.videoIds.includes(id))
      updateSet(s.id, { videoIds: s.videoIds.filter((vid) => vid !== id) });
  });
  // Remove from classes
  getClasses().forEach((c) => {
    if (c.videoIds.includes(id))
      updateClass(c.id, { videoIds: c.videoIds.filter((vid) => vid !== id) });
  });
};

// ─── Sets ─────────────────────────────────────────────────────────────────────

export const getSets = (): VideoSet[] => {
  const s = localStorage.getItem(SETS_KEY);
  return s ? JSON.parse(s) : [];
};

const saveSets = (sets: VideoSet[]) =>
  localStorage.setItem(SETS_KEY, JSON.stringify(sets));

export const addSet = (data: Omit<VideoSet, 'id' | 'createdAt' | 'updatedAt'>): VideoSet => {
  const now = new Date().toISOString();
  const set: VideoSet = { ...data, id: uid(), createdAt: now, updatedAt: now };
  saveSets([...getSets(), set]);
  return set;
};

export const updateSet = (id: string, data: Partial<VideoSet>) => {
  saveSets(getSets().map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s)));
};

export const deleteSet = (id: string) => saveSets(getSets().filter((s) => s.id !== id));

// ─── Classes ─────────────────────────────────────────────────────────────────

export const getClasses = (): ClassSession[] => {
  const s = localStorage.getItem(CLASSES_KEY);
  return s ? JSON.parse(s) : [];
};

const saveClasses = (classes: ClassSession[]) =>
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));

export const addClass = (data: Omit<ClassSession, 'id' | 'createdAt'>): ClassSession => {
  const cls: ClassSession = { ...data, id: uid(), createdAt: new Date().toISOString() };
  saveClasses([...getClasses(), cls]);
  return cls;
};

export const updateClass = (id: string, data: Partial<ClassSession>) => {
  saveClasses(getClasses().map((c) => (c.id === id ? { ...c, ...data } : c)));
};

export const deleteClass = (id: string) => saveClasses(getClasses().filter((c) => c.id !== id));

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAdminPin = (): string => localStorage.getItem(ADMIN_PIN_KEY) || '';
export const setAdminPin = (pin: string) => localStorage.setItem(ADMIN_PIN_KEY, pin);
export const isAdminActive = (): boolean => localStorage.getItem(ADMIN_ACTIVE_KEY) === 'true';
export const activateAdmin = () => localStorage.setItem(ADMIN_ACTIVE_KEY, 'true');
export const deactivateAdmin = () => localStorage.removeItem(ADMIN_ACTIVE_KEY);

export const loginAdmin = (pin: string): boolean => {
  const stored = getAdminPin();
  if (!stored) {
    // First login — set the PIN
    setAdminPin(pin);
    activateAdmin();
    return true;
  }
  if (pin === stored) {
    activateAdmin();
    return true;
  }
  return false;
};
