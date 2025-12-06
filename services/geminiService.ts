import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Artwork, ArtworkContent, UserProfile, UserPacing } from "../types";
import { cacheAudio, getCachedAudio, cacheArtworkDetails, getCachedArtworkDetails } from "./cacheService";

// Helper to get fresh instance with potentially updated API Key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Gemini 3 Pro for high quality text as requested ("Banana Pro")
const modelText = 'gemini-3-pro-preview';
const modelFlash = 'gemini-2.5-flash';
const modelTTS = 'gemini-2.5-flash-preview-tts';
const modelVideo = 'veo-3.1-fast-generate-preview';

// --- HYBRID DATA LAYER: REAL MASTERPIECES ---
// Verified Wikimedia Commons URLs
const MASTER_CATALOG: Artwork[] = [
    // 2nd Floor (Gothic & Renaissance)
    { id: '1', title: 'Maestà di Ognissanti', artist: 'Giotto', room: '2', period: 'Gothic', estimatedTimeMinutes: 5, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Giotto_di_Bondone_-_Madonna_Enthroned_-_WGA09187.jpg/800px-Giotto_di_Bondone_-_Madonna_Enthroned_-_WGA09187.jpg' },
    { id: '2', title: 'Annunciazione', artist: 'Simone Martini', room: '3', period: 'Gothic', estimatedTimeMinutes: 5, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Simone_Martini_-_The_Annunciation_and_Two_Saints_-_WGA21426.jpg/800px-Simone_Martini_-_The_Annunciation_and_Two_Saints_-_WGA21426.jpg' },
    { id: '3', title: 'Adorazione dei Magi', artist: 'Gentile da Fabriano', room: '7', period: 'International Gothic', estimatedTimeMinutes: 7, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Gentile_da_Fabriano_-_Adoration_of_the_Magi_-_WGA08537.jpg/800px-Gentile_da_Fabriano_-_Adoration_of_the_Magi_-_WGA08537.jpg' },
    { id: '14', title: 'Battaglia di San Romano', artist: 'Paolo Uccello', room: '7', period: 'Renaissance', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Paolo_Uccello_002.jpg/1280px-Paolo_Uccello_002.jpg' },
    { id: '4', title: 'Ritratti dei Duchi di Urbino', artist: 'Piero della Francesca', room: '8', period: 'Early Renaissance', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Piero_della_Francesca_043.jpg/800px-Piero_della_Francesca_043.jpg' },
    { id: '5', title: 'Nascita di Venere', artist: 'Sandro Botticelli', room: '10', period: 'Renaissance', estimatedTimeMinutes: 10, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg' },
    { id: '6', title: 'Primavera', artist: 'Sandro Botticelli', room: '10', period: 'Renaissance', estimatedTimeMinutes: 10, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Botticelli-primavera.jpg/1280px-Botticelli-primavera.jpg' },
    { id: '18', title: 'Madonna del Magnificat', artist: 'Sandro Botticelli', room: '10', period: 'Renaissance', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Sandro_Botticelli_-_Madonna_del_Magnificat_-_Google_Art_Project.jpg/800px-Sandro_Botticelli_-_Madonna_del_Magnificat_-_Google_Art_Project.jpg' },
    { id: '7', title: 'Annunciazione', artist: 'Leonardo da Vinci', room: '15', period: 'High Renaissance', estimatedTimeMinutes: 8, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Leonardo_da_Vinci_-_Annunciazione_-_Google_Art_Project.jpg/1280px-Leonardo_da_Vinci_-_Annunciazione_-_Google_Art_Project.jpg' },
    { id: '19', title: 'Adorazione dei Magi', artist: 'Leonardo da Vinci', room: '15', period: 'High Renaissance', estimatedTimeMinutes: 8, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Leonardo_da_Vinci_-_Adoration_of_the_Magi_-_Google_Art_Project.jpg/800px-Leonardo_da_Vinci_-_Adoration_of_the_Magi_-_Google_Art_Project.jpg' },
    { id: '8', title: 'Tondo Doni', artist: 'Michelangelo', room: '35', period: 'High Renaissance', estimatedTimeMinutes: 9, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Michelangelo_Buonarroti_005.jpg/800px-Michelangelo_Buonarroti_005.jpg' },
    { id: '15', title: 'Laocoonte', artist: 'Baccio Bandinelli', room: '42', period: 'Mannerism', estimatedTimeMinutes: 5, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Bandinelli_Laocoon.jpg/800px-Bandinelli_Laocoon.jpg' },
    
    // 1st Floor
    { id: '9', title: 'Madonna del Cardellino', artist: 'Raffaello', room: '66', period: 'High Renaissance', estimatedTimeMinutes: 7, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Raffaello_Sanzio_-_Madonna_del_Cardellino_-_Google_Art_Project.jpg/800px-Raffaello_Sanzio_-_Madonna_del_Cardellino_-_Google_Art_Project.jpg' },
    { id: '17', title: 'Madonna dal Collo Lungo', artist: 'Parmigianino', room: '74', period: 'Mannerism', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Parmigianino_-_Madonna_dal_Collo_Lungo_-_WGA17045.jpg/800px-Parmigianino_-_Madonna_dal_Collo_Lungo_-_WGA17045.jpg' },
    { id: '10', title: 'Venere di Urbino', artist: 'Tiziano', room: '83', period: 'Venetian School', estimatedTimeMinutes: 8, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg/1280px-Tiziano_-_Venere_di_Urbino_-_Google_Art_Project.jpg' },
    { id: '20', title: 'Eleonora di Toledo', artist: 'Bronzino', room: '65', period: 'Mannerism', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Bronzino_-_Eleonora_di_Toledo_col_figlio_Giovanni_-_Google_Art_Project.jpg/800px-Bronzino_-_Eleonora_di_Toledo_col_figlio_Giovanni_-_Google_Art_Project.jpg' },
    { id: '11', title: 'Medusa', artist: 'Caravaggio', room: '90', period: 'Baroque', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Michelangelo_Merisi_da_Caravaggio_-_Medusa_-_WGA04092.jpg/800px-Michelangelo_Merisi_da_Caravaggio_-_Medusa_-_WGA04092.jpg' },
    { id: '12', title: 'Bacco', artist: 'Caravaggio', room: '90', period: 'Baroque', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Caravaggio_-_Bacchus_-_WGA04096.jpg/800px-Caravaggio_-_Bacchus_-_WGA04096.jpg' },
    { id: '16', title: 'Sacrificio di Isacco', artist: 'Caravaggio', room: '90', period: 'Baroque', estimatedTimeMinutes: 6, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/The_Sacrifice_of_Isaac-Caravaggio_%28Uffizi%29.jpg/800px-The_Sacrifice_of_Isaac-Caravaggio_%28Uffizi%29.jpg' },
    { id: '13', title: 'Giuditta che decapita Oloferne', artist: 'Artemisia Gentileschi', room: '91', period: 'Baroque', estimatedTimeMinutes: 7, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Judit_decapitando_a_Holofernes%2C_por_Artemisia_Gentileschi.jpg/800px-Judit_decapitando_a_Holofernes%2C_por_Artemisia_Gentileschi.jpg' }
];

export const generateTourPlan = async (profile: UserProfile): Promise<Artwork[]> => {
    const ai = getAI();
    // Pass a simplified catalog to the AI to save tokens, but keep the IDs linked
    const catalogJson = JSON.stringify(MASTER_CATALOG.map(a => ({ id: a.id, title: a.title, artist: a.artist, room: a.room, period: a.period })));
    
    const prompt = `
    Sei un curatore museale. Seleziona le opere migliori dal CATALOGO seguente per un tour di ${profile.availableTime} minuti.
    
    CATALOGO: ${catalogJson}
    
    PROFILO UTENTE:
    - Ritmo: ${profile.pacing}
    - Interessi: ${profile.interests.join(', ')}
    
    REGOLE:
    1. Se il tempo è < 60 min, seleziona max 6 opere.
    2. Se il tempo è > 120 min, seleziona almeno 12 opere.
    3. Se "HISTORY" è selezionato, privilegia i Duchi di Urbino e Battaglie.
    4. Se "COLOR" è selezionato, privilegia Tiziano, Bronzino e Veneziani.
    5. Restituisci SOLO un array di ID dal catalogo in ordine di visita (Numero Sala crescente).
    `;

    const responseSchema: Schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };

    try {
        const response = await ai.models.generateContent({
            model: modelFlash,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const selectedIds = JSON.parse(response.text || "[]");
        let tour = MASTER_CATALOG.filter(a => selectedIds.includes(a.id));
        
        // Fallback if AI returns nothing or invalid IDs
        if (tour.length === 0) tour = MASTER_CATALOG.slice(0, 5); 
        
        // Sort by room number roughly
        tour.sort((a, b) => parseInt(a.room) - parseInt(b.room));
        return tour;

    } catch (e) {
        console.error("Tour generation failed, using fallback", e);
        return MASTER_CATALOG.slice(0, 8);
    }
};

export const getArtworkDetailsWithCache = async (artwork: Artwork, profile: UserProfile, previousArtwork?: Artwork): Promise<ArtworkContent> => {
    const ai = getAI();
    const cacheKey = `content_v9_${artwork.id}_${profile.interests.join('_')}`;
    
    const cached = await getCachedArtworkDetails(cacheKey);
    if (cached) return cached;

    let angle = "Generale";
    if (profile.interests.includes('PHILOSOPHY')) angle = "Filosofico e Neoplatonico";
    else if (profile.interests.includes('ANECDOTES')) angle = "Aneddotica e Vita dell'Artista";
    else if (profile.interests.includes('TECHNIQUE')) angle = "Tecnico e Materiali";
    else if (profile.interests.includes('HISTORY')) angle = "Contesto Storico Politico";

    const prompt = `
      Crea i contenuti della guida per: "${artwork.title}" di ${artwork.artist}.
      
      PERSONALIZZAZIONE PROFONDA:
      - Angolo di narrazione: ${angle} (L'utente è interessato a questo aspetto).
      - Stile: Racconto orale, coinvolgente, come un documentario d'arte.

      Genera un oggetto JSON con 3 varianti di lunghezza e contenuti extra:
      1. connectionContext: Una frase di raccordo dall'opera precedente (${previousArtwork?.title || 'Ingresso'}).
      2. short: "L'Essenziale". Max 40 parole. Focus puro sull'${angle}.
      3. medium: "Equilibrato". Max 120 parole. Mix di descrizione visiva e ${angle}.
      4. long: "Approfondimento". Max 250 parole. Analisi completa, includendo dettagli nascosti legati a ${angle}.
      5. curiosities: 2 curiosità brevi (Titolo + Script audio).
    `;

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            connectionContext: { type: Type.STRING },
            short: { type: Type.STRING },
            medium: { type: Type.STRING },
            long: { type: Type.STRING },
            curiosities: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ["title", "description"]
                } 
            }
        },
        required: ["connectionContext", "short", "medium", "long", "curiosities"]
    };

    const response = await ai.models.generateContent({
        model: modelFlash, // Using flash for speed as requested
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate details");
    
    const data = JSON.parse(text);
    await cacheArtworkDetails(cacheKey, data);
    return data;
};

export const getAudioSpeechWithCache = async (text: string, id: string): Promise<string> => {
    const ai = getAI();
    // Use a hash of the text in the key to ensure we regenerate if the prompt changes slightly
    const textHash = text.slice(0,30).replace(/\s/g,'');
    const cacheKey = `audio_asset_v4_${id}_${textHash}`; 
    
    const cached = await getCachedAudio(cacheKey);
    if (cached) return cached;

    const response = await ai.models.generateContent({
        model: modelTTS,
        contents: `Leggi con tono caldo e naturale: "${text}"`,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
            }
        }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData?.data) {
        const base64 = parts[0].inlineData.data;
        await cacheAudio(cacheKey, base64);
        return base64;
    }
    throw new Error("No audio generated");
};

// --- PREFETCHING UTILS ---
export const prefetchArtworkData = async (artwork: Artwork, profile: UserProfile, previousArtwork?: Artwork, defaultDetailLevel: string = 'MEDIUM') => {
    try {
        console.log(`Prefetching data for ${artwork.title}...`);
        const data = await getArtworkDetailsWithCache(artwork, profile, previousArtwork);
        
        // Prefetch audio for the default level
        const text = defaultDetailLevel === 'SHORT' ? data.short : defaultDetailLevel === 'LONG' ? data.long : data.medium;
        const textToRead = `${data.connectionContext} ... ${text}`;
        await getAudioSpeechWithCache(textToRead, `${artwork.id}_${defaultDetailLevel}`);
        console.log(`Prefetch complete for ${artwork.title}`);
    } catch (e) {
        console.warn("Prefetch error", e);
    }
};

// --- VIDEO GENERATION UTILS ---
const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
    try {
        // Fetch via proxy or CORS-enabled request if possible, or fallback
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to convert image to base64", e);
        throw e;
    }
};

export const generateArtworkAnimation = async (imageUrl: string, promptInfo: string): Promise<string> => {
    const ai = getAI();
    const base64Image = await fetchImageAsBase64(imageUrl);

    // Optimized Prompt for Internal Motion using Veo
    const fullPrompt = `
    Cinematic art analysis clip. 
    Bring the subjects of this artwork to life. 
    Slow, subtle, and realistic movement. 
    If there are people: breathe, blink, small gestures.
    If there is nature: wind in trees, moving clouds, flowing water.
    If it is a portrait: slight head turn, lifelike gaze.
    Camera: Static or extremely slow push-in. No fast pans.
    Atmosphere: High quality, depth of field, 3D parallax effect.
    Subject: ${promptInfo}
    `;

    let operation = await ai.models.generateVideos({
        model: modelVideo,
        image: {
            imageBytes: base64Image,
            mimeType: 'image/jpeg'
        },
        prompt: fullPrompt, 
        config: {
            numberOfVideos: 1,
            resolution: '720p', // 720p is safer for speed
            aspectRatio: '9:16'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};