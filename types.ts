export interface Curiosity {
  title: string;
  description: string;
}

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  room: string;
  period: string;
  estimatedTimeMinutes: number;
  description?: string; 
  fullContent?: string; 
  connectionContext?: string; // Text explaining the link from the previous artwork
  curiosities?: Curiosity[]; // Structured curiosities
  imageUrl?: string; // Real Wikimedia URL
}

export interface TourPlan {
  totalDurationMinutes: number;
  artworks: Artwork[];
  currentIndex: number;
}

export enum AppState {
  SETUP = 'SETUP',
  LOADING_PLAN = 'LOADING_PLAN',
  TOUR = 'TOUR',
  ERROR = 'ERROR'
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  blobUrl: string | null;
}