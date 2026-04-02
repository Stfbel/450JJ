export type VideoType = 'Technique' | 'Rolls' | 'Troubleshooting' | 'Live Examples' | 'Discussion';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type GiFormat = 'Gi' | 'No-Gi' | 'Both';

export interface LibraryVideo {
  id: string;
  title: string;
  url: string;
  description: string;
  type: VideoType;
  level: SkillLevel;
  format: GiFormat;
  tags: string[];
  addedAt: string; // ISO date
  duration?: string; // e.g. "12:34"
}

export interface VideoSet {
  id: string;
  title: string;
  description: string;
  videoIds: string[];
  coverVideoId?: string;
  createdAt: string;
  updatedAt: string;
}

export type SessionLevel = SkillLevel | 'All Levels';

export interface ClassSession {
  id: string;
  date: string; // YYYY-MM-DD
  theme: string;
  level: SessionLevel;
  notes: string;
  videoIds: string[]; // refs to LibraryVideo ids
  status: 'planned' | 'completed';
  createdAt: string;
}
