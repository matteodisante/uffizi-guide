import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, Artwork, TourPlan, Curiosity } from './types';
import { generateTourPlan, getArtworkDetailsWithCache, getAudioSpeechWithCache, replanTour } from './services/geminiService';
import { AudioPlayer } from './components/AudioPlayer';
import { Timeline } from './components/Timeline';

const FLORENCE_BG = "https://images.unsplash.com/photo-1543429786-ed40b3cf60d6?q=80&w=2000&auto=format&fit=crop"; 

const App: React.FC = () => {
    const [state, setState] = useState<AppState>(AppState.SETUP);
    const [initialDuration, setInitialDuration] = useState<number>(120); // Default 2 hours
    const [plan, setPlan] = useState<TourPlan | null>(null);
    const [currentDetails, setCurrentDetails] = useState<{ fullContent: string, curiosities: Curiosity[], connectionContext: string } | null>(null);
    const [currentAudio, setCurrentAudio] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Replanning state
    const [showReplan, setShowReplan] = useState(false);
    const [replanTime, setReplanTime] = useState(60);
    const [isReplanning, setIsReplanning] = useState(false);

    // Curiosity Modal State
    const [selectedCuriosity, setSelectedCuriosity] = useState<Curiosity | null>(null);

    // ---- SETUP PHASE ----
    const handleStartTour = async () => {
        setState(AppState.LOADING_PLAN);
        try {
            const artworks = await generateTourPlan(initialDuration);
            setPlan({
                totalDurationMinutes: initialDuration,
                artworks,
                currentIndex: 0
            });
            setState(AppState.TOUR);
        } catch (e) {
            console.error(e);
            setError("Impossibile generare il tour. Controlla la connessione.");
            setState(AppState.ERROR);
        }
    };

    // ---- LOADING DETAILS FOR CURRENT STOP ----
    const loadCurrentStopDetails = useCallback(async () => {
        if (!plan) return;
        const artwork = plan.artworks[plan.currentIndex];
        const prevArtwork = plan.currentIndex > 0 ? plan.artworks[plan.currentIndex - 1] : undefined;
        
        // Reset 
        setLoadingDetail(true);

        try {
            // 1. Get Text Content (Cached)
            const details = await getArtworkDetailsWithCache(artwork, prevArtwork);
            setCurrentDetails(details);
            
            // Clear audio temporarily to show loading state specifically for audio if needed
            setCurrentAudio(null);

            // 2. Generate Audio (Cached)
            // Combine connection text + main content for a seamless audio experience
            const fullAudioText = `${details.connectionContext} ... ${details.fullContent}`;
            const audioBase64 = await getAudioSpeechWithCache(fullAudioText, artwork.id);
            setCurrentAudio(audioBase64);
            
        } catch (e) {
            console.error("Error loading details", e);
        } finally {
            setLoadingDetail(false);
        }
    }, [plan]);

    useEffect(() => {
        if (state === AppState.TOUR && plan) {
            loadCurrentStopDetails();
        }
    }, [plan?.currentIndex, state]); 

    // ---- NAVIGATION ----
    const handleJumpTo = (index: number) => {
        if(!plan) return;
        setPlan({ ...plan, currentIndex: index });
    }

    const handleNext = () => {
        if (!plan) return;
        if (plan.currentIndex < plan.artworks.length - 1) {
            setPlan({ ...plan, currentIndex: plan.currentIndex + 1 });
        }
    };

    const handlePrev = () => {
        if (!plan) return;
        if (plan.currentIndex > 0) {
            setPlan({ ...plan, currentIndex: plan.currentIndex - 1 });
        }
    };

    const handleReplan = async () => {
        if (!plan) return;
        setIsReplanning(true);
        try {
            const remaining = plan.artworks.slice(plan.currentIndex + 1);
            const newRoute = await replanTour(remaining, replanTime);
            
            const newArtworks = [
                ...plan.artworks.slice(0, plan.currentIndex + 1),
                ...newRoute
            ];
            
            setPlan({
                ...plan,
                artworks: newArtworks
            });
            setShowReplan(false);
        } catch (e) {
            console.error(e);
            alert("Errore nell'aggiornamento.");
        } finally {
            setIsReplanning(false);
        }
    };

    // ---- RENDERERS ----

    if (state === AppState.ERROR) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-stone-100 text-center font-serif">
                <div className="bg-white p-8 rounded shadow-xl">
                    <h1 className="text-2xl font-bold text-red-800 mb-2">Errore</h1>
                    <p className="text-stone-600 mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-stone-800 text-white rounded hover:bg-stone-700">Riprova</button>
                </div>
            </div>
        );
    }

    if (state === AppState.SETUP) {
        return (
            <div 
                className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
                style={{ backgroundImage: `url('${FLORENCE_BG}')` }}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
                <div className="relative bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-red-800 animate-fade-in">
                    <div className="text-center mb-6">
                        <i className="fas fa-landmark text-4xl text-red-800 mb-2"></i>
                        <h1 className="text-5xl font-serif text-stone-900 mb-2">Uffizi</h1>
                        <p className="text-stone-500 font-light tracking-widest uppercase text-sm">Smart Audio Guide</p>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                            <label className="block text-sm font-bold text-stone-700 mb-4 flex justify-between">
                                <span>Tempo a disposizione</span>
                                <span className="text-red-800 font-mono text-lg">{Math.floor(initialDuration / 60)}h {(initialDuration % 60) > 0 ? (initialDuration % 60) + 'm' : ''}</span>
                            </label>
                            <input 
                                type="range" 
                                min="30" 
                                max="240" 
                                step="15"
                                value={initialDuration}
                                onChange={(e) => setInitialDuration(parseInt(e.target.value))}
                                className="w-full h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-red-800 hover:accent-red-900 transition-all"
                            />
                            <div className="flex justify-between text-xs text-stone-400 mt-2 font-mono">
                                <span>30m</span>
                                <span>4h</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleStartTour}
                            className="w-full py-4 bg-red-900 hover:bg-red-950 text-white rounded-xl font-serif font-bold text-xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3"
                        >
                            <span>Entra nel Museo</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (state === AppState.LOADING_PLAN) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 font-serif">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-stone-200 border-t-red-800 rounded-full animate-spin"></div>
                    <i className="fas fa-paint-brush absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-stone-400"></i>
                </div>
                <h2 className="text-2xl mt-6 text-stone-800">Creazione Itinerario...</h2>
                <p className="text-stone-500 mt-2 font-sans text-sm">Stiamo curando la selezione delle opere per te.</p>
            </div>
        );
    }

    // ---- TOUR VIEW ----
    if (!plan) return null;
    const currentArtwork = plan.artworks[plan.currentIndex];

    // Fallback image if real one is missing or empty
    const displayImage = currentArtwork.imageUrl && currentArtwork.imageUrl.length > 10 
        ? currentArtwork.imageUrl 
        : `https://picsum.photos/seed/${currentArtwork.id}/800/600`; 

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
            
            {/* Top Interactive Timeline */}
            <div className="sticky top-0 z-40 bg-stone-900 shadow-md">
                <Timeline 
                    artworks={plan.artworks} 
                    currentIndex={plan.currentIndex} 
                    onSelect={handleJumpTo} 
                />
            </div>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 pb-40">
                
                {/* Historical Bridge / Context Header */}
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm flex gap-4 items-start animate-fade-in">
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-700 mt-1">
                        <i className="fas fa-link"></i>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1">Il Filo Conduttore</h4>
                        <p className="text-stone-700 italic text-sm leading-relaxed">
                             {loadingDetail ? "Analisi del contesto storico..." : currentDetails?.connectionContext || "Inizio del percorso."}
                        </p>
                    </div>
                </div>

                {/* Main Artwork Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">
                    
                    {/* Image Section */}
                    <div className="relative aspect-video md:aspect-[21/9] bg-stone-800 group overflow-hidden">
                        <img 
                            src={displayImage} 
                            alt={currentArtwork.title} 
                            className="w-full h-full object-contain md:object-cover transition duration-1000 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                        
                        <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white">
                            <div className="inline-block bg-red-800 text-white text-xs px-2 py-1 rounded mb-2 font-bold uppercase tracking-wider">
                                Sala {currentArtwork.room}
                            </div>
                            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight mb-1">{currentArtwork.title}</h1>
                            <p className="text-xl md:text-2xl text-stone-300 font-serif italic">{currentArtwork.artist}</p>
                            <p className="text-sm text-stone-400 mt-2">{currentArtwork.period}</p>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 md:p-10 space-y-8">
                        
                        {loadingDetail ? (
                             <div className="space-y-4 animate-pulse">
                                <div className="h-4 bg-stone-200 rounded w-full"></div>
                                <div className="h-4 bg-stone-200 rounded w-5/6"></div>
                                <div className="h-4 bg-stone-200 rounded w-4/6"></div>
                            </div>
                        ) : (
                            <>
                                <div className="prose prose-stone prose-lg max-w-none first-letter:text-4xl first-letter:font-serif first-letter:text-red-800 first-letter:mr-1 first-letter:float-left">
                                    {currentDetails?.fullContent}
                                </div>

                                {/* Curiosities Grid */}
                                {currentDetails?.curiosities && (
                                    <div className="mt-8">
                                        <h3 className="text-xl font-serif text-stone-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-lightbulb text-yellow-600"></i>
                                            Curiosità
                                        </h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {currentDetails.curiosities.map((c, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setSelectedCuriosity(c)}
                                                    className="text-left bg-stone-50 p-4 rounded-lg border border-stone-100 hover:border-red-200 hover:shadow-md hover:bg-white transition group h-full flex flex-col"
                                                >
                                                    <div className="text-red-800 mb-2 group-hover:scale-110 transition-transform origin-left">
                                                        <i className="fas fa-star"></i>
                                                    </div>
                                                    <h4 className="font-bold text-stone-900 mb-1 leading-tight">{c.title}</h4>
                                                    <p className="text-xs text-stone-500 line-clamp-2 mt-auto">Clicca per scoprire di più...</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200 p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <div className="max-w-3xl mx-auto flex flex-col gap-3">
                    <AudioPlayer 
                        base64Audio={currentAudio} 
                        isLoading={loadingDetail} 
                        onEnded={() => {}} 
                    />
                    
                    <div className="flex justify-between items-center px-2">
                        <button 
                             onClick={() => setShowReplan(!showReplan)}
                             className="text-stone-500 hover:text-stone-800 text-sm flex items-center gap-2"
                        >
                            <i className="fas fa-hourglass-half"></i>
                            <span className="hidden md:inline">Adatta tempo</span>
                        </button>

                        <div className="flex gap-4">
                            <button 
                                onClick={handlePrev} 
                                disabled={plan.currentIndex === 0}
                                className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-stone-200 disabled:opacity-30 transition"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <button 
                                onClick={handleNext} 
                                disabled={plan.currentIndex === plan.artworks.length - 1}
                                className="h-12 px-6 rounded-full bg-stone-900 text-white font-serif italic hover:bg-black disabled:opacity-30 transition shadow-lg flex items-center gap-2"
                            >
                                <span>Prossima Opera</span>
                                <i className="fas fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>

                     {/* Replan Popover */}
                     {showReplan && (
                        <div className="absolute bottom-full left-4 mb-4 bg-white p-5 rounded-xl shadow-2xl border border-stone-200 w-72 animate-fade-in-up">
                            <h4 className="font-serif font-bold text-stone-900 mb-1">Cambio di programma?</h4>
                            <p className="text-xs text-stone-500 mb-4">Ricalcola il percorso in base al tempo rimasto.</p>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <i className="fas fa-clock text-stone-400"></i>
                                <input 
                                    type="range" 
                                    min="15" 
                                    max="180" 
                                    step="15"
                                    value={replanTime}
                                    onChange={(e) => setReplanTime(parseInt(e.target.value))}
                                    className="flex-1 h-1 bg-stone-200 rounded accent-stone-900"
                                />
                                <span className="font-bold font-mono text-stone-900 w-12 text-right">{replanTime}m</span>
                            </div>
                            
                            <button 
                                onClick={handleReplan}
                                disabled={isReplanning}
                                className="w-full py-2 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:bg-stone-300 transition"
                            >
                                {isReplanning ? 'Ricalcolo...' : 'Aggiorna Itinerario'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CURIOSITY MODAL */}
            {selectedCuriosity && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedCuriosity(null)}
                    ></div>
                    
                    {/* Content */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full relative z-10 shadow-2xl animate-[fadeInUp_0.3s_ease-out]">
                        <button 
                            onClick={() => setSelectedCuriosity(null)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition"
                        >
                            <i className="fas fa-times fa-lg"></i>
                        </button>

                        <div className="mb-4">
                            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider mb-2">
                                Lo sapevi?
                            </span>
                            <h3 className="text-2xl font-serif font-bold text-stone-900">
                                {selectedCuriosity.title}
                            </h3>
                        </div>
                        
                        <div className="prose prose-stone">
                            <p className="text-stone-600 leading-relaxed text-lg">
                                {selectedCuriosity.description}
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-stone-100 flex justify-end">
                            <button 
                                onClick={() => setSelectedCuriosity(null)}
                                className="text-sm font-bold text-red-800 hover:text-red-950 uppercase tracking-wide"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");
const root = createRoot(rootElement);
root.render(<App />);