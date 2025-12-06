export interface Curiosity {
  title: string;
  description: string; // The text script for the audio
  audioId?: string;    // Cache key for this specific curiosity audio
}

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  room: string;
  period: string;
  estimatedTimeMinutes: number;
  description?: string; 
  // We keep these for the list view, but detailed content is fetched separately
  imageUrl?: string; 
}

export enum DetailLevel {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG'
}

export interface ArtworkContent {
  connectionContext: string;
  short: string;
  medium: string;
  long: string;
  curiosities: Curiosity[];
}

export interface TourPlan {
  totalDurationMinutes: number;
  artworks: Artwork[];
  currentIndex: number;
}

export enum AppState {
  ONBOARDING = 'ONBOARDING',
  LOADING_PLAN = 'LOADING_PLAN',
  TOUR = 'TOUR',
  MAP_VIEW = 'MAP_VIEW', // Dedicated Map View State
  ERROR = 'ERROR'
}

export enum UserPacing {
  CONTEMPLATIVE = 'CONTEMPLATIVE',
  DYNAMIC = 'DYNAMIC'
}

export type UserInterest = 'COLOR' | 'HISTORY' | 'GEOMETRY' | 'ANECDOTES' | 'PHILOSOPHY' | 'TECHNIQUE';

export interface UserProfile {
  pacing: UserPacing;
  interests: UserInterest[];
  availableTime: number;
  defaultDetailLevel: DetailLevel; // User preference
}

export interface AudioTrack {
  id: string;
  url: string; // Blob URL
  title: string;
  artist: string;
  imageUrl?: string;
  isCuriosity?: boolean;
}

export interface AudioState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
}