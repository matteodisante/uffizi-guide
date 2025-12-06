import React, { useState } from 'react';
import { UserProfile, UserPacing, UserInterest, DetailLevel } from '../types';

interface Props {
    onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [time, setTime] = useState(120);
    const [pacing, setPacing] = useState<UserPacing>(UserPacing.CONTEMPLATIVE);
    const [interests, setInterests] = useState<UserInterest[]>([]);

    const toggleInterest = (interest: UserInterest) => {
        if (interests.includes(interest)) {
            setInterests(interests.filter(i => i !== interest));
        } else {
            setInterests([...interests, interest]);
        }
    };

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else onComplete({ 
            availableTime: time, 
            pacing, 
            interests,
            defaultDetailLevel: DetailLevel.MEDIUM // Set default here
        });
    };

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 font-serif">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-stone-100">
                
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-red-800' : 'bg-stone-200'}`}></div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-bold text-stone-900 mb-2">Quanto tempo hai?</h2>
                        <p className="text-stone-500 font-sans text-sm mb-8">Creeremo un percorso su misura per te.</p>
                        
                        <div className="text-center mb-6">
                            <span className="text-5xl font-bold text-red-800">{Math.floor(time / 60)}h {(time % 60) > 0 ? (time % 60) + 'm' : ''}</span>
                        </div>
                        <input 
                            type="range" min="30" max="240" step="15" 
                            value={time} onChange={(e) => setTime(parseInt(e.target.value))}
                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-red-800 mb-8"
                        />
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-bold text-stone-900 mb-2">Il tuo stile?</h2>
                        <p className="text-stone-500 font-sans text-sm mb-6">Come preferisci visitare il museo?</p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => setPacing(UserPacing.CONTEMPLATIVE)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition ${pacing === UserPacing.CONTEMPLATIVE ? 'border-red-800 bg-red-50' : 'border-stone-200 hover:border-stone-300'}`}
                            >
                                <div className="font-bold text-lg mb-1">Contemplativo</div>
                                <div className="text-xs text-stone-500 font-sans">Amo soffermarmi sui dettagli. Voglio storie approfondite.</div>
                            </button>
                            
                            <button 
                                onClick={() => setPacing(UserPacing.DYNAMIC)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition ${pacing === UserPacing.DYNAMIC ? 'border-red-800 bg-red-50' : 'border-stone-200 hover:border-stone-300'}`}
                            >
                                <div className="font-bold text-lg mb-1">Dinamico</div>
                                <div className="text-xs text-stone-500 font-sans">Voglio vedere il più possibile. Preferisco l'essenziale.</div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2 className="text-3xl font-bold text-stone-900 mb-2">Cosa ti affascina?</h2>
                        <p className="text-stone-500 font-sans text-sm mb-6">Seleziona i temi che ti interessano.</p>
                        
                        <div className="grid grid-cols-2 gap-3 font-sans">
                            {[
                                { id: 'COLOR', label: 'Colore e Luce', icon: 'fa-palette' },
                                { id: 'HISTORY', label: 'Storia', icon: 'fa-scroll' },
                                { id: 'GEOMETRY', label: 'Geometria', icon: 'fa-shapes' },
                                { id: 'ANECDOTES', label: 'Aneddoti', icon: 'fa-comment-dots' },
                                { id: 'PHILOSOPHY', label: 'Filosofia', icon: 'fa-brain' },
                                { id: 'TECHNIQUE', label: 'Tecnica', icon: 'fa-pencil-ruler' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => toggleInterest(item.id as UserInterest)}
                                    className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition ${
                                        interests.includes(item.id as UserInterest) 
                                        ? 'bg-red-800 text-white border-red-800' 
                                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                    }`}
                                >
                                    <i className={`fas ${item.icon}`}></i>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleNext}
                    className="w-full mt-8 py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg"
                >
                    {step === 3 ? 'Crea il mio Tour' : 'Continua'}
                </button>
            </div>
        </div>
    );
};