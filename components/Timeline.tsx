import React from 'react';
import { Artwork } from '../types';

interface TimelineProps {
    artworks: Artwork[];
    currentIndex: number;
    onSelect: (index: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ artworks, currentIndex, onSelect }) => {
    return (
        <div className="w-full bg-stone-900 text-white p-4 shadow-lg overflow-x-auto">
            <h3 className="text-xs font-serif uppercase tracking-widest text-stone-400 mb-3 sticky left-0">Mappa Percorso</h3>
            <div className="flex items-center gap-4 min-w-max pb-2">
                {artworks.map((art, idx) => {
                    const isActive = idx === currentIndex;
                    const isPast = idx < currentIndex;
                    
                    return (
                        <div key={art.id} className="group relative flex flex-col items-center cursor-pointer" onClick={() => onSelect(idx)}>
                            {/* Connector Line */}
                            {idx < artworks.length - 1 && (
                                <div className={`absolute top-3 left-1/2 w-full h-0.5 ${idx < currentIndex ? 'bg-red-800' : 'bg-stone-700'}`} style={{ width: 'calc(100% + 1rem)' }}></div>
                            )}
                            
                            {/* Dot/Node */}
                            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                ${isActive ? 'bg-red-600 border-red-400 scale-125 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 
                                  isPast ? 'bg-red-900 border-red-800' : 'bg-stone-800 border-stone-600 group-hover:border-stone-400'}
                            `}>
                                {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>

                            {/* Label */}
                            <div className={`mt-2 text-xs font-medium max-w-[80px] text-center truncate transition-colors
                                ${isActive ? 'text-white' : isPast ? 'text-stone-500' : 'text-stone-600 group-hover:text-stone-400'}
                            `}>
                                {art.title}
                            </div>
                            
                            {/* Period Tooltip (Small Context) */}
                            <div className="text-[10px] text-stone-500 uppercase tracking-tighter mt-0.5">
                                {art.period.split(' ')[0]}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};