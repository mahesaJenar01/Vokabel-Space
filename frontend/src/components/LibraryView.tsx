import React, { useState, useMemo } from 'react';
import type { AppState, Library } from '../types';

interface LibraryViewProps {
  library: Library;
  appState: AppState;
  onToggleHard: (wordId: string) => void;
}

type FilterType = 'all' | 'hard' | 'longest_due' | 'highest_interval' | 'reviewed_today';

const PAGE_SIZE = 50;

const LibraryView: React.FC<LibraryViewProps> = ({ library, appState, onToggleHard }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Combine Library and Progress data
  // Dependent on appState.progress, so it updates immediately when App state updates
  const processedData = useMemo(() => {
    return Object.entries(library).map(([key, data]) => {
      const progress = appState.progress[key];
      return {
        id: key,
        data,
        progress: progress || null,
        isHard: progress?.isHard || false,
        dueDate: progress?.dueDate || 0,
        interval: progress?.interval || 0,
        status: progress?.status || 'new',
      };
    });
  }, [library, appState.progress]);

  // Apply Filter and Sorting
  const filteredData = useMemo(() => {
    let result = processedData;

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.id.toLowerCase().includes(lower) || 
        item.data.Bedeutung.Englisch.some(m => m.toLowerCase().includes(lower)) ||
        item.data.Bedeutung.Indonesisch.some(m => m.toLowerCase().includes(lower))
      );
    }

    // Category Filter & Sorting
    switch (filter) {
      case 'hard':
        result = result.filter(item => item.isHard);
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
      
      case 'longest_due':
        result = result.filter(item => item.dueDate > 0);
        result.sort((a, b) => b.dueDate - a.dueDate);
        break;

      case 'highest_interval':
        result = result.filter(item => item.interval > 0);
        result.sort((a, b) => b.interval - a.interval);
        break;

      case 'reviewed_today':
        result = result.filter(item => 
          item.status === 'mastered_today' || item.status === 'failed_today'
        );
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;

      case 'all':
      default:
        result.sort((a, b) => a.id.localeCompare(b.id));
        break;
    }

    return result;
  }, [processedData, filter, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return '-';
    return new Date(timestamp).toLocaleDateString('de-DE', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <input 
              type="text"
              placeholder="Suchen (Wort oder Bedeutung)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page on search
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select 
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterType);
              setCurrentPage(1);
            }}
            className="py-2 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="all">Alle Wörter (A-Z)</option>
            <option value="hard">Schwierige Wörter</option>
            <option value="longest_due">Am längsten fällig (Datum)</option>
            <option value="highest_interval">Höchstes Intervall (Tage)</option>
            <option value="reviewed_today">Heute gelernt</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12 text-center">Hard</th>
                <th className="px-6 py-4">Wort</th>
                <th className="px-6 py-4">Bedeutung (EN / ID)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Fällig am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onToggleHard(item.id)}
                        className={`focus:outline-none cursor-pointer transition-colors ${item.isHard ? 'text-red-500' : 'text-slate-200 hover:text-slate-300'}`}
                        title={item.isHard ? "Markierung entfernen" : "Als schwierig markieren"}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.401 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {item.id}
                      {item.data.Plural && <span className="block text-xs text-slate-400 mt-1">Pl: {item.data.Plural}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded uppercase">EN</span>
                           <span className="text-sm text-slate-600">{item.data.Bedeutung.Englisch.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded uppercase">ID</span>
                           <span className="text-sm text-slate-600">{item.data.Bedeutung.Indonesisch.join(', ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'new' && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Neu</span>}
                      {item.status === 'learning' && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Lernen</span>}
                      {item.status === 'review' && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">Wiederholen</span>}
                      {(item.status === 'mastered_today' || item.status === 'failed_today') && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Erledigt</span>
                      )}
                      {item.interval > 1 && <div className="text-xs text-slate-400 mt-1">{item.interval} Tage Intervall</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                      {formatDate(item.dueDate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Keine Wörter gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Zeige <span className="font-bold">{((currentPage - 1) * PAGE_SIZE) + 1}</span> bis <span className="font-bold">{Math.min(currentPage * PAGE_SIZE, filteredData.length)}</span> von <span className="font-bold">{filteredData.length}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
              >
                Zurück
              </button>
              <div className="flex items-center gap-1">
                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 5 && currentPage > 3) p = currentPage - 2 + i;
                    if (p > totalPages) return null;
                    
                    return (
                       <button
                         key={p}
                         onClick={() => setCurrentPage(p)}
                         className={`w-8 h-8 flex items-center justify-center text-sm rounded cursor-pointer ${currentPage === p ? 'bg-brand-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-600'}`}
                       >
                         {p}
                       </button>
                    );
                 })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;