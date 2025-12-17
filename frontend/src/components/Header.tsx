import React from 'react';

interface HeaderProps {
  currentView: 'quiz' | 'library';
  onViewChange: (view: 'quiz' | 'library') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            V
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">VokabelSpace</h1>
        </div>
        
        <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => onViewChange('quiz')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
              currentView === 'quiz' 
                ? 'bg-white text-brand-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Lernen
          </button>
          <button
            onClick={() => onViewChange('library')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
              currentView === 'library' 
                ? 'bg-white text-brand-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Bibliothek
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;