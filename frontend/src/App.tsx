import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FlipCard from './components/FlipCard';
import type { AppState, QuizItem, Library } from './types';
import { getSessionState, getDueWords, updateWordProgress, ITEMS_PER_QUIZ_BATCH } from './utils/srsLogic';
import { fetchLibrary, fetchUserState, saveUserState } from './api';

const App: React.FC = () => {
  const [library, setLibrary] = useState<Library | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [currentRatings, setCurrentRatings] = useState<Record<string, 'remember' | 'forget'>>({});
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialization: Fetch Library AND User State
  useEffect(() => {
    const initData = async () => {
      try {
        const [libData, userData] = await Promise.all([
          fetchLibrary(),
          fetchUserState()
        ]);
        
        setLibrary(libData);
        
        // Process date logic immediately after fetching
        const processedState = getSessionState(userData);
        setAppState(processedState);
        
        // If date changed, we should save the reset state immediately
        if (processedState.lastSessionDate !== userData.lastSessionDate) {
          saveUserState(processedState);
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Generate Quiz Queue
  useEffect(() => {
    if (!appState || !library) return;

    const dueWordIds = getDueWords(appState, library);

    if (dueWordIds.length === 0) {
      setIsSessionComplete(true);
      setQuizQueue([]);
      return;
    }

    const batchIds = dueWordIds.slice(0, ITEMS_PER_QUIZ_BATCH);
    
    const newQueue: QuizItem[] = batchIds.map(id => {
      const data = library[id];
      const randomIndex = Math.floor(Math.random() * (data.Beschreibung.length || 1));
      return {
        wordId: id,
        data: data,
        descriptionIndex: randomIndex
      };
    });

    setQuizQueue(newQueue);
    setCurrentRatings({});
    setIsSessionComplete(false);
  }, [appState, library]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [quizQueue]);

  const handleRate = useCallback((wordId: string, rating: 'remember' | 'forget') => {
    setCurrentRatings(prev => ({
      ...prev,
      [wordId]: rating
    }));
  }, []);

  const handleSubmitBatch = async () => {
    if (!appState) return;

    let newState = { ...appState };
    
    Object.entries(currentRatings).forEach(([wordId, rating]) => {
      newState = updateWordProgress(newState, wordId, rating as 'remember' | 'forget');
    });

    // Optimistic update
    setAppState(newState);
    // Save to Backend
    await saveUserState(newState);
  };

  const totalDue = (appState && library) ? getDueWords(appState, library).length : 0;
  const completedToday = appState ? appState.dailyUniqueWords.filter(id => {
    const p = appState.progress[id];
    return p && (p.status === 'mastered_today' || p.status === 'failed_today');
  }).length : 0;

  const allRatingsComplete = quizQueue.length > 0 && quizQueue.every(item => currentRatings[item.wordId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Laden...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        
        <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tägliche Sitzung</h2>
            <p className="text-sm text-slate-500">
              {isSessionComplete 
                ? "Alles erledigt für heute!" 
                : `${totalDue} Wörter verbleiben`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-600">{completedToday}</div>
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Erledigt</div>
          </div>
        </div>

        {isSessionComplete ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl shadow border border-slate-100">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Fantastische Arbeit!</h3>
            <p className="text-slate-600 max-w-md mb-8">
              Du hast alle Karten für heute bearbeitet. Komm morgen wieder!
            </p>
          </div>
        ) : (
          <div className="space-y-8 pb-24">
             {quizQueue.map((item) => (
               <FlipCard 
                 key={item.wordId}
                 wordId={item.wordId}
                 data={item.data}
                 descriptionIndex={item.descriptionIndex}
                 onRate={(rating) => handleRate(item.wordId, rating)}
                 initialRating={currentRatings[item.wordId]}
               />
             ))}
          </div>
        )}
      </main>

      {!isSessionComplete && (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-slate-500 hidden sm:block">
              Überprüfe alle Karten oben vor dem Absenden.
            </div>
            <button
              onClick={handleSubmitBatch}
              disabled={!allRatingsComplete}
              className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all transform active:scale-95 ${
                allRatingsComplete 
                  ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200 cursor-pointer' // Added cursor-pointer
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {allRatingsComplete ? 'Bestätigen & Weiter' : `Noch ${quizQueue.length - Object.keys(currentRatings).length} bewerten`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;