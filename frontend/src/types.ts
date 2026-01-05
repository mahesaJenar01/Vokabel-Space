export interface VocabularyItem {
  Beschreibung: string[];
  Bedeutung: {
    Englisch: string[];
    Indonesisch: string[];
  };
  Konjugation?: Record<string, string>;
  Plural?: string;
  Vergleichsmessung?: Record<string, string>;
  Antonym?: Record<string, { Bedeutung: { Englisch: string[]; Indonesisch: string[] } }>;
  Synonym?: Record<string, { Bedeutung: { Englisch: string[]; Indonesisch: string[] } }>;
}

export type Library = Record<string, VocabularyItem>;

export interface WordProgress {
  id: string; 
  interval: number; 
  dueDate: number; 
  lastMaxInterval: number; 
  status: 'new' | 'learning' | 'review' | 'mastered_today' | 'failed_today';
  todayFailCount: number;
  todaySuccessCount: number;
  history: ('remember' | 'forget')[]; 
  isHard: boolean;
  lastUsedDescriptionIndex?: number; // NEW: Track which description was last shown
}

export interface AppState {
  progress: Record<string, WordProgress>;
  lastSessionDate: string; 
  dailyUniqueWords: string[]; 
}

export interface QuizItem {
  wordId: string;
  data: VocabularyItem;
  descriptionIndex: number; 
}