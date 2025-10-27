export interface Transcription {
  id: string;
  text: string;
  timestamp: number;
  wordCount: number;
}

export interface TranscriptionStats {
  totalWords: number;
  totalTranscriptions: number;
  currentStreak: number;
  averageWPM: number;
}
