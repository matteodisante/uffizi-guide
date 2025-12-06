import React, { useState } from 'react';
import { Artwork } from '../types';

interface Props {
    artworks: Artwork[];
    currentArtworkId: string;
    onSelectArtwork: (id: string) => void;
    onClose?: () => void;
}

export const InteractiveMap: React.FC<Props> = ({ artworks, currentArtworkId, onSelectArtwork, onClose }) => {
    const [floor, setFloor] = useState<2 | 1>(2); // Start on 2nd floor (Start of tour)

    // Filter artworks by floor based on approximate room numbers
    // Floor 2: Rooms 1-45 (Gothic, Renaissance)
    // Floor 1: Rooms 46-101 (Mannerism, Baroque)
    const floorArtworks = artworks.filter(a => {
        const room = parseInt(a.room);
        if (floor === 2) return room <= 45;
        return room > 45;
    });

    return (
        <div className="fixed inset-0 z-40 bg-stone-100 flex flex-col animate-fade-in">
            {/* Map Header */}
            <div className="bg-white p-4 shadow-sm flex justify-between items-center">
                <h2 className="font-serif font-bold text-lg text-stone-900">Mappa Galleria</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setFloor(2)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${floor === 2 ? 'bg-red-800 text-white' : 'bg-stone-200 text-stone-500'}`}
                    >
                        Piano 2
                    </button>
                    <button 
                        onClick={() => setFloor(1)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${floor === 1 ? 'bg-red-800 text-white' : 'bg-stone-200 text-stone-500'}`}
                    >
                        Piano 1
                    </button>
                </div>
                {onClose && (
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-600">
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>

            {/* SVG Map Container */}
            <div className="flex-1 overflow-auto p-4 relative flex items-center justify-center bg-stone-100">
                <svg viewBox="0 0 400 600" className="w-full max-w-md h-auto drop-shadow-xl">
                    {/* Building Outline (U-Shape) */}
                    <path d="M 50 550 L 50 50 L 350 50 L 350 550" fill="none" stroke="#d6d3d1" strokeWidth="40" strokeLinecap="round" />
                    <path d="M 50 550 L 50 50 L 350 50 L 350 550" fill="none" stroke="white" strokeWidth="36" strokeLinecap="round" />

                    {/* Labels */}
                    <text x="200" y="30" textAnchor="middle" fontSize="10" fill="#78716c" fontWeight="bold">CORRIDOIO SUD (ARNO)</text>
                    
                    {/* Rooms Visualization (Simplified Grid along the U) */}
                    {/* East Wing (Left in SVG for vertical layout logic, let's assume Left is East Corridor entrance side for simplicity) */}
                    
                    {/* Render Rooms based on Floor */}
                    {floor === 2 ? (
                        <>
                            <text x="50" y="580" textAnchor="middle" fontSize="12" fill="#b91c1c" fontWeight="bold">START (Piano 2)</text>
                            {/* Early Renaissance Rooms (Left Side) */}
                            <RoomBox x={35} y={400} label="2-7" />
                            <RoomBox x={35} y={300} label="8-9" />
                            <RoomBox x={35} y={200} label="10-14" />
                            {/* Connector */}
                            <RoomBox x={200} y={50} label="Corridoio" width={150} height={20} />
                            {/* High Renaissance (Right Side) */}
                            <RoomBox x={335} y={200} label="15-24" />
                            <RoomBox x={335} y={300} label="25-34" />
                            <RoomBox x={335} y={400} label="35-45" />
                        </>
                    ) : (
                        <>
                            <text x="350" y="580" textAnchor="middle" fontSize="12" fill="#b91c1c" fontWeight="bold">EXIT (Piano 1)</text>
                            {/* Mannerism (Left Side) */}
                            <RoomBox x={35} y={200} label="46-55" />
                            <RoomBox x={35} y={300} label="56-65" />
                            {/* Baroque (Right Side) */}
                            <RoomBox x={335} y={200} label="90-95" />
                            <RoomBox x={335} y={300} label="66-89" />
                        </>
                    )}

                    {/* Plot Artworks */}
                    {floorArtworks.map((art, i) => {
                        // Very basic coordinate mapping logic for demo
                        // In production, each Room ID would have a fixed X,Y
                        const roomNum = parseInt(art.room);
                        let cx = 50;
                        let cy = 500;
                        
                        if (floor === 2) {
                            if (roomNum <= 10) { cx = 50; cy = 550 - (roomNum * 25); }
                            else if (roomNum <= 45) { cx = 350; cy = 100 + ((roomNum - 15) * 12); }
                        } else {
                             if (roomNum <= 65) { cx = 50; cy = 100 + ((roomNum - 46) * 15); }
                             else { cx = 350; cy = 500 - ((roomNum - 80) * 15); }
                        }

                        const isActive = art.id === currentArtworkId;

                        return (
                            <g key={art.id} onClick={() => onSelectArtwork(art.id)} className="cursor-pointer hover:opacity-80">
                                <circle 
                                    cx={cx} cy={cy} 
                                    r={isActive ? 12 : 8} 
                                    fill={isActive ? "#ef4444" : "#292524"} 
                                    stroke="white" strokeWidth="2"
                                />
                                {isActive && (
                                    <circle cx={cx} cy={cy} r="16" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-ping" />
                                )}
                                <text x={cx + 15} y={cy + 4} fontSize="10" fill="#1c1917" fontWeight="bold" className="bg-white/80">
                                    {art.room}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            
            <div className="bg-white p-4 text-center text-xs text-stone-500 border-t">
                Tocca un punto per andare all'opera
            </div>
        </div>
    );
};

const RoomBox = ({ x, y, label, width = 30, height = 30 }: any) => (
    <g>
        <rect x={x} y={y} width={width} height={height} fill="#e7e5e4" stroke="#d6d3d1" rx="4" />
        <text x={x + width/2} y={y + height/2 + 4} textAnchor="middle" fontSize="8" fill="#78716c">{label}</text>
    </g>
);