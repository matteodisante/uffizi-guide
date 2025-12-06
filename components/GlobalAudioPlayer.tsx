import React, { useEffect, useRef, useState } from 'react';
import { pcmToWav, base64ToUint8Array } from '../services/audioUtils';
import { AudioTrack } from '../types';

interface Props {
    track: AudioTrack | null;
    onNext?: () => void;
    onPrev?: () => void;
    onClose?: () => void; // To minimize or dismiss
}

const SPEEDS = [0.75, 1.0, 1.25, 1.5];

export const GlobalAudioPlayer: React.FC<Props> = ({ track, onNext, onPrev }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [speed, setSpeed] = useState(1.0);

    // Asset Loading Logic (Simulated Cloud Stream)
    useEffect(() => {
        if (track?.url) {
            // In a real app, track.url would be an S3 HTTPS link.
            // Here, it is likely a Base64 string from cache that we need to convert to Blob URL.
            // Let's assume the service passes a Base64 string in 'url' for now.
            try {
                const pcmData = base64ToUint8Array(track.url);
                const wavBlob = pcmToWav(pcmData, 24000);
                const objectUrl = URL.createObjectURL(wavBlob);
                setAudioSrc(objectUrl);
                setIsPlaying(true);
                return () => URL.revokeObjectURL(objectUrl);
            } catch (e) {
                console.error("Audio processing failed", e);
            }
        }
    }, [track]);

    // Playback Logic
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.play().catch(console.error);
            else audioRef.current.pause();
        }
    }, [isPlaying, audioSrc]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = speed;
    }, [speed]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(pct || 0);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = (val / 100) * audioRef.current.duration;
            setProgress(val);
        }
    };

    if (!track) return null;

    // MINI PLAYER VIEW
    if (!expanded) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-[0_-5px_20px_rgba(0,0,0,0.1)] border-t border-stone-200 p-3 pb-6 md:pb-3 animate-slide-up cursor-pointer" onClick={() => setExpanded(true)}>
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    {/* Progress Bar Top */}
                    <div className="absolute top-0 left-0 h-1 bg-red-800 transition-all duration-300" style={{ width: `${progress}%` }}></div>

                    {/* Image Thumbnail */}
                    <div className="w-10 h-10 rounded bg-stone-200 overflow-hidden shrink-0">
                         {track.imageUrl ? <img src={track.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-stone-800"></div>}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-stone-900 truncate">{track.title}</h4>
                        <p className="text-xs text-stone-500 truncate">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 flex items-center justify-center bg-stone-900 text-white rounded-full">
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                    </div>
                </div>
                <audio ref={audioRef} src={audioSrc || undefined} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} hidden />
            </div>
        );
    }

    // EXPANDED VIEW
    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-stone-100">
                <button onClick={() => setExpanded(false)} className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-full">
                    <i className="fas fa-chevron-down"></i>
                </button>
                <span className="text-xs font-bold tracking-widest uppercase text-stone-400">In Riproduzione</span>
                <div className="w-8"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-64 h-64 md:w-80 md:h-80 bg-stone-100 rounded-2xl shadow-2xl overflow-hidden mb-4">
                    {track.imageUrl && <img src={track.imageUrl} className="w-full h-full object-cover" />}
                </div>
                
                <div>
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">{track.title}</h2>
                    <p className="text-lg text-stone-500 italic">{track.artist}</p>
                    {track.isCuriosity && <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded uppercase">Curiosità</span>}
                </div>

                {/* Scrubber */}
                <div className="w-full max-w-md space-y-2">
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={progress} 
                        onChange={handleSeek}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-red-800"
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-8 mt-8">
                     <button onClick={onPrev} className="text-stone-400 hover:text-stone-800 text-2xl">
                        <i className="fas fa-step-backward"></i>
                    </button>
                    
                    <button onClick={() => {
                        if (audioRef.current) audioRef.current.currentTime -= 10;
                    }} className="text-stone-400 hover:text-stone-800">
                        <i className="fas fa-rotate-left"></i>
                    </button>

                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-20 h-20 bg-red-800 text-white rounded-full flex items-center justify-center shadow-2xl text-3xl hover:bg-red-900 transition transform hover:scale-105"
                    >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>

                    <button onClick={() => {
                        if (audioRef.current) audioRef.current.currentTime += 10;
                    }} className="text-stone-400 hover:text-stone-800">
                        <i className="fas fa-rotate-right"></i>
                    </button>

                    <button onClick={onNext} className="text-stone-400 hover:text-stone-800 text-2xl">
                        <i className="fas fa-step-forward"></i>
                    </button>
                </div>
                
                {/* Speed Toggle */}
                <div className="flex gap-2 justify-center mt-4">
                    {SPEEDS.map(s => (
                        <button 
                            key={s} 
                            onClick={() => setSpeed(s)} 
                            className={`text-xs px-3 py-1 rounded-full border ${speed === s ? 'bg-stone-800 text-white border-stone-800' : 'text-stone-500 border-stone-200'}`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>
            
            <audio ref={audioRef} src={audioSrc || undefined} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} hidden />
        </div>
    );
};