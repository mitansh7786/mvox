/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Mic, 
  Play, 
  Download, 
  Settings, 
  Sparkles, 
  Volume2, 
  Info, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  User,
  Zap,
  Smile,
  Frown,
  Angry,
  CloudLightning
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'calm';
type Voice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

interface VoiceOption {
  id: Voice;
  name: string;
  gender: 'Male' | 'Female' | 'Neutral';
  description: string;
}

const VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', gender: 'Female', description: 'Clear, professional, and warm.' },
  { id: 'Puck', name: 'Puck', gender: 'Male', description: 'Energetic and youthful.' },
  { id: 'Charon', name: 'Charon', gender: 'Male', description: 'Deep, authoritative, and calm.' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', description: 'Gravelly and textured.' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', description: 'Soft, airy, and soothing.' },
];

// --- Components ---

const Header = () => (
  <header className="flex items-center justify-between p-6 border-b border-white/10">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-xl studio-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <Volume2 className="text-white w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white">VoxAI <span className="text-indigo-400 text-sm font-medium">Studio</span></h1>
    </div>
    <div className="flex items-center gap-4">
      <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
        <Settings className="w-5 h-5 text-slate-400" />
      </button>
      <div className="h-8 w-[1px] bg-white/10" />
      <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20">
        <Zap className="w-4 h-4 fill-current" />
        Upgrade to Pro
      </button>
    </div>
  </header>
);

const EmotionBadge: React.FC<{ emotion: Emotion; active: boolean }> = ({ emotion, active }) => {
  const icons = {
    neutral: <CloudLightning className="w-4 h-4" />,
    happy: <Smile className="w-4 h-4" />,
    sad: <Frown className="w-4 h-4" />,
    angry: <Angry className="w-4 h-4" />,
    calm: <CheckCircle2 className="w-4 h-4" />,
  };

  const colors = {
    neutral: 'bg-slate-500/20 text-slate-400',
    happy: 'bg-emerald-500/20 text-emerald-400',
    sad: 'bg-blue-500/20 text-blue-400',
    angry: 'bg-rose-500/20 text-rose-400',
    calm: 'bg-indigo-500/20 text-indigo-400',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? colors[emotion] : 'bg-white/5 text-slate-500 opacity-50'}`}>
      {icons[emotion]}
      <span className="capitalize">{emotion}</span>
    </div>
  );
};

export default function App() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<Emotion>('neutral');
  const [selectedVoice, setSelectedVoice] = useState<Voice>('Kore');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Auto-detect emotion when text changes (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (text.length > 10) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze the emotion of this text and return ONLY one word from this list: neutral, happy, sad, angry, calm. Text: "${text}"`,
          });
          const result = response.text?.toLowerCase().trim() as Emotion;
          if (['neutral', 'happy', 'sad', 'angry', 'calm'].includes(result)) {
            setDetectedEmotion(result);
          }
        } catch (e) {
          console.error("Emotion detection failed", e);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [text]);

  const generateSpeech = async () => {
    if (!text.trim()) {
      setError("Please enter some text first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const prompt = `Say this ${detectedEmotion}ly: ${text}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(res => res.blob());
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      } else {
        throw new Error("No audio data received from AI.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate speech. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = (format: 'mp3' | 'wav') => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `voxai-output.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark selection:bg-indigo-500/30">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-7 space-y-6">
          <section className="glass-panel rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Input Studio
              </h2>
              <div className="flex gap-2">
                {(['neutral', 'happy', 'sad', 'angry', 'calm'] as Emotion[]).map(e => (
                  <EmotionBadge key={e} emotion={e} active={detectedEmotion === e} />
                ))}
              </div>
            </div>

            <textarea
              className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-600"
              placeholder="Type or paste your script here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">
                {text.length} characters
              </span>
              <button 
                onClick={generateSpeech}
                disabled={isGenerating || !text.trim()}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl
                  ${isGenerating || !text.trim() 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'studio-gradient text-white hover:scale-[1.02] active:scale-[0.98] shadow-indigo-500/20'}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    Generate Audio
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Output Player */}
          <AnimatePresence>
            {audioUrl && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel rounded-3xl p-6 space-y-6 border-indigo-500/30 shadow-2xl shadow-indigo-500/10"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-indigo-400 flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    Studio Output
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadAudio('wav')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      WAV
                    </button>
                    <button 
                      onClick={() => downloadAudio('mp3')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      MP3
                    </button>
                  </div>
                </div>

                <audio ref={audioRef} src={audioUrl} controls className="w-full h-12 accent-indigo-500" />
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Sample Rate</p>
                    <p className="text-sm font-mono font-bold">24kHz</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Emotion</p>
                    <p className="text-sm font-mono font-bold capitalize">{detectedEmotion}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Bitrate</p>
                    <p className="text-sm font-mono font-bold">192kbps</p>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Voice Selection & Info */}
        <div className="lg:col-span-5 space-y-6">
          <section className="glass-panel rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Premium Voices
            </h2>
            
            <div className="space-y-3">
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left
                    ${selectedVoice === voice.id 
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' 
                      : 'bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                    ${selectedVoice === voice.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold">{voice.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider
                        ${voice.gender === 'Female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {voice.gender}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{voice.description}</p>
                  </div>
                  {selectedVoice === voice.id && (
                    <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Startup Tips */}
          <section className="p-6 bg-indigo-600 rounded-3xl text-white space-y-4 shadow-2xl shadow-indigo-600/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <h3 className="font-bold flex items-center gap-2 relative">
              <Info className="w-5 h-5" />
              Startup Tip
            </h3>
            <p className="text-sm text-indigo-100 relative leading-relaxed">
              To launch this on the Play Store, use <strong>Capacitor</strong> to wrap this React app. You can monetize by charging for "Studio Quality" exports or specific premium voices.
            </p>
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors relative">
              View Launch Checklist
            </button>
          </section>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-xs border-t border-white/5">
        &copy; 2026 VoxAI Studio. Built for high-performance AI startups.
      </footer>
    </div>
  );
}
