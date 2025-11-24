import type { AppState, Library, WordProgress } from '../types';

export const MAX_UNIQUE_WORDS_PER_DAY = 10;
export const MAX_FAILURES_PER_DAY = 3; 
export const REQUIRED_SUCCESSES_PER_DAY = 3;
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
        todaySuccessCount: 0,
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

// Calculate urgency score for weighted selection
const calculateUrgencyScore = (progress: WordProgress | undefined, now: number): number => {
  if (!progress) {
    // New words: medium priority
    return 50;
  }

  let score = 0;

  // 1. CRITICAL: Failed today (highest priority)
  if (progress.todayFailCount > 0) {
    score += 100 + (progress.todayFailCount * 20); // 120, 140, 160...
  }

  // 2. Overdue items get exponentially higher priority
  if (progress.dueDate > 0 && progress.dueDate <= now) {
    const daysOverdue = Math.floor((now - progress.dueDate) / (24 * 60 * 60 * 1000));
    score += 60 + (daysOverdue * 15); // More overdue = more urgent
  }

  // 3. Learning items that haven't been mastered yet
  if (progress.status === 'learning' && progress.todaySuccessCount === 0) {
    score += 55;
  }

  // 4. New items ready to learn
  if (progress.status === 'new' && progress.todaySuccessCount === 0) {
    score += 50;
  }

  // 5. Items with partial success today (lower priority - spacing effect)
  if (progress.todaySuccessCount > 0 && progress.todaySuccessCount < REQUIRED_SUCCESSES_PER_DAY) {
    score += Math.max(10, 30 - (progress.todaySuccessCount * 10)); // 20, 10
  }

  // 6. Recent failure history penalty (shows difficulty pattern)
  const recentHistory = progress.history.slice(-5);
  const recentFailRate = recentHistory.filter(h => h === 'forget').length / recentHistory.length;
  if (recentFailRate > 0.5) {
    score += 25; // Struggling words need more practice
  }

  // 7. Bonus for items due soon (proactive review)
  if (progress.dueDate > now) {
    const daysUntilDue = Math.floor((progress.dueDate - now) / (24 * 60 * 60 * 1000));
    if (daysUntilDue <= 1) {
      score += 40; // Due tomorrow
    } else if (daysUntilDue <= 3) {
      score += 20; // Due in 2-3 days
    }
  }

  return score;
};

// Weighted random selection based on urgency scores
const weightedRandomSelection = (pool: string[], progress: Record<string, WordProgress>, now: number, count: number): string[] => {
  if (pool.length === 0) return [];
  if (pool.length <= count) return [...pool];

  // Calculate scores for all items
  const scoredItems = pool.map(wordId => ({
    wordId,
    score: calculateUrgencyScore(progress[wordId], now)
  }));

  // Convert scores to weights (ensure all weights are positive)
  const minScore = Math.min(...scoredItems.map(item => item.score));
  const adjustedItems = scoredItems.map(item => ({
    wordId: item.wordId,
    weight: Math.max(1, item.score - minScore + 1) // Ensure minimum weight of 1
  }));

  const selected: string[] = [];
  const remaining = [...adjustedItems];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Calculate total weight for remaining items
    const currentTotalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    
    // Random selection based on weights
    let random = Math.random() * currentTotalWeight;
    let selectedIndex = 0;

    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    selected.push(remaining[selectedIndex].wordId);
    remaining.splice(selectedIndex, 1);
  }

  return selected;
};

// Select words for the current session with weighted random selection
export const getDueWords = (state: AppState, library: Library): string[] => {
  const now = Date.now();
  const progress = state.progress;
  const libraryKeys = Object.keys(library);

  // 1. Identify active pool: Not fully done for today
  const activePool = libraryKeys.filter(key => {
    const p = progress[key];
    if (!p) return true; // New words
    return p.status !== 'mastered_today' && p.status !== 'failed_today';
  });

  if (activePool.length === 0) return [];

  // 2. Separate into priority groups
  const criticalItems = activePool.filter(key => {
    const p = progress[key];
    return p && p.todayFailCount > 0;
  });

  const currentSessionWords = activePool.filter(key => 
    state.dailyUniqueWords.includes(key)
  );

  const newPotentialWords = activePool.filter(key => 
    !state.dailyUniqueWords.includes(key)
  );

  // 3. Build result with weighted selection
  let result: string[] = [];

  // Always include critical items first (failed today)
  result.push(...criticalItems);

  // Add current session words with weighted selection
  const remainingCurrentSession = currentSessionWords.filter(
    key => !result.includes(key)
  );
  
  if (remainingCurrentSession.length > 0) {
    const selectedCurrent = weightedRandomSelection(
      remainingCurrentSession,
      progress,
      now,
      Math.min(remainingCurrentSession.length, ITEMS_PER_QUIZ_BATCH - result.length)
    );
    result.push(...selectedCurrent);
  }

  // Fill remaining slots with new words (weighted selection)
  const remainingSlots = MAX_UNIQUE_WORDS_PER_DAY - state.dailyUniqueWords.length;
  
  if (remainingSlots > 0 && newPotentialWords.length > 0) {
    const neededNewWords = Math.min(
      remainingSlots,
      Math.max(0, ITEMS_PER_QUIZ_BATCH - result.length)
    );
    
    if (neededNewWords > 0) {
      const selectedNew = weightedRandomSelection(
        newPotentialWords,
        progress,
        now,
        neededNewWords
      );
      result.push(...selectedNew);
    }
  }

  return result;
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

  // Track in daily unique words
  if (!nextState.dailyUniqueWords.includes(wordId)) {
    nextState.dailyUniqueWords = [...nextState.dailyUniqueWords, wordId];
  }

  if (rating === 'forget') {
    // LOGIC: FORGET
    progress.todayFailCount += 1;
    progress.history.push('forget');
    
    // Update status
    if (progress.status === 'new') {
      progress.status = 'learning';
    }
    
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

    // Update status
    if (progress.status === 'new') {
      progress.status = 'learning';
    }

    if (progress.todaySuccessCount >= REQUIRED_SUCCESSES_PER_DAY) {
      progress.status = 'mastered_today';
      
      let nextInterval = 1;
      
      if (progress.todayFailCount === 0) {
        // Perfect recall - use exponential growth
        if (progress.interval === 0) {
          nextInterval = 1;
        } else if (progress.lastMaxInterval > 0 && progress.interval === 1) {
          // Recovering from failure - jump back to previous mastery level
          nextInterval = progress.lastMaxInterval * 2;
        } else {
          nextInterval = Math.max(1, progress.interval * 2);
        }
      } else {
        // Had struggles today - reset to 1 day
        nextInterval = 1; 
      }
  
      progress.interval = nextInterval;
      progress.dueDate = now + (nextInterval * 24 * 60 * 60 * 1000);
    }
  }

  nextState.progress[wordId] = progress;
  return nextState;
};