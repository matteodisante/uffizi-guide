import React, { useEffect, useRef, useState } from 'react';
import { pcmToWav, base64ToUint8Array } from '../services/audioUtils';
import { AudioTrack } from '../types';

interface Props {
    track: AudioTrack | null;
    isLoading?: boolean;
    onNext?: () => void;
    onPrev?: () => void;
}

const SPEEDS = [0.75, 1.0, 1.25, 1.5];

export const GlobalAudioPlayer: React.FC<Props> = ({ track, isLoading, onNext, onPrev }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    
    // Store current track ID to prevent reloading same audio on re-renders
    const currentTrackIdRef = useRef<string | null>(null);

    // Asset Loading Logic
    useEffect(() => {
        if (track?.url && track.id !== currentTrackIdRef.current) {
            try {
                // Revoke old URL to avoid memory leaks
                if (audioSrc) URL.revokeObjectURL(audioSrc);

                const pcmData = base64ToUint8Array(track.url);
                // Gemini TTS default: 24kHz
                const wavBlob = pcmToWav(pcmData, 24000);
                const objectUrl = URL.createObjectURL(wavBlob);
                
                setAudioSrc(objectUrl);
                currentTrackIdRef.current = track.id;
                setIsPlaying(true);
                
            } catch (e) {
                console.error("Audio processing failed", e);
            }
        }
        // Handle "Pending" state where we have metadata but no audio yet
        else if (track && !track.url) {
            setAudioSrc(null);
            currentTrackIdRef.current = track.id;
        }
        // If track is null, clear player
        else if (!track) {
            setAudioSrc(null);
            currentTrackIdRef.current = null;
        }
    }, [track?.id, track?.url]);

    // Playback Sync
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => console.error("Auto-play prevented:", error));
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, audioSrc]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = speed;
    }, [speed]);

    const handleTimeUpdate = () => {
        if (audioRef.current && audioRef.current.duration) {
            const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(pct || 0);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            audioRef.current.currentTime = (val / 100) * audioRef.current.duration;
            setProgress(val);
        }
    };

    // LOADING STATE (Mini Player Placeholder)
    if (isLoading && !track) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 p-4 animate-pulse shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 text-stone-500">
                    <i className="fas fa-circle-notch fa-spin text-red-800"></i>
                    <span className="font-bold text-xs uppercase tracking-widest">Generazione Audio in corso...</span>
                </div>
            </div>
        );
    }

    if (!track) return null;

    // MINI PLAYER VIEW
    if (!expanded) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-[0_-5px_20px_rgba(0,0,0,0.1)] border-t border-stone-200 p-3 pb-6 md:pb-3 animate-slide-up cursor-pointer transition-all hover:bg-stone-50" onClick={() => setExpanded(true)}>
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <div className="absolute top-0 left-0 h-1 bg-red-800 transition-all duration-300" style={{ width: `${progress}%` }}></div>

                    <div className="w-10 h-10 rounded bg-stone-200 overflow-hidden shrink-0 relative">
                         {track.imageUrl ? <img src={track.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-stone-800"></div>}
                         {isLoading && (
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                 <i className="fas fa-circle-notch fa-spin text-white text-xs"></i>
                             </div>
                         )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-stone-900 truncate">{track.title}</h4>
                        <p className="text-xs text-stone-500 truncate">{isLoading ? 'Aggiornamento...' : track.artist}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 flex items-center justify-center bg-stone-900 text-white rounded-full shadow-lg hover:bg-black transition">
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
            <div className="p-4 flex justify-between items-center border-b border-stone-100 bg-stone-50/50 backdrop-blur">
                <button onClick={() => setExpanded(false)} className="w-10 h-10 flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-full transition">
                    <i className="fas fa-chevron-down"></i>
                </button>
                <span className="text-xs font-bold tracking-widest uppercase text-stone-400">In Riproduzione</span>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 overflow-y-auto">
                <div className="w-64 h-64 md:w-80 md:h-80 bg-stone-100 rounded-2xl shadow-2xl overflow-hidden mb-4 relative ring-1 ring-stone-900/5">
                    {track.imageUrl && <img src={track.imageUrl} className="w-full h-full object-cover" />}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                             <div className="bg-white/90 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                                <i className="fas fa-circle-notch fa-spin text-red-800"></i>
                                <span className="text-xs font-bold text-stone-800">Caricamento...</span>
                             </div>
                        </div>
                    )}
                </div>
                
                <div className="max-w-md w-full">
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1 leading-tight">{track.title}</h2>
                    <p className="text-lg text-stone-500 italic">{track.artist}</p>
                    {track.isCuriosity && <span className="inline-block mt-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Curiosità</span>}
                </div>

                <div className="w-full max-w-md space-y-2">
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={progress} 
                        onChange={handleSeek}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-red-800"
                    />
                     <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                        <span>{audioRef.current ? Math.floor(audioRef.current.currentTime / 60) + ':' + ('0'+Math.floor(audioRef.current.currentTime % 60)).slice(-2) : '0:00'}</span>
                        <span>{audioRef.current ? Math.floor(audioRef.current.duration / 60) + ':' + ('0'+Math.floor(audioRef.current.duration % 60)).slice(-2) : '-:-'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 md:gap-8 mt-4">
                     <button onClick={onPrev} className="text-stone-400 hover:text-stone-800 text-2xl p-2 transition">
                        <i className="fas fa-step-backward"></i>
                    </button>
                    
                    <button onClick={() => {
                        if (audioRef.current) audioRef.current.currentTime -= 10;
                    }} className="text-stone-400 hover:text-stone-800 p-2 transition">
                        <i className="fas fa-rotate-left"></i>
                    </button>

                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-20 h-20 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-2xl text-3xl hover:bg-black hover:scale-105 active:scale-95 transition-all"
                    >
                        {isLoading ? (
                             <i className="fas fa-circle-notch fa-spin text-xl"></i>
                        ) : (
                             <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ml-1`}></i>
                        )}
                    </button>

                    <button onClick={() => {
                        if (audioRef.current) audioRef.current.currentTime += 10;
                    }} className="text-stone-400 hover:text-stone-800 p-2 transition">
                        <i className="fas fa-rotate-right"></i>
                    </button>

                    <button onClick={onNext} className="text-stone-400 hover:text-stone-800 text-2xl p-2 transition">
                        <i className="fas fa-step-forward"></i>
                    </button>
                </div>
                
                <div className="flex gap-2 justify-center mt-6">
                    {SPEEDS.map(s => (
                        <button 
                            key={s} 
                            onClick={() => setSpeed(s)} 
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${speed === s ? 'bg-red-800 text-white border-red-800' : 'text-stone-500 border-stone-200 hover:border-stone-400'}`}
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