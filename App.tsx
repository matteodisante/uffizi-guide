import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, Artwork, TourPlan, Curiosity, UserProfile, AudioState, DetailLevel, ArtworkContent, UserPacing } from './types';
import { generateTourPlan, getArtworkDetailsWithCache, getAudioSpeechWithCache, generateArtworkAnimation, prefetchArtworkData } from './services/geminiService';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer';
import { Timeline } from './components/Timeline';
import { Onboarding } from './components/Onboarding';
import { ImageWithLoader } from './components/ImageWithLoader';
import { InteractiveMap } from './components/InteractiveMap';

const App: React.FC = () => {
    // APP STATE
    const [state, setState] = useState<AppState>(AppState.ONBOARDING);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [plan, setPlan] = useState<TourPlan | null>(null);
    const [error, setError] = useState<string | null>(null);

    // CONTENT STATE
    const [contentData, setContentData] = useState<ArtworkContent | null>(null);
    const [detailLevel, setDetailLevel] = useState<DetailLevel>(DetailLevel.MEDIUM);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // VIDEO IMMERSION STATE
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [immersiveVideoUrl, setImmersiveVideoUrl] = useState<string | null>(null);

    // GLOBAL AUDIO STATE
    const [audioState, setAudioState] = useState<AudioState>({
        currentTrack: null,
        isPlaying: false,
        isLoading: false
    });

    const loadingIndexRef = useRef<number | null>(null);
    const currentAudioRequestId = useRef<string>("");

    const handleOnboardingComplete = async (userProfile: UserProfile) => {
        setProfile(userProfile);
        setDetailLevel(userProfile.defaultDetailLevel); 
        setState(AppState.LOADING_PLAN);
        try {
            const artworks = await generateTourPlan(userProfile);
            setPlan({
                totalDurationMinutes: userProfile.availableTime,
                artworks,
                currentIndex: 0
            });
            setState(AppState.TOUR);
        } catch (e) {
            console.error(e);
            setError("Errore nella generazione del tour.");
            setState(AppState.ERROR);
        }
    };

    const getCurrentText = (data: ArtworkContent, level: DetailLevel): string => {
        switch(level) {
            case DetailLevel.SHORT: return data.short;
            case DetailLevel.LONG: return data.long;
            case DetailLevel.MEDIUM: default: return data.medium;
        }
    };

    const playAudioForLevel = async (data: ArtworkContent, level: DetailLevel, artwork: Artwork) => {
        // Generate a unique ID for this specific request
        const requestId = `${artwork.id}_${level}_${Date.now()}`;
        currentAudioRequestId.current = requestId;

        // Prevent race conditions: if user switched artwork while this was loading
        if (loadingIndexRef.current !== null && plan && plan.artworks[loadingIndexRef.current].id !== artwork.id) {
            return; 
        }

        const textToRead = `${data.connectionContext} ... ${getCurrentText(data, level)}`;
        
        setAudioState(prev => ({ ...prev, isLoading: true }));
        try {
            const audioBase64 = await getAudioSpeechWithCache(textToRead, `${artwork.id}_${level}`);
            
            // Check if this request is still the most recent one
            if (currentAudioRequestId.current === requestId) {
                setAudioState({
                    isLoading: false,
                    isPlaying: true,
                    currentTrack: {
                        id: `${artwork.id}_${level}`, // Unique ID for cache
                        title: artwork.title,
                        artist: artwork.artist,
                        imageUrl: artwork.imageUrl,
                        url: audioBase64
                    }
                });
            }
        } catch (e) {
            console.error("Audio fail", e);
            if (currentAudioRequestId.current === requestId) {
                setAudioState(prev => ({ ...prev, isLoading: false }));
            }
        }
    };

    const loadContentForIndex = useCallback(async (index: number) => {
        if (!plan || !profile) return;
        
        loadingIndexRef.current = index;
        setIsLoadingDetails(true);
        setImmersiveVideoUrl(null); 
        
        const artwork = plan.artworks[index];
        const prev = index > 0 ? plan.artworks[index - 1] : undefined;

        // OPTIMISTIC AUDIO STATE UPDATE
        // This ensures the player shows the NEW artwork title immediately with a spinner
        // preventing the "disappearing player" effect.
        setAudioState(prev => ({
            ...prev,
            isLoading: true,
            currentTrack: {
                id: `pending_${artwork.id}`,
                title: artwork.title,
                artist: artwork.artist,
                imageUrl: artwork.imageUrl,
                url: '' // Empty URL signifies pending/loading state
            }
        }));

        try {
            // Load current
            const data = await getArtworkDetailsWithCache(artwork, profile, prev);
            
            if (loadingIndexRef.current === index) {
                setContentData(data);
                setIsLoadingDetails(false); // Show text immediately
                await playAudioForLevel(data, detailLevel, artwork);
            }

            // BACKGROUND PREFETCH NEXT
            if (index < plan.artworks.length - 1) {
                const nextArt = plan.artworks[index + 1];
                prefetchArtworkData(nextArt, profile, artwork, detailLevel);
            }

        } catch (e) {
            console.error(e);
            setIsLoadingDetails(false);
            setAudioState(prev => ({ ...prev, isLoading: false }));
        }
    }, [plan, profile, detailLevel]);

    useEffect(() => {
        if (state === AppState.TOUR && plan) {
            loadContentForIndex(plan.currentIndex);
        }
    }, [plan?.currentIndex, state]);

    const handleLevelChange = async (newLevel: DetailLevel) => {
        setDetailLevel(newLevel);
        if (contentData && plan) {
             await playAudioForLevel(contentData, newLevel, plan.artworks[plan.currentIndex]);
        }
    };

    const handleCuriosityClick = async (c: Curiosity) => {
        if (!plan || !contentData) return;
        const currentArt = plan.artworks[plan.currentIndex];

        setAudioState(prev => ({ ...prev, isLoading: true }));
        const requestId = `curiosity_${Date.now()}`;
        currentAudioRequestId.current = requestId;

        try {
            const audioBase64 = await getAudioSpeechWithCache(c.description, `curiosity_${currentArt.id}_${c.title}`);
            if (currentAudioRequestId.current === requestId) {
                setAudioState({
                    isLoading: false,
                    isPlaying: true,
                    currentTrack: {
                        id: `curiosity_${currentArt.id}_${c.title}`,
                        title: `Curiosità: ${c.title}`,
                        artist: currentArt.title, 
                        imageUrl: currentArt.imageUrl,
                        url: audioBase64,
                        isCuriosity: true
                    }
                });
            }
        } catch (e) {
            console.error(e);
            setAudioState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleImmersiveClick = async () => {
        if (!plan) return;
        const currentArt = plan.artworks[plan.currentIndex];
        if (!currentArt.imageUrl) return;

        const aistudio = (window as any).aistudio;
        if (aistudio) {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) {
                try {
                    await aistudio.openSelectKey();
                } catch (e) {
                    console.warn("User cancelled key selection");
                    return;
                }
            }
        }

        setIsGeneratingVideo(true);
        // Do not stop audio here immediately, user might want to listen while waiting
        
        try {
            const videoUrl = await generateArtworkAnimation(
                currentArt.imageUrl,
                `${currentArt.title} by ${currentArt.artist}`
            );
            // Check if user cancelled while generating
            if (isGeneratingVideo) { 
                setImmersiveVideoUrl(videoUrl);
                setAudioState(prev => ({ ...prev, isPlaying: false })); // Stop audio only when video starts
            }
        } catch (e) {
            console.error("Video generation failed", e);
            if (isGeneratingVideo) {
                alert("Impossibile generare il video. Riprova più tardi.");
            }
        } finally {
            if (isGeneratingVideo) setIsGeneratingVideo(false);
        }
    };

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

    const handleJumpTo = (index: number) => {
        if(!plan) return;
        setPlan({ ...plan, currentIndex: index });
        setState(AppState.TOUR);
    };

    const handleMapSelect = (id: string) => {
        if(!plan) return;
        const idx = plan.artworks.findIndex(a => a.id === id);
        if (idx !== -1) handleJumpTo(idx);
        setState(AppState.TOUR);
    };

    // --- RENDER HELPERS ---

    const renderTourContent = () => {
        if (!plan) return null;
        const currentArtwork = plan.artworks[plan.currentIndex];

        return (
            <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 animate-fade-in pb-32">
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mb-6">
                    <div className="relative aspect-[4/3] md:aspect-[21/9] bg-stone-200 group">
                        <ImageWithLoader src={currentArtwork.imageUrl} alt={currentArtwork.title} className="w-full h-full" />
                        <button 
                            onClick={handleImmersiveClick}
                            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur hover:bg-white text-stone-900 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition transform hover:scale-105 active:scale-95 border border-white/50 z-20"
                        >
                            <i className="fas fa-wand-magic-sparkles text-purple-600"></i>
                            <span className="text-xs font-bold uppercase tracking-wider">Anima Opera</span>
                        </button>
                    </div>

                    <div className="p-6">
                        <h1 className="text-2xl font-serif font-bold text-stone-900 leading-tight mb-1">{currentArtwork.title}</h1>
                        <p className="text-stone-500 italic mb-6">{currentArtwork.artist}, {currentArtwork.period}</p>

                        <div className="flex bg-stone-100 p-1 rounded-lg mb-6">
                            {[
                                { id: DetailLevel.SHORT, label: 'Essenziale', icon: 'fa-bolt' },
                                { id: DetailLevel.MEDIUM, label: 'Standard', icon: 'fa-align-left' },
                                { id: DetailLevel.LONG, label: 'Approfondito', icon: 'fa-book-open' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleLevelChange(opt.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
                                        detailLevel === opt.id 
                                        ? 'bg-white text-red-800 shadow-sm' 
                                        : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                >
                                    <i className={`fas ${opt.icon}`}></i>
                                    <span className="hidden sm:inline">{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        {isLoadingDetails ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-2 bg-stone-200 rounded w-full"></div>
                                <div className="h-2 bg-stone-200 rounded w-full"></div>
                                <div className="h-2 bg-stone-200 rounded w-3/4"></div>
                            </div>
                        ) : contentData ? (
                            <div className="prose prose-stone text-stone-700 leading-relaxed">
                                <p className="font-bold text-xs text-yellow-700 uppercase mb-2 tracking-wide">
                                    <i className="fas fa-link mr-1"></i> Contesto
                                </p>
                                <p className="text-sm italic mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    {contentData.connectionContext}
                                </p>
                                <p className="text-base md:text-lg">
                                    {getCurrentText(contentData, detailLevel)}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {!isLoadingDetails && contentData?.curiosities && (
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">Curiosità Audio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {contentData.curiosities.map((c, i) => (
                                <button 
                                    key={i}
                                    onClick={() => handleCuriosityClick(c)}
                                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-red-200 transition text-left group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-800 flex items-center justify-center group-hover:scale-110 transition">
                                        <i className="fas fa-headphones"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-stone-900 text-sm">{c.title}</h4>
                                        <p className="text-xs text-stone-400">Tocca per ascoltare</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (state === AppState.ONBOARDING) return <Onboarding onComplete={handleOnboardingComplete} />;
    
    if (state === AppState.LOADING_PLAN) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 font-serif">
            <div className="w-16 h-16 border-4 border-stone-200 border-t-red-800 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl text-stone-800">Creazione Itinerario Personalizzato...</h2>
        </div>
    );

    if (state === AppState.ERROR) return <div className="p-10 text-center text-red-800">{error}</div>;

    // Determine Main Content based on State
    // Crucial: GlobalAudioPlayer is NOT inside these blocks to prevent unmounting
    let mainContent = null;
    let headerContent = null;

    if (plan) {
        if (state === AppState.MAP_VIEW) {
            mainContent = (
                <InteractiveMap 
                    artworks={plan.artworks} 
                    currentArtworkId={plan.artworks[plan.currentIndex].id} 
                    onSelectArtwork={handleMapSelect} 
                    onClose={() => setState(AppState.TOUR)}
                />
            );
        } else {
            // TOUR VIEW
            const currentArtwork = plan.artworks[plan.currentIndex];
            headerContent = (
                <>
                    <div className="sticky top-0 z-30 bg-stone-900 shadow-md">
                        <Timeline artworks={plan.artworks} currentIndex={plan.currentIndex} onSelect={handleJumpTo} />
                    </div>
                    <div className="bg-white border-b border-stone-200 px-4 py-2 flex justify-between items-center shadow-sm z-20">
                         <div className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                             Sala {currentArtwork.room}
                         </div>
                         <button 
                            onClick={() => setState(AppState.MAP_VIEW)}
                            className="flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-full text-xs font-bold hover:bg-stone-200 transition"
                         >
                             <i className="fas fa-map"></i> Mappa
                         </button>
                    </div>
                </>
            );
            mainContent = renderTourContent();
        }
    }

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col font-sans relative"> 
            
            {/* FULL SCREEN OVERLAYS */}
            {immersiveVideoUrl && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
                    <video 
                        src={immersiveVideoUrl} 
                        className="w-full h-full object-contain" 
                        autoPlay 
                        loop 
                        playsInline
                        onClick={() => setImmersiveVideoUrl(null)}
                    />
                    <button 
                        onClick={() => setImmersiveVideoUrl(null)}
                        className="absolute top-8 right-8 text-white/50 hover:text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur"
                    >
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </div>
            )}

            {isGeneratingVideo && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin mb-6"></div>
                    <h2 className="text-2xl font-serif font-bold mb-2">Creazione Mini-Clip AI</h2>
                    <p className="text-white/60 mb-8 max-w-xs">Gemini Veo sta analizzando l'opera per creare un'animazione cinematografica...</p>
                    
                    <button 
                        onClick={() => setIsGeneratingVideo(false)}
                        className="px-6 py-2 rounded-full border border-white/30 hover:bg-white/10 text-sm font-bold transition"
                    >
                        Annulla
                    </button>
                </div>
            )}
            
            {/* MAIN APP LAYOUT */}
            {headerContent}
            
            <main className="flex-1 w-full relative">
                {mainContent}
            </main>

            {/* PERSISTENT AUDIO PLAYER */}
            <GlobalAudioPlayer 
                track={audioState.currentTrack} 
                isLoading={audioState.isLoading}
                onNext={handleNext}
                onPrev={handlePrev}
            />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");
const root = createRoot(rootElement);
root.render(<App />);