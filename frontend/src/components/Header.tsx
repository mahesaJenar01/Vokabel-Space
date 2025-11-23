import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            V
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">VokabelSpace</h1>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Deutsch Vokabeltrainer
        </div>
      </div>
    </header>
  );
};

export default Header;