import React, { useEffect, useRef, useState } from 'react';
import { pcmToWav, base64ToUint8Array } from '../services/audioUtils';

interface AudioPlayerProps {
    base64Audio: string | null;
    isLoading: boolean;
    onEnded: () => void;
}

const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio, isLoading, onEnded }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);

    // Convert Base64 PCM to WAV Blob URL when audio changes
    useEffect(() => {
        if (base64Audio) {
            try {
                const pcmData = base64ToUint8Array(base64Audio);
                // Gemini TTS default: 24kHz
                const wavBlob = pcmToWav(pcmData, 24000); 
                const url = URL.createObjectURL(wavBlob);
                setAudioSrc(url);
                
                // Reset state
                setCurrentTime(0);
                setIsPlaying(true); // Auto-play when loaded
                
                return () => {
                    URL.revokeObjectURL(url);
                };
            } catch (e) {
                console.error("Error converting audio", e);
            }
        } else {
            setAudioSrc(null);
        }
    }, [base64Audio]);

    // Handle HTML Audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => {
            setIsPlaying(false);
            onEnded();
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioSrc, onEnded]);

    // Sync Playback Rate
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    // Play/Pause effect
    useEffect(() => {
        if (audioRef.current && audioSrc) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Play error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, audioSrc]);

    const formatTime = (time: number) => {
        if (isNaN(time)) return "00:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-24 bg-stone-100 rounded-lg animate-pulse flex items-center justify-center text-stone-400">
                <i className="fas fa-compact-disc fa-spin mr-2"></i> Generazione Audio...
            </div>
        );
    }

    if (!audioSrc) {
        return <div className="text-center text-stone-400 text-sm py-2">Audio non disponibile</div>;
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-md border border-stone-200">
            <audio ref={audioRef} src={audioSrc} hidden />
            
            {/* Timeline */}
            <div className="flex items-center gap-3 text-xs text-stone-500 font-mono mb-2">
                <span>{formatTime(currentTime)}</span>
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-red-700"
                />
                <span>{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
                {/* Speed Control */}
                <div className="relative group">
                    <button className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded hover:bg-stone-200 transition">
                        {playbackRate}x
                    </button>
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col bg-white shadow-lg rounded border border-stone-100 p-1 z-10">
                        {speeds.map(s => (
                            <button 
                                key={s} 
                                onClick={() => setPlaybackRate(s)}
                                className={`text-xs px-3 py-1 text-left hover:bg-red-50 ${playbackRate === s ? 'font-bold text-red-700' : 'text-stone-600'}`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => skip(-10)} className="text-stone-500 hover:text-red-700 transition">
                        <i className="fas fa-rotate-left fa-lg"></i>
                    </button>
                    
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)} 
                        className="w-12 h-12 bg-red-800 text-white rounded-full flex items-center justify-center hover:bg-red-900 transition shadow-lg transform hover:scale-105 active:scale-95"
                    >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} fa-lg`}></i>
                    </button>
                    
                    <button onClick={() => skip(10)} className="text-stone-500 hover:text-red-700 transition">
                        <i className="fas fa-rotate-right fa-lg"></i>
                    </button>
                </div>
                
                {/* Spacer for balance */}
                <div className="w-8"></div> 
            </div>
        </div>
    );
};