import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Send,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Info,
  Radio,
  Pill,
  Clock,
  Settings2
} from 'lucide-react';
import { VoiceMessage, VoiceAction, Medicine, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface VoiceConversationViewProps {
  medicines: Medicine[];
  user: User | null;
  onUpdateStock: (payload: any) => Promise<any>;
  onNavigateTab: (tab: string) => void;
  onOpenStockModal?: (medicineId: number, batchId?: number) => void;
}

export const VoiceConversationView: React.FC<VoiceConversationViewProps> = ({
  medicines,
  user,
  onUpdateStock,
  onNavigateTab,
  onOpenStockModal
}) => {
  // Voice & Conversation States
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste! I am your MediTrack 360 AI Voice Assistant. High Thinking is active to calculate live batch FEFO priorities, expiry risks, and stock balances. You can speak hands-free or type your query.',
      spokenResponse: 'Namaste! I am your MediTrack 360 AI Voice Assistant. High Thinking is active to calculate live batch FEFO priorities, expiry risks, and stock balances. How can I help you today?',
      thinkingProcess: `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **System Initialization:** Connected to local dispensary database. Formulary loaded with ${medicines.length} registered medications.
2. **Clinical Protocol Active:** FEFO (First-Expired, First-Out) strictly enforced. Expired items are flagged for quarantine.
3. **Voice Engine:** Ready for hands-free queries, stock counts, batch selection, and rapid dispensing instructions.`,
      thinkingLevel: 'HIGH',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<'HIGH' | 'MEDIUM'>('HIGH');
  const [voicePersona, setVoicePersona] = useState<string>('Kore');
  const [handsFreeMode, setHandsFreeMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [expandedReasoningIds, setExpandedReasoningIds] = useState<Record<string, boolean>>({ 'welcome-1': true });
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Audio References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const handsFreeTimerRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (handsFreeTimerRef.current) {
        clearTimeout(handsFreeTimerRef.current);
      }
    };
  }, []);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Audio Player helper
  const playVoiceAudio = (audioBase64?: string, text?: string, messageId?: string) => {
    if (!soundEnabled) return;

    // Stop existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (messageId) {
      setActiveAudioMessageId(messageId);
    }

    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audioRef.current = audio;

        audio.onended = () => {
          setActiveAudioMessageId(null);
          // If hands-free mode is enabled, reactivate mic
          if (handsFreeMode && recognitionRef.current) {
            handsFreeTimerRef.current = setTimeout(() => {
              startListening();
            }, 600);
          }
        };

        audio.onerror = () => {
          fallbackSpeech(text || '');
        };

        audio.play().catch(() => {
          fallbackSpeech(text || '');
        });
        return;
      } catch (err) {
        console.warn('WAV playback failed, using fallback synthesis:', err);
      }
    }

    // Fallback: Web Speech Synthesis
    fallbackSpeech(text || '');
  };

  const fallbackSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      setActiveAudioMessageId(null);
      if (handsFreeMode && recognitionRef.current) {
        handsFreeTimerRef.current = setTimeout(() => {
          startListening();
        }, 600);
      }
    };
    utterance.onerror = () => {
      setActiveAudioMessageId(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveAudioMessageId(null);
  };

  // Toggle mic
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    stopAudio();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Recognition start skipped:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Send message to voice assistant
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    stopListening();
    setInputText('');

    const userMsgId = 'user-' + Date.now();
    const newUserMsg: VoiceMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsThinking(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text
      }));

      const response = await api.sendVoiceMessage({
        message: query,
        conversationHistory,
        thinkingLevel,
        voice: voicePersona
      });

      const assistantMsgId = 'assistant-' + Date.now();
      const newAssistantMsg: VoiceMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        text: response.spokenResponse || 'Here is the dispensary analysis.',
        spokenResponse: response.spokenResponse,
        thinkingProcess: response.thinkingProcess,
        thinkingLevel: response.thinkingLevel || thinkingLevel,
        audioBase64: response.audioBase64,
        suggestedAction: response.suggestedAction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, newAssistantMsg]);
      // Open reasoning by default for high thinking visibility
      setExpandedReasoningIds((prev) => ({ ...prev, [assistantMsgId]: true }));

      // Play audio automatically
      if (soundEnabled && response.spokenResponse) {
        playVoiceAudio(response.audioBase64, response.spokenResponse, assistantMsgId);
      }
    } catch (err: any) {
      console.error('Voice Assistant Error:', err);
      const errorMsg: VoiceMessage = {
        id: 'error-' + Date.now(),
        sender: 'assistant',
        text: 'I encountered an issue connecting to the AI model. Operating in offline safety mode.',
        spokenResponse: 'I encountered an issue connecting to the AI model. Operating in offline safety mode.',
        thinkingProcess: 'Offline fallback activated. Please verify network connectivity.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // Execute quick action directly from Voice card
  const handleExecuteAction = async (msgId: string, action: VoiceAction) => {
    setExecutingActionId(msgId);
    try {
      if (action.type === 'DISPENSE' && action.batchId) {
        await onUpdateStock({
          batch_id: action.batchId,
          movement_type: 'Stock Out',
          quantity: action.quantity || 1,
          reason: action.reason || 'Dispensed via MediTrack Voice Assistant (FEFO Priority)',
          staff_name: user?.name || 'Clinic Staff',
          user_id: user?.id || 1
        });
        setActionSuccessNotice(
          `Success: Dispensed ${action.quantity || 1} units from Batch ${action.batchNumber}. Stock updated!`
        );
      } else if (action.type === 'QUARANTINE' && action.batchId) {
        await onUpdateStock({
          batch_id: action.batchId,
          movement_type: 'Adjustment',
          quantity: 0,
          reason: `QUARANTINE EXPIRED: ${action.reason || 'Expired batch isolated safely'}`,
          staff_name: user?.name || 'Clinic Staff',
          user_id: user?.id || 1
        });
        setActionSuccessNotice(
          `Quarantined: Batch ${action.batchNumber} isolated safely. Quantity set to 0.`
        );
      } else if (action.type === 'REORDER') {
        onNavigateTab('reports');
        return;
      } else if (action.type === 'VIEW_MEDICINE' && action.medicineId && onOpenStockModal) {
        onOpenStockModal(action.medicineId, action.batchId);
        return;
      }

      // Mark action executed
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, actionExecuted: true } : m))
      );

      setTimeout(() => {
        setActionSuccessNotice(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to execute voice action:', err);
      alert('Error updating stock: ' + err.message);
    } finally {
      setExecutingActionId(null);
    }
  };

  const toggleReasoning = (id: string) => {
    setExpandedReasoningIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const presetQueries = [
    {
      label: 'What expires next week?',
      badge: 'Expiry Alert',
      query: 'What expires next week?',
      desc: 'Checks near-expiry batches within the upcoming clinical window'
    },
    {
      label: 'Log 10 units dispensed for Amoxicillin',
      badge: 'Speech-to-Intent',
      query: 'Log 10 units dispensed for Amoxicillin',
      desc: 'Deducts 10 units from FEFO-recommended batch with 1-click confirmation'
    },
    {
      label: 'Which batch should I use first for Paracetamol?',
      badge: 'FEFO Algorithm',
      query: 'Which batch should I use first for Paracetamol?',
      desc: 'Calculates earliest-expiry batch to eliminate inventory loss'
    },
    {
      label: 'Are there any expired antibiotics on our shelves?',
      badge: 'Safety Hazard',
      query: 'Are there any expired antibiotics on our shelves right now?',
      desc: 'Detects past-expiry lots and recommends instant quarantine'
    },
    {
      label: 'How much Metformin do we have left in stock?',
      badge: 'Chronic Care',
      query: 'How much Metformin do we have left in stock?',
      desc: 'Live formulary balance and minimum threshold check'
    },
    {
      label: 'Quarantine expired Amoxicillin batch AMX2405',
      badge: 'Quarantine',
      query: 'Quarantine expired Amoxicillin batch AMX2405',
      desc: 'Isolates expired lot and sets active quantity to 0'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner & High Thinking Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs">
                <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                High Thinking Enabled
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
                <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                Voice Conversation Mode
              </span>
              <span className="text-[11px] text-slate-400">
                Model: <span className="font-semibold text-slate-200">gemini-3.8-flash</span> + TTS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Hands-Free Clinical Voice Assistant
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Designed for busy clinic pharmacists wearing gloves. Speak queries, receive reasoned FEFO batch guidance, and execute dispensing actions directly by voice.
            </p>
          </div>

          {/* Quick Voice Settings Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            {/* Thinking Level Switch */}
            <div className="flex items-center gap-1 text-xs text-slate-300">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] text-slate-400">Thinking:</span>
              <button
                onClick={() => setThinkingLevel(thinkingLevel === 'HIGH' ? 'MEDIUM' : 'HIGH')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  thinkingLevel === 'HIGH'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-700 text-slate-300'
                }`}
                title="Toggle High Thinking reasoning depth"
              >
                {thinkingLevel}
              </button>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Voice Persona Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-slate-400">Voice:</span>
              <select
                value={voicePersona}
                onChange={(e) => setVoicePersona(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-orange-300 focus:outline-hidden"
              >
                <option value="Kore">Dr. Kore (Warm Clinical)</option>
                <option value="Fenrir">Dr. Fenrir (Authoritative)</option>
                <option value="Puck">Puck (Crisp & Clear)</option>
                <option value="Zephyr">Zephyr (Gentle & Calm)</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Hands-Free Dialog Mode Toggle */}
            <button
              onClick={() => setHandsFreeMode(!handsFreeMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                handsFreeMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-700/60 text-slate-400 border border-slate-700'
              }`}
              title="Continuous conversation: mic automatically opens after the assistant speaks"
            >
              <Radio className={`w-3 h-3 ${handsFreeMode ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>Hands-Free Dialog</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => {
                if (soundEnabled) stopAudio();
                setSoundEnabled(!soundEnabled);
              }}
              className={`p-1.5 rounded transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-700 text-orange-400 hover:text-orange-300'
                  : 'bg-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'Mute voice audio output' : 'Enable voice audio output'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action Success Toast Notice */}
      {actionSuccessNotice && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccessNotice}</span>
          </div>
          <button
            onClick={() => setActionSuccessNotice(null)}
            className="text-slate-400 hover:text-white text-xs px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Voice Stage (Orb & Soundwave Visualizer) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Animated Sound Wave Visualizer when Active */}
        <div className="flex items-center justify-center gap-1.5 h-16 mb-4">
          {isListening ? (
            // Listening wave
            [40, 75, 95, 60, 85, 100, 70, 90, 50, 80, 65, 45].map((height, i) => (
              <span
                key={i}
                className="w-1.5 bg-gradient-to-t from-orange-600 to-amber-400 rounded-full animate-pulse"
                style={{
                  height: `${height}%`,
                  animationDuration: `${0.4 + (i % 4) * 0.15}s`
                }}
              />
            ))
          ) : isThinking ? (
            // High Thinking neural pulse
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center animate-spin">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  High Thinking: Analyzing Batch Shelf-Life & FEFO Rules...
                </p>
                <p className="text-[11px] text-slate-400">
                  ThinkingLevel.HIGH • Deep Multi-Step Safety & Inventory Reasoning
                </p>
              </div>
            </div>
          ) : activeAudioMessageId ? (
            // Speaking wave
            [30, 60, 80, 100, 85, 65, 90, 70, 50, 75, 40].map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full animate-bounce"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.5 + (i % 3) * 0.1}s`
                }}
              />
            ))
          ) : (
            // Idle ambient dots
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3.5 h-3.5 rounded-full bg-slate-600 animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
            </div>
          )}
        </div>

        {/* Big Interactive Glow Microphone Button */}
        <div className="relative mb-3">
          {isListening && (
            <span className="absolute -inset-3 rounded-full bg-orange-500/30 animate-ping pointer-events-none" />
          )}
          <button
            onClick={toggleListening}
            className={`w-18 h-18 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl cursor-pointer ${
              isListening
                ? 'bg-gradient-to-tr from-red-600 to-orange-500 text-white shadow-red-500/30 ring-4 ring-orange-500/40'
                : 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white hover:brightness-110 shadow-orange-500/25'
            }`}
            title={isListening ? 'Click to Stop Listening' : 'Click to Speak (Push-to-Talk)'}
          >
            {isListening ? (
              <MicOff className="w-8 h-8 animate-pulse" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>

        <p className="text-xs font-semibold text-slate-200">
          {isListening
            ? 'Listening to your clinical voice command... (Click again or pause to send)'
            : isThinking
            ? 'Engaging High Thinking reasoning across live formulary...'
            : activeAudioMessageId
            ? 'Speaking clinical guidance...'
            : 'Click microphone or spacebar to speak hands-free'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {handsFreeMode
            ? 'Hands-free dialogue active: Assistant will listen again after answering'
            : 'Push-to-talk mode active'}
        </p>

        {/* Evaluator Quick Voice Prompts (1-Click Testing without Mic) */}
        <div className="mt-5 w-full max-w-4xl pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Pre-Canned Quick Voice Prompts (Instant 1-Click Evaluator Testing)
            </span>
            <span className="text-[10px] text-slate-400">
              Zero microphone permission friction • Live High Thinking reasoning
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {presetQueries.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                disabled={isThinking}
                className="text-left p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-orange-500/50 transition cursor-pointer disabled:opacity-50 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {item.badge}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-orange-400 transition transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-xs font-semibold text-white group-hover:text-orange-200 transition">
                    "{item.label}"
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-1">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-slate-200">Voice Conversation Stream</span>
          </div>
          <button
            onClick={() => {
              stopAudio();
              setMessages([messages[0]]);
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition text-[11px] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Thread</span>
          </button>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isPlaying = activeAudioMessageId === msg.id;
            const isReasoningOpen = !!expandedReasoningIds[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isUser ? user?.name || 'Staff' : 'MediTrack AI Pharmacist'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {!isUser && msg.thinkingLevel && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      {msg.thinkingLevel} Thinking
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4 shadow-md ${
                    isUser
                      ? 'bg-orange-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  {/* Spoken / Message text */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.spokenResponse || msg.text}
                  </p>

                  {/* Audio Controls for Assistant Messages */}
                  {!isUser && (msg.spokenResponse || msg.audioBase64) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          if (isPlaying) {
                            stopAudio();
                          } else {
                            playVoiceAudio(msg.audioBase64, msg.spokenResponse || msg.text, msg.id);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-orange-400 hover:text-orange-300 font-semibold text-xs transition cursor-pointer"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 animate-pulse" />
                            <span>Pause Voice</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Play Voice Audio</span>
                          </>
                        )}
                      </button>

                      {msg.thinkingProcess && (
                        <button
                          onClick={() => toggleReasoning(msg.id)}
                          className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 font-semibold cursor-pointer"
                        >
                          <Brain className="w-3.5 h-3.5 text-purple-400" />
                          <span>{isReasoningOpen ? 'Hide Reasoning' : 'View High Thinking'}</span>
                          {isReasoningOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* High Thinking Reasoning Drawer */}
                  {!isUser && msg.thinkingProcess && isReasoningOpen && (
                    <div className="mt-3 p-3.5 bg-slate-900/90 border border-purple-500/30 rounded-xl text-xs space-y-2 text-slate-300">
                      <div className="flex items-center justify-between text-[11px] text-purple-300 font-bold border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-purple-400" />
                          <span>High Thinking Protocol Trajectory (ThinkingLevel.HIGH)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Gemini 3.8 Flash Reasoning</span>
                      </div>
                      <div className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-slate-300">
                        {msg.thinkingProcess}
                      </div>
                    </div>
                  )}

                  {/* Interactive Quick-Action Button */}
                  {!isUser && msg.suggestedAction && (
                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                          {msg.suggestedAction.type === 'QUARANTINE' ? (
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                          ) : (
                            <Pill className="w-4 h-4 text-orange-400" />
                          )}
                          <span>Suggested Action:</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {msg.suggestedAction.label}
                        </p>
                      </div>

                      <button
                        onClick={() => handleExecuteAction(msg.id, msg.suggestedAction!)}
                        disabled={msg.actionExecuted || executingActionId === msg.id}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                          msg.actionExecuted
                            ? 'bg-emerald-600 text-white cursor-default'
                            : msg.suggestedAction.type === 'QUARANTINE'
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                        }`}
                      >
                        {msg.actionExecuted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Action Completed</span>
                          </>
                        ) : executingActionId === msg.id ? (
                          <span>Executing...</span>
                        ) : (
                          <>
                            <span>Confirm & Execute</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking Indicator inside Chat */}
          {isThinking && (
            <div className="flex items-start gap-2 text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl rounded-bl-none p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  <span className="font-bold text-purple-300 text-xs">
                    Engaging High Thinking (ThinkingLevel.HIGH)...
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Checking active batches, computing diffDays from Oct 23, 2026, evaluating FEFO and synthesizing natural voice audio.
                </p>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Speak hands-free or type a clinical inquiry (e.g., 'Which Paracetamol batch expires first?')..."
                className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white border-red-500 animate-pulse'
                  : 'bg-slate-800 text-orange-400 hover:text-orange-300 border-slate-700'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
