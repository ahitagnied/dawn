export interface Transcription {
  id: string;
  text: string;
  timestamp: number;
  wordCount: number;
  duration?: number; // Recording duration in seconds
}

export interface TranscriptionStats {
  totalWords: number;
  totalTranscriptions: number;
  currentStreak: number;
  averageWPM: number;
}
