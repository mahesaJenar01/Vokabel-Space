import type { AppState, Library, WordProgress } from '../types';

export const MAX_UNIQUE_WORDS_PER_DAY = 10;
export const MAX_FAILURES_PER_DAY = 3; 
export const REQUIRED_SUCCESSES_PER_DAY = 3; // New Constant
export const ITEMS_PER_QUIZ_BATCH = 5;

// Initialize or Reset Daily Session Logic
export const getSessionState = (currentState: AppState): AppState => {
  const today = new Date().toISOString().split('T')[0];
  
  if (currentState.lastSessionDate !== today) {
    const newProgress = { ...currentState.progress };
    Object.keys(newProgress).forEach(key => {
      newProgress[key] = {
        ...newProgress[key],
        todayFailCount: 0,
        todaySuccessCount: 0, // Reset success count
        status: (newProgress[key].status === 'mastered_today' || newProgress[key].status === 'failed_today') 
          ? 'review' 
          : newProgress[key].status,
        history: []
      };
    });

    return {
      progress: newProgress,
      lastSessionDate: today,
      dailyUniqueWords: []
    };
  }

  return currentState;
};

// Select words for the current session
export const getDueWords = (state: AppState, library: Library): string[] => {
  const now = Date.now();
  const progress = state.progress;
  const libraryKeys = Object.keys(library);

  // 1. Identify Candidates: Not fully done for today
  let activePool = libraryKeys.filter(key => {
    const p = progress[key];
    if (!p) return true; // New words
    return p.status !== 'mastered_today' && p.status !== 'failed_today';
  });

  // 2. Sort the pool based on priority
  // Priority 1: Struggling (Failed > 0) -> Show ASAP
  // Priority 2: Due / New -> Normal
  // Priority 3: In Progress (Success > 0) -> Push back (spacing effect)
  activePool.sort((a, b) => {
    const progA = progress[a];
    const progB = progress[b];

    // Define Scores (Higher is more urgent)
    const getScore = (p: WordProgress | undefined) => {
      if (!p) return 50; // New Word = Medium Priority

      // If user forgot it today, HIGH PRIORITY
      if (p.todayFailCount > 0) return 100 + p.todayFailCount;

      // If user remembered it partially, LOW PRIORITY (Show later in session)
      if (p.todaySuccessCount > 0) return 10 - p.todaySuccessCount;

      // Otherwise, prioritize based on due date
      return p.dueDate <= now ? 60 : 40;
    };

    return getScore(progB) - getScore(progA);
  });

  // 3. Filter: Prioritize words already in today's unique list
  const currentSessionWords = activePool.filter(key => state.dailyUniqueWords.includes(key));
  
  // 4. If we need more words to fill the daily unique cap
  const remainingSlots = MAX_UNIQUE_WORDS_PER_DAY - state.dailyUniqueWords.length;
  
  let newAdditions: string[] = [];
  if (remainingSlots > 0) {
    const potentialAdditions = activePool.filter(key => !state.dailyUniqueWords.includes(key));
    newAdditions = potentialAdditions.slice(0, remainingSlots);
  }

  return [...currentSessionWords, ...newAdditions];
};

export const updateWordProgress = (
  state: AppState, 
  wordId: string, 
  rating: 'remember' | 'forget'
): AppState => {
  const now = Date.now();
  const nextState = { ...state };
  nextState.progress = { ...state.progress };

  const progress: WordProgress = nextState.progress[wordId] 
    ? { ...nextState.progress[wordId] } 
    : {
        id: wordId,
        interval: 0,
        dueDate: 0,
        lastMaxInterval: 0,
        status: 'new',
        todayFailCount: 0,
        todaySuccessCount: 0,
        history: []
      };
  
  progress.history = [...progress.history];
  if (progress.todaySuccessCount === undefined) progress.todaySuccessCount = 0;

  if (!nextState.dailyUniqueWords.includes(wordId)) {
    nextState.dailyUniqueWords = [...nextState.dailyUniqueWords, wordId];
  }

  if (rating === 'forget') {
    // LOGIC: FORGET
    progress.todayFailCount += 1;
    // REMOVED: progress.todaySuccessCount = 0;  <-- This makes it cumulative now!
    progress.history.push('forget');
    
    if (progress.todayFailCount >= MAX_FAILURES_PER_DAY) {
      progress.status = 'failed_today';
      progress.dueDate = now + (24 * 60 * 60 * 1000); 
      
      if (progress.interval > 1) {
        progress.lastMaxInterval = progress.interval;
      }
      progress.interval = 1; 
    } 

  } else {
    // LOGIC: REMEMBER
    progress.todaySuccessCount += 1;
    progress.history.push('remember');

    if (progress.todaySuccessCount >= REQUIRED_SUCCESSES_PER_DAY) {
      progress.status = 'mastered_today';
      
      let nextInterval = 1;
      
      if (progress.todayFailCount === 0) {
         if (progress.interval === 0) {
           nextInterval = 1;
         } else if (progress.lastMaxInterval > 0 && progress.interval === 1) {
            nextInterval = progress.lastMaxInterval * 2;
         } else {
            nextInterval = Math.max(1, progress.interval * 2);
         }
      } else {
         nextInterval = 1; 
      }
  
      progress.interval = nextInterval;
      progress.dueDate = now + (nextInterval * 24 * 60 * 60 * 1000);
    }
  }

  nextState.progress[wordId] = progress;
  return nextState;
};