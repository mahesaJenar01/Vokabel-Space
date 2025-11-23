import React, { useState, useEffect } from 'react';
import type { VocabularyItem } from '../types';

interface FlipCardProps {
  wordId: string;
  data: VocabularyItem;
  descriptionIndex: number;
  onRate: (rating: 'remember' | 'forget') => void;
  initialRating?: 'remember' | 'forget' | null;
}

const FlipCard: React.FC<FlipCardProps> = ({ wordId, data, descriptionIndex, onRate, initialRating }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rating, setRating] = useState<'remember' | 'forget' | null>(initialRating || null);

  useEffect(() => {
    setIsFlipped(false);
    setRating(initialRating || null);
  }, [wordId, initialRating]);

  const handleRating = (e: React.MouseEvent, type: 'remember' | 'forget') => {
    e.stopPropagation(); 
    setRating(type);
    onRate(type);
  };

  const description = data.Beschreibung[descriptionIndex] || data.Beschreibung[0];

  return (
    <div 
      className="relative w-full h-96 perspective-1000 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side */}
        <div className="absolute w-full h-full bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between backface-hidden border border-slate-200">
          
          {rating && (
            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide z-10 ${rating === 'remember' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {rating === 'remember' ? 'Erinnern' : 'Vergessen'}
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center items-center text-center overflow-y-auto">
            <div className="text-sm uppercase tracking-widest text-slate-400 font-bold mb-4">Beschreibung</div>
            <p className="text-xl text-slate-700 leading-relaxed font-medium">
              "{description}"
            </p>
            <p className="mt-6 text-xs text-slate-400 italic">Tippen zum Aufdecken</p>
          </div>

          {/* Action Buttons - Front */}
          <div className="mt-4 flex gap-3 pt-4 border-t border-slate-100 w-full">
            <button
              onClick={(e) => handleRating(e, 'forget')}
              className={`flex-1 py-3 rounded-lg font-bold transition-colors text-sm cursor-pointer ${
                rating === 'forget' 
                  ? 'bg-danger text-white ring-2 ring-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Vergessen
            </button>
            <button
              onClick={(e) => handleRating(e, 'remember')}
              className={`flex-1 py-3 rounded-lg font-bold transition-colors text-sm cursor-pointer ${
                rating === 'remember' 
                  ? 'bg-success text-white ring-2 ring-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Erinnern
            </button>
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute w-full h-full bg-slate-900 text-white rounded-xl shadow-xl p-6 flex flex-col backface-hidden rotate-y-180 overflow-y-auto">
          <div className="text-center mb-6 border-b border-slate-700 pb-4">
            <h2 className="text-3xl font-bold text-brand-500 mb-1">{wordId}</h2>
            {data.Plural && <p className="text-sm text-slate-400">Plural: {data.Plural}</p>}
          </div>

          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 uppercase">Englisch</span>
                <p className="font-medium">{data.Bedeutung.Englisch.join(', ')}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase">Indonesisch</span>
                <p className="font-medium">{data.Bedeutung.Indonesisch.join(', ')}</p>
              </div>
            </div>

            {data.Konjugation && (
              <div className="bg-slate-800 p-3 rounded text-sm">
                <span className="text-xs text-slate-500 uppercase block mb-1">Konjugation</span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(data.Konjugation).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-slate-400 text-xs">{key}:</span> <span className="text-brand-300">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Back */}
          <div className="mt-6 flex gap-3 pt-2 border-t border-slate-700">
            <button
              onClick={(e) => handleRating(e, 'forget')}
              className={`flex-1 py-3 rounded-lg font-bold transition-colors cursor-pointer ${
                rating === 'forget' 
                  ? 'bg-danger text-white ring-2 ring-white' 
                  : 'bg-slate-800 text-danger hover:bg-slate-700'
              }`}
            >
              Vergessen
            </button>
            <button
              onClick={(e) => handleRating(e, 'remember')}
              className={`flex-1 py-3 rounded-lg font-bold transition-colors cursor-pointer ${
                rating === 'remember' 
                  ? 'bg-success text-white ring-2 ring-white' 
                  : 'bg-slate-800 text-success hover:bg-slate-700'
              }`}
            >
              Erinnern
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FlipCard;