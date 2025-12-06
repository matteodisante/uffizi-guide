import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Artwork, Curiosity } from "../types";
import { cacheAudio, getCachedAudio, cacheArtworkDetails, getCachedArtworkDetails } from "./cacheService";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelFlash = 'gemini-2.5-flash';
const modelTTS = 'gemini-2.5-flash-preview-tts';

/**
 * Generates the initial tour plan based on duration.
 */
export const generateTourPlan = async (minutes: number): Promise<Artwork[]> => {
  const prompt = `
    Agisci come una guida esperta della Galleria degli Uffizi.
    Crea un itinerario di visita della durata di circa ${minutes} minuti.
    
    REGOLE FONDAMENTALI:
    1. Segui RIGOROSAMENTE l'ordine fisico delle sale (es. Giotto -> Botticelli -> Leonardo -> Michelangelo -> Caravaggio).
    2. Seleziona le opere più importanti che rientrano in questo tempo.
    3. Per ogni opera, fornisci l'URL diretto a un'immagine di Wikimedia Commons (public domain). Se non sei sicuro al 100%, lascia vuoto.
    4. Restituisci i dati in JSON puro.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        artist: { type: Type.STRING },
        room: { type: Type.STRING },
        period: { type: Type.STRING },
        estimatedTimeMinutes: { type: Type.NUMBER },
        description: { type: Type.STRING, description: "Breve descrizione di 1 frase" },
        imageUrl: { type: Type.STRING, description: "URL Wikimedia Commons dell'opera (es. https://upload.wikimedia.org/...)" }
      },
      required: ["id", "title", "artist", "room", "period", "estimatedTimeMinutes", "description"]
    }
  };

  const response = await ai.models.generateContent({
    model: modelFlash,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: "Sei una guida museale precisa e colta. Preferisci opere con immagini note.",
    }
  });

  const text = response.text;
  if (!text) throw new Error("No plan generated");
  
  return JSON.parse(text) as Artwork[];
};

/**
 * Re-plans the tour based on remaining items and new time limit.
 */
export const replanTour = async (remainingArtworks: Artwork[], newDurationMinutes: number): Promise<Artwork[]> => {
    if (remainingArtworks.length === 0) return [];

    const prompt = `
      Ho ${newDurationMinutes} minuti rimasti per visitare gli Uffizi.
      Ecco le opere che mi mancano da vedere:
      ${JSON.stringify(remainingArtworks.map(a => ({ title: a.title, artist: a.artist })))}
      
      Seleziona un sottoinsieme ottimizzato.
    `;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
            original_title: { type: Type.STRING },
        }
      }
    };

    const response = await ai.models.generateContent({
        model: modelFlash,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const text = response.text;
    if(!text) return remainingArtworks;

    const keptItems = JSON.parse(text) as { original_title: string }[];
    
    // Maintain strict object integrity and order from original list
    const result = remainingArtworks.filter(art => 
        keptItems.some(k => k.original_title === art.title)
    );
    
    return result;
};

/**
 * Generates detailed content with caching support.
 * Now includes "Connection Context" from previous artwork.
 */
export const getArtworkDetailsWithCache = async (artwork: Artwork, previousArtwork?: Artwork): Promise<{ fullContent: string, curiosities: Curiosity[], connectionContext: string }> => {
    // Version v2: Curiosities are now objects { title, description } instead of strings
    const cacheKey = `details_v2_${artwork.title}_${previousArtwork?.title || 'start'}`;
    
    // 1. Try Cache
    const cached = await getCachedArtworkDetails(cacheKey);
    if (cached) {
        console.log("Using cached details for", artwork.title);
        return cached;
    }

    // 2. Generate
    const prompt = `
      Fornisci una spiegazione per l'opera "${artwork.title}" di ${artwork.artist}.
      
      Contesto precedente: ${previousArtwork ? `Vengo da "${previousArtwork.title}" di ${previousArtwork.artist}.` : "Questa è la prima opera."}
      
      Richiesta:
      1. connectionContext: Una frase di collegamento che spieghi l'evoluzione artistica o storica dall'opera precedente a questa. (Es. "Lasciando la rigidità gotica, entriamo ora nel Rinascimento...")
      2. fullContent: Testo narrativo audio guida (250 parole).
      3. curiosities: 3 curiosità affascinanti. Per ogni curiosità fornisci un breve titolo accattivante e una descrizione approfondita.
    `;

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            connectionContext: { type: Type.STRING },
            fullContent: { type: Type.STRING },
            curiosities: { 
                type: Type.ARRAY, 
                items: { 
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Titolo breve della curiosità" },
                        description: { type: Type.STRING, description: "Spiegazione dettagliata della curiosità" }
                    },
                    required: ["title", "description"]
                } 
            }
        }
    };

    const response = await ai.models.generateContent({
        model: modelFlash,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate details");
    
    const data = JSON.parse(text);
    
    // 3. Save to Cache
    await cacheArtworkDetails(cacheKey, data);
    
    return data;
};

/**
 * Generates Audio with caching support.
 */
export const getAudioSpeechWithCache = async (text: string, id: string): Promise<string> => {
    const cacheKey = `audio_v2_${id}_${text.substring(0, 20)}`; // Versioned key
    
    // 1. Try Cache
    const cached = await getCachedAudio(cacheKey);
    if (cached) {
        console.log("Using cached audio for", id);
        return cached;
    }

    // 2. Generate
    console.log("Generating fresh audio for", id);
    const response = await ai.models.generateContent({
        model: modelTTS,
        contents: `Leggi con tono da guida museale calma: "${text}"`,
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
        // 3. Save to Cache
        await cacheAudio(cacheKey, base64);
        return base64;
    }
    throw new Error("No audio generated");
};