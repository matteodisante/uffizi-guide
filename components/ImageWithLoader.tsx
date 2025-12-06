import React, { useState } from 'react';

interface Props {
    src?: string;
    alt: string;
    className?: string;
}

export const ImageWithLoader: React.FC<Props> = ({ src, alt, className }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Default fallback if src is missing or empty
    const imageSource = (src && src.length > 5) ? src : null;

    return (
        <div className={`relative overflow-hidden bg-stone-200 ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-stone-200 animate-pulse">
                    <i className="fas fa-image text-stone-400 text-4xl"></i>
                </div>
            )}
            
            {hasError || !imageSource ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800 text-stone-500">
                    <i className="fas fa-eye-slash text-4xl mb-2"></i>
                    <span className="text-xs uppercase tracking-widest">Immagine non disponibile</span>
                </div>
            ) : (
                <img 
                    src={imageSource} 
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                />
            )}
        </div>
    );
};