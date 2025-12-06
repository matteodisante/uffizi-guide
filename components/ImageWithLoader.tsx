import React, { useState, useEffect } from 'react';

interface Props {
    src?: string;
    alt: string;
    className?: string;
}

export const ImageWithLoader: React.FC<Props> = ({ src, alt, className }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

    useEffect(() => {
        setStatus('loading');
        setCurrentSrc(src);
    }, [src]);

    // Safety timeout: If image doesn't load in 8 seconds, show error/placeholder
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (status === 'loading') {
            timer = setTimeout(() => {
                console.warn(`Image load timeout for: ${currentSrc}`);
                setStatus('error');
            }, 8000);
        }
        return () => clearTimeout(timer);
    }, [status, currentSrc]);

    const handleError = () => {
        console.warn(`Failed to load image: ${currentSrc}`);
        setStatus('error');
    };

    const handleLoad = () => {
        setStatus('loaded');
    };

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent clicking parent containers
        setStatus('loading');
        // Add timestamp to bypass browser cache
        setCurrentSrc(`${src}${src?.includes('?') ? '&' : '?'}retry=${Date.now()}`);
    };

    // Robust fallback for missing src
    if (!currentSrc || currentSrc.length < 5) {
        return (
            <div className={`flex flex-col items-center justify-center bg-stone-200 text-stone-500 ${className}`}>
                <i className="fas fa-image text-3xl mb-2 opacity-50"></i>
                <span className="text-xs uppercase tracking-widest font-bold opacity-50">No Image</span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-stone-200 ${className}`}>
            {/* Loading Skeleton - High Z-index to ensure visibility */}
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-stone-200 animate-pulse">
                    <i className="fas fa-circle-notch fa-spin text-stone-400 text-3xl"></i>
                </div>
            )}
            
            {/* Error State */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800 text-stone-400 z-20 p-4 text-center">
                    <i className="fas fa-eye-slash text-3xl mb-2"></i>
                    <span className="text-xs uppercase tracking-widest font-bold">Immagine non disponibile</span>
                    <button 
                        onClick={handleRetry}
                        className="mt-4 px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs text-white transition pointer-events-auto"
                    >
                        Riprova
                    </button>
                </div>
            )}

            {/* Actual Image */}
            {/* Note: Removed crossOrigin="anonymous" as it can cause display issues on standard img tags if headers are missing */}
            <img 
                src={currentSrc} 
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
};