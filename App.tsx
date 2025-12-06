import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, Artwork, TourPlan, Curiosity, UserProfile, AudioState, DetailLevel, ArtworkContent, UserPacing } from './types';
import { generateTourPlan, getArtworkDetailsWithCache, getAudioSpeechWithCache } from './services/geminiService';
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
    // We store the full multi-level content object here
    const [contentData, setContentData] = useState<ArtworkContent | null>(null);
    const [detailLevel, setDetailLevel] = useState<DetailLevel>(DetailLevel.MEDIUM);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // GLOBAL AUDIO STATE
    const [audioState, setAudioState] = useState<AudioState>({
        currentTrack: null,
        isPlaying: false,
        isLoading: false
    });

    // 1. HANDLE ONBOARDING COMPLETION
    const handleOnboardingComplete = async (userProfile: UserProfile) => {
        setProfile(userProfile);
        setDetailLevel(userProfile.defaultDetailLevel); // Set default from profile if we added it there, or just default to MEDIUM
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

    // 2. HELPER: Get Text based on Level
    const getCurrentText = (data: ArtworkContent, level: DetailLevel): string => {
        switch(level) {
            case DetailLevel.SHORT: return data.short;
            case DetailLevel.LONG: return data.long;
            case DetailLevel.MEDIUM: default: return data.medium;
        }
    };

    // 3. LOAD ARTWORK CONTENT (TEXT + AUDIO)
    const loadContentForIndex = useCallback(async (index: number) => {
        if (!plan || !profile) return;
        
        setIsLoadingDetails(true);
        const artwork = plan.artworks[index];
        const prev = index > 0 ? plan.artworks[index - 1] : undefined;

        try {
            // Fetch structured content (S/M/L)
            const data = await getArtworkDetailsWithCache(artwork, profile, prev);
            setContentData(data);

            // Play Audio for the current Detail Level
            await playAudioForLevel(data, detailLevel, artwork);

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingDetails(false);
        }
    }, [plan, profile, detailLevel]);

    const playAudioForLevel = async (data: ArtworkContent, level: DetailLevel, artwork: Artwork) => {
        const textToRead = `${data.connectionContext} ... ${getCurrentText(data, level)}`;
        
        setAudioState(prev => ({ ...prev, isLoading: true }));
        try {
            const audioBase64 = await getAudioSpeechWithCache(textToRead, `${artwork.id}_${level}`);
            
            setAudioState({
                isLoading: false,
                isPlaying: true,
                currentTrack: {
                    id: artwork.id,
                    title: artwork.title,
                    artist: artwork.artist,
                    imageUrl: artwork.imageUrl,
                    url: audioBase64
                }
            });
        } catch (e) {
            console.error("Audio fail", e);
            setAudioState(prev => ({ ...prev, isLoading: false }));
        }
    };

    // Trigger load when index changes
    useEffect(() => {
        if (state === AppState.TOUR && plan) {
            loadContentForIndex(plan.currentIndex);
        }
    }, [plan?.currentIndex, state]);

    // Handle Detail Level Change (Granular Control)
    const handleLevelChange = async (newLevel: DetailLevel) => {
        setDetailLevel(newLevel);
        if (contentData && plan) {
             // Immediately switch audio
             await playAudioForLevel(contentData, newLevel, plan.artworks[plan.currentIndex]);
        }
    };

    // HANDLE CURIOSITY CLICK
    const handleCuriosityClick = async (c: Curiosity) => {
        if (!plan || !contentData) return;
        const currentArt = plan.artworks[plan.currentIndex];

        setAudioState(prev => ({ ...prev, isLoading: true }));
        try {
            const audioBase64 = await getAudioSpeechWithCache(c.description, `curiosity_${currentArt.id}_${c.title}`);
            setAudioState({
                isLoading: false,
                isPlaying: true,
                currentTrack: {
                    id: `curiosity_${c.title}`,
                    title: `Curiosità: ${c.title}`,
                    artist: currentArt.title, 
                    imageUrl: currentArt.imageUrl,
                    url: audioBase64,
                    isCuriosity: true
                }
            });
        } catch (e) {
            console.error(e);
            setAudioState(prev => ({ ...prev, isLoading: false }));
        }
    };

    // NAVIGATION
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
    };

    // RENDER STATES
    if (state === AppState.ONBOARDING) return <Onboarding onComplete={handleOnboardingComplete} />;
    
    if (state === AppState.LOADING_PLAN) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 font-serif">
            <div className="w-16 h-16 border-4 border-stone-200 border-t-red-800 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl text-stone-800">Creazione Itinerario Personalizzato...</h2>
        </div>
    );

    if (state === AppState.MAP_VIEW && plan) {
        return (
            <InteractiveMap 
                artworks={plan.artworks} 
                currentArtworkId={plan.artworks[plan.currentIndex].id} 
                onSelectArtwork={handleMapSelect} 
                onClose={() => setState(AppState.TOUR)}
            />
        );
    }

    if (state === AppState.ERROR) return <div className="p-10 text-center text-red-800">{error}</div>;

    if (!plan) return null;
    const currentArtwork = plan.artworks[plan.currentIndex];

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col font-sans pb-24"> 
            
            {/* Header / Timeline */}
            <div className="sticky top-0 z-30 bg-stone-900 shadow-md">
                <Timeline artworks={plan.artworks} currentIndex={plan.currentIndex} onSelect={handleJumpTo} />
            </div>

            {/* View Switcher Bar */}
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

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mb-6">
                    
                    {/* Image */}
                    <div className="aspect-[4/3] md:aspect-[21/9]">
                        <ImageWithLoader src={currentArtwork.imageUrl} alt={currentArtwork.title} className="w-full h-full" />
                    </div>

                    <div className="p-6">
                        <h1 className="text-2xl font-serif font-bold text-stone-900 leading-tight mb-1">{currentArtwork.title}</h1>
                        <p className="text-stone-500 italic mb-6">{currentArtwork.artist}, {currentArtwork.period}</p>

                        {/* Granular Detail Control */}
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

                        {/* Text Content */}
                        {isLoadingDetails || !contentData ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-2 bg-stone-200 rounded w-full"></div>
                                <div className="h-2 bg-stone-200 rounded w-full"></div>
                                <div className="h-2 bg-stone-200 rounded w-3/4"></div>
                            </div>
                        ) : (
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
                        )}
                    </div>
                </div>

                {/* Audio Curiosities */}
                {!isLoadingDetails && contentData?.curiosities && (
                    <div className="mb-24">
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
            </main>

            {/* GLOBAL PLAYER */}
            <GlobalAudioPlayer 
                track={audioState.currentTrack} 
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