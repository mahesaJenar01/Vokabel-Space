import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FlipCard from './components/FlipCard';
import LibraryView from './components/LibraryView';
import type { AppState, QuizItem, Library, WordProgress } from './types';
import { getSessionState, getDueWords, updateWordProgress, ITEMS_PER_QUIZ_BATCH, getRandomDescriptionIndex } from './utils/srsLogic';
import { fetchLibrary, fetchUserState, saveUserState } from './api';

const App: React.FC = () => {
  const [library, setLibrary] = useState<Library | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [currentRatings, setCurrentRatings] = useState<Record<string, 'remember' | 'forget'>>({});
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Track last used description indices to avoid repetition
  const [lastDescriptionIndices, setLastDescriptionIndices] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('vokabel_last_descriptions');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Navigation State with Persistence
  const [currentView, setCurrentView] = useState<'quiz' | 'library'>(() => {
    const saved = localStorage.getItem('vokabel_view');
    return (saved === 'quiz' || saved === 'library') ? saved : 'quiz';
  });

  const changeView = (view: 'quiz' | 'library') => {
    setCurrentView(view);
    localStorage.setItem('vokabel_view', view);
  };

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
          // Clear quiz persistence on new day
          localStorage.removeItem('vokabel_current_quiz');
          localStorage.removeItem('vokabel_current_ratings');
        } else {
          // Try to restore quiz state from localStorage
          const savedQuiz = localStorage.getItem('vokabel_current_quiz');
          const savedRatings = localStorage.getItem('vokabel_current_ratings');
          
          if (savedQuiz && savedRatings) {
            try {
              const parsedQuiz = JSON.parse(savedQuiz);
              const parsedRatings = JSON.parse(savedRatings);
              
              // Validate that the saved quiz items exist in library
              const validQuiz = parsedQuiz.filter((item: QuizItem) => libData[item.wordId]);
              
              if (validQuiz.length > 0) {
                setQuizQueue(validQuiz);
                setCurrentRatings(parsedRatings);
              }
            } catch (e) {
              console.error('Failed to restore quiz state', e);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Save quiz state to localStorage whenever it changes
  useEffect(() => {
    if (quizQueue.length > 0) {
      localStorage.setItem('vokabel_current_quiz', JSON.stringify(quizQueue));
    }
  }, [quizQueue]);

  useEffect(() => {
    if (Object.keys(currentRatings).length > 0) {
      localStorage.setItem('vokabel_current_ratings', JSON.stringify(currentRatings));
    }
  }, [currentRatings]);

  // Save last description indices to localStorage
  useEffect(() => {
    localStorage.setItem('vokabel_last_descriptions', JSON.stringify(lastDescriptionIndices));
  }, [lastDescriptionIndices]);

  // Generate Quiz Queue
  useEffect(() => {
    if (!appState || !library) return;

    // Only regenerate queue if empty and session not marked complete
    if (quizQueue.length === 0 && !isSessionComplete) {
      const currentBatchWordIds = quizQueue.map(item => item.wordId);
      const dueWordIds = getDueWords(appState, library, currentBatchWordIds);

      if (dueWordIds.length === 0) {
        setIsSessionComplete(true);
        setQuizQueue([]);
        // Clear persisted quiz state
        localStorage.removeItem('vokabel_current_quiz');
        localStorage.removeItem('vokabel_current_ratings');
        return;
      }

      const batchIds = dueWordIds.slice(0, ITEMS_PER_QUIZ_BATCH);
      
      const newQueue: QuizItem[] = batchIds.map(id => {
        const data = library[id];
        const lastIndex = lastDescriptionIndices[id];
        const randomIndex = getRandomDescriptionIndex(data.Beschreibung, lastIndex);
        
        // Update last used index
        setLastDescriptionIndices(prev => ({
          ...prev,
          [id]: randomIndex
        }));
        
        return {
          wordId: id,
          data: data,
          descriptionIndex: randomIndex
        };
      });

      setQuizQueue(newQueue);
      setCurrentRatings({});
    }
  }, [appState, library, isSessionComplete, quizQueue.length, lastDescriptionIndices]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [quizQueue, currentView]);

  const handleRate = useCallback((wordId: string, rating: 'remember' | 'forget') => {
    setCurrentRatings(prev => ({
      ...prev,
      [wordId]: rating
    }));
  }, []);

  const handleHardToggle = useCallback(async (wordId: string) => {
    setAppState(prevState => {
      if (!prevState) return null;

      const existingProgress = prevState.progress[wordId];
      
      const newProgress: WordProgress = existingProgress 
        ? { ...existingProgress, isHard: !existingProgress.isHard } 
        : {
            id: wordId,
            interval: 0,
            dueDate: 0,
            lastMaxInterval: 0,
            status: 'new',
            todayFailCount: 0,
            todaySuccessCount: 0,
            history: [],
            isHard: true
          };

      const newState = {
        ...prevState,
        progress: {
          ...prevState.progress,
          [wordId]: newProgress
        }
      };

      // Save to Backend (fire and forget)
      saveUserState(newState);

      return newState;
    });
  }, []);

  const handleSubmitBatch = async () => {
    if (!appState) return;

    let newState = { ...appState };
    // Clone progress to ensure immutability
    newState.progress = { ...appState.progress };
    
    Object.entries(currentRatings).forEach(([wordId, rating]) => {
      newState = updateWordProgress(newState, wordId, rating as 'remember' | 'forget');
    });

    // Optimistic update
    setAppState(newState);
    setQuizQueue([]); // Clear queue to trigger regeneration or finish
    
    // Clear persisted quiz state since we're moving to next batch
    localStorage.removeItem('vokabel_current_quiz');
    localStorage.removeItem('vokabel_current_ratings');
    
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
      <Header currentView={currentView} onViewChange={changeView} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        {currentView === 'library' && library && appState ? (
          <LibraryView 
            library={library} 
            appState={appState} 
            onToggleHard={handleHardToggle}
          />
        ) : (
          <>
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
                <button 
                  onClick={() => changeView('library')}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition cursor-pointer"
                >
                  Bibliothek ansehen
                </button>
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
                     isHard={appState?.progress[item.wordId]?.isHard || false}
                     onToggleHard={() => handleHardToggle(item.wordId)}
                   />
                 ))}
              </div>
            )}
          </>
        )}
      </main>

      {currentView === 'quiz' && !isSessionComplete && (
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
                  ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200 cursor-pointer' 
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