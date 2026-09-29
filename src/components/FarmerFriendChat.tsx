import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Send,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  MessageSquare,
  Wheat,
  ShieldAlert,
  Droplets,
  HelpCircle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Smile,
  Heart,
  Bot,
  Activity,
  Stethoscope,
} from "lucide-react";
import { ThemeTokens, lightTheme, darkTheme } from "../theme";
import { Language, SUPPORTED_LANGUAGES } from "../types";
import { getFriendLocalization } from "../data/friendLocalization";

interface FarmerFriendChatProps {
  theme?: ThemeTokens;
  isDarkMode?: boolean;
  selectedLanguage: Language;
  selectedState: string;
  selectedDistrict: string;
  onNavigateTab: (tab: "advisory" | "diagnosis" | "dashboard" | "friend") => void;
}

interface Message {
  id: string;
  sender: "user" | "friend";
  text: string;
  timestamp: string;
  agentBadge?: string;
  suggestions?: string[];
  actionTarget?: string;
  isStreaming?: boolean;
}

export default function FarmerFriendChat({
  theme: customTheme,
  isDarkMode = false,
  selectedLanguage,
  selectedState,
  selectedDistrict,
  onNavigateTab,
}: FarmerFriendChatProps) {
  const { t } = useTranslation();
  const theme = customTheme || (isDarkMode ? darkTheme : lightTheme);

  // Unified dynamic localization for the selected language
  const loc = getFriendLocalization(selectedLanguage);

  const getInitialMessage = (): Message => {
    const text = loc.greeting
      .replace("{district}", selectedDistrict)
      .replace("{state}", selectedState);
    return {
      id: "welcome",
      sender: "friend",
      text,
      timestamp: "Just now",
      agentBadge: loc.friendName,
      suggestions: loc.quickPrompts,
    };
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Reset initial welcome if language or district changes and no interaction yet
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [getInitialMessage()];
      }
      return prev;
    });
  }, [selectedLanguage, selectedDistrict, selectedState]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice recognition toggle
  const toggleVoiceInput = () => {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: `notice-${Date.now()}`,
          sender: "friend",
          text: loc.browserVoiceNotice,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          agentBadge: loc.friendName,
        },
      ]);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = langConfig?.bcp47 || "hi-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Send message with streaming response
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `bot-${Date.now()}`;

    const userMessage: Message = {
      id: userMessageId,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const optimisticBotMessage: Message = {
      id: botMessageId,
      sender: "friend",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agentBadge: loc.friendName,
      isStreaming: true,
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, userMessage, optimisticBotMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      const recentHistory = messages.slice(-6).map((m) => ({
        sender: m.sender === "user" ? "user" : "assistant",
        text: m.text,
      }));

      const response = await fetch("/api/friend-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          language: selectedLanguage,
          state: selectedState,
          district: selectedDistrict,
          history: recentHistory,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (response.body && typeof ReadableStream !== "undefined") {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.substring(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                const chunk = parsed.delta ?? (parsed.type === "chunk" ? parsed.text : "");
                if (chunk) {
                  accumulatedText += chunk;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? { ...msg, text: accumulatedText, isStreaming: true }
                        : msg
                    )
                  );
                } else if (parsed.fullText) {
                  accumulatedText = parsed.fullText;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? { ...msg, text: accumulatedText, isStreaming: false }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }

        if (buffer.trim().startsWith("data: ")) {
          const dataStr = buffer.trim().substring(6).trim();
          if (dataStr !== "[DONE]") {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.delta) accumulatedText += parsed.delta;
              else if (parsed.text) accumulatedText = parsed.text;
            } catch (e) {}
          }
        }

        const actionTarget = accumulatedText.includes("[ACTION:advisory]")
          ? "advisory"
          : accumulatedText.includes("[ACTION:diagnosis]")
          ? "diagnosis"
          : accumulatedText.includes("[ACTION:dashboard]")
          ? "dashboard"
          : undefined;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text: accumulatedText || msg.text,
                  isStreaming: false,
                  actionTarget,
                  suggestions: generateContextualSuggestions(accumulatedText),
                }
              : msg
          )
        );
      } else {
        const data = await response.json();
        const replyText = data.text || data.reply || "";
        const actionTarget = replyText.includes("[ACTION:advisory]")
          ? "advisory"
          : replyText.includes("[ACTION:diagnosis]")
          ? "diagnosis"
          : replyText.includes("[ACTION:dashboard]")
          ? "dashboard"
          : undefined;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text: replyText,
                  isStreaming: false,
                  actionTarget,
                  suggestions: generateContextualSuggestions(replyText),
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.warn("Farmer Friend Chat streaming notice:", err);
      const errorText =
        err?.message ||
        (selectedLanguage === "hi"
          ? "जेमिनी एआई से संपर्क करने में समस्या आई। कृपया अपना सवाल पुनः पूछें।"
          : "Unable to connect to Gemini AI in real time. Please try sending your question again.");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: errorText,
                isStreaming: false,
                suggestions: loc.quickPrompts.slice(0, 3),
              }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const generateContextualSuggestions = (replyText: string): string[] => {
    if (replyText.includes("फसल") || replyText.includes("Crop")) {
      return loc.quickPrompts.slice(0, 3);
    }
    if (replyText.includes("बीमारी") || replyText.includes("Disease") || replyText.includes("Doctor")) {
      return [loc.quickPrompts[1], loc.quickPrompts[2]];
    }
    return loc.quickPrompts.slice(0, 3);
  };

  // Play Text-to-Speech
  const handlePlayTTS = async (messageId: string, text: string) => {
    if (playingAudioId === messageId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    setAudioLoadingId(messageId);

    try {
      const cleanText = text.replace(/[*_#`~\[\]]/g, "").replace(/ACTION:\w+/g, "").trim();

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          language: selectedLanguage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const audioSrc = data.audio || data.audioBase64;

        if (audioSrc) {
          const mime = data.mimeType || "audio/wav";
          const audio = new Audio(`data:${mime};base64,${audioSrc}`);
          audioPlayerRef.current = audio;

          audio.onended = () => {
            setPlayingAudioId(null);
            setAudioLoadingId(null);
          };
          audio.onerror = () => {
            fallbackBrowserSpeech(cleanText);
            setPlayingAudioId(null);
            setAudioLoadingId(null);
          };

          await audio.play();
          setPlayingAudioId(messageId);
          setAudioLoadingId(null);
          return;
        }
      }

      fallbackBrowserSpeech(cleanText);
      setPlayingAudioId(messageId);
      setAudioLoadingId(null);
    } catch (e) {
      fallbackBrowserSpeech(text);
      setPlayingAudioId(messageId);
      setAudioLoadingId(null);
    }
  };

  const fallbackBrowserSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_#`~\[\]]/g, "").replace(/ACTION:\w+/g, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang =
        selectedLanguage === "hi"
          ? "hi-IN"
          : selectedLanguage === "pa"
          ? "pa-IN"
          : selectedLanguage === "ta"
          ? "ta-IN"
          : selectedLanguage === "te"
          ? "te-IN"
          : selectedLanguage === "mr"
          ? "mr-IN"
          : selectedLanguage === "bn"
          ? "bn-IN"
          : selectedLanguage === "gu"
          ? "gu-IN"
          : "en-IN";
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingAudioId(null);
    }
  };

  const resetChat = () => {
    setMessages([getInitialMessage()]);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setPlayingAudioId(null);
  };

  const renderFormattedText = (text: string) => {
    const cleaned = text.replace(/\[ACTION:\w+\]/g, "").trim();
    const lines = cleaned.split("\n");
    return lines.map((line, idx) => {
      const isBullet =
        line.trim().startsWith("- ") || line.trim().startsWith("* ") || /^\d+\.\s/.test(line.trim());
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-extrabold text-[#09090b] dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <span
          key={idx}
          className={`block ${
            isBullet
              ? "pl-2.5 border-l-2 border-emerald-500/50 my-1 font-medium text-emerald-950 dark:text-emerald-100"
              : "my-1"
          }`}
        >
          {formattedLine}
        </span>
      );
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto w-full min-w-0" id="farmer-friend-page">
      {/* Friendly Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white p-6 sm:p-8 shadow-xl border border-emerald-400/20">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-inner shrink-0">
              👨‍🌾
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 bg-emerald-500/30 border border-emerald-300/40 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase">
                <Smile className="w-3.5 h-3.5 text-amber-300" />
                <span>{loc.friendName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                {loc.friendName}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed">
                {loc.subtitle} ({selectedDistrict}, {selectedState})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={resetChat}
              className="inline-flex items-center space-x-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[40px]"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <div className="bg-emerald-950/40 border border-emerald-400/30 px-3 py-2 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{loc.friendBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Quick App-Teaching Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-[#18181b] dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{loc.tutorialTitle}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Crop Advisory */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e7e7ea] dark:border-zinc-800 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                🌾
              </div>
              <h3 className="font-extrabold text-sm text-[#18181b] dark:text-white group-hover:text-emerald-600 transition-colors">
                {loc.cropCard.title}
              </h3>
              <p className="text-xs text-[#71717a] dark:text-zinc-400 leading-relaxed">
                {loc.cropCard.desc}
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-[#f4f4f5] dark:border-zinc-800 flex items-center gap-2">
              <button
                onClick={() => handleSendMessage(loc.cropCard.teachPrompt)}
                className="flex-1 min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shrink-0"
              >
                <span>{loc.teachButton}</span>
                <span>💡</span>
              </button>
              <button
                onClick={() => onNavigateTab("advisory")}
                className="min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#18181b] dark:text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Open Crop Advisory"
              >
                <span>{loc.openButton}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Plant Doctor */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e7e7ea] dark:border-zinc-800 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg">
                🩺
              </div>
              <h3 className="font-extrabold text-sm text-[#18181b] dark:text-white group-hover:text-emerald-600 transition-colors">
                {loc.diseaseCard.title}
              </h3>
              <p className="text-xs text-[#71717a] dark:text-zinc-400 leading-relaxed">
                {loc.diseaseCard.desc}
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-[#f4f4f5] dark:border-zinc-800 flex items-center gap-2">
              <button
                onClick={() => handleSendMessage(loc.diseaseCard.teachPrompt)}
                className="flex-1 min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shrink-0"
              >
                <span>{loc.teachButton}</span>
                <span>💡</span>
              </button>
              <button
                onClick={() => onNavigateTab("diagnosis")}
                className="min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#18181b] dark:text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Open Plant Doctor"
              >
                <span>{loc.openButton}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Outbreak Radar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e7e7ea] dark:border-zinc-800 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                🗺️
              </div>
              <h3 className="font-extrabold text-sm text-[#18181b] dark:text-white group-hover:text-emerald-600 transition-colors">
                {loc.mapCard.title}
              </h3>
              <p className="text-xs text-[#71717a] dark:text-zinc-400 leading-relaxed">
                {loc.mapCard.desc}
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-[#f4f4f5] dark:border-zinc-800 flex items-center gap-2">
              <button
                onClick={() => handleSendMessage(loc.mapCard.teachPrompt)}
                className="flex-1 min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shrink-0"
              >
                <span>{loc.teachButton}</span>
                <span>💡</span>
              </button>
              <button
                onClick={() => onNavigateTab("dashboard")}
                className="min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#18181b] dark:text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Open Outbreaks Map"
              >
                <span>{loc.openButton}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 4: Voice & Speech */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e7e7ea] dark:border-zinc-800 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                🎙️
              </div>
              <h3 className="font-extrabold text-sm text-[#18181b] dark:text-white group-hover:text-emerald-600 transition-colors">
                {loc.voiceCard.title}
              </h3>
              <p className="text-xs text-[#71717a] dark:text-zinc-400 leading-relaxed">
                {loc.voiceCard.desc}
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-[#f4f4f5] dark:border-zinc-800 flex items-center gap-2">
              <button
                onClick={() => handleSendMessage(loc.voiceCard.teachPrompt)}
                className="flex-1 min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shrink-0"
              >
                <span>{loc.teachButton}</span>
                <span>💡</span>
              </button>
              <button
                onClick={toggleVoiceInput}
                className="min-h-[44px] sm:min-h-[46px] md:min-h-[48px] py-2 px-3.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Start Voice Mic"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{loc.speakButton}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Friendly Chatbox Canvas */}
      <div className="rounded-3xl bg-white dark:bg-[#121216] border border-[#e7e7ea] dark:border-zinc-800 shadow-md flex flex-col h-[650px] overflow-hidden">
        {/* Chatbox Sub-Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#e7e7ea] dark:border-zinc-800 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-transparent dark:from-emerald-950/30 dark:via-zinc-900 dark:to-transparent flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              👨‍🌾
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-[#18181b] dark:text-white">
                  {loc.friendName}
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-[#71717a] dark:text-zinc-400">
                {selectedDistrict}, {selectedState}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={resetChat}
              className="p-2 rounded-xl text-[#71717a] dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Clear chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message History Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {messages.map((m) => {
            const isUser = m.sender === "user";
            const isPlaying = playingAudioId === m.id;
            const isLoadingAudio = audioLoadingId === m.id;

            return (
              <div
                key={m.id}
                className={`flex items-start space-x-2.5 sm:space-x-3 ${
                  isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xs shrink-0 ${
                    isUser
                      ? "bg-zinc-800 dark:bg-zinc-700 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : "👨‍🌾"}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[85%] sm:max-w-[80%] space-y-2`}>
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-none font-medium"
                        : "bg-zinc-50 dark:bg-zinc-900 border border-[#e7e7ea] dark:border-zinc-800 text-[#18181b] dark:text-zinc-200 rounded-tl-none"
                    }`}
                  >
                    {/* Badge on Bot Message */}
                    {!isUser && (
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200/60 dark:border-zinc-800/80">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          <span>{m.agentBadge || loc.friendName}</span>
                          {m.isStreaming && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold animate-pulse">
                              {loc.typingLive}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#71717a] dark:text-zinc-500">
                          {m.timestamp}
                        </span>
                      </div>
                    )}

                    {/* Content / Streaming State */}
                    {m.isStreaming && !m.text ? (
                      <div className="py-1 text-xs text-[#71717a] dark:text-zinc-400 flex items-center space-x-2">
                        <span className="flex space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {loc.thinking}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {renderFormattedText(m.text)}
                        {m.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-emerald-500 ml-1.5 animate-pulse rounded-xs align-middle" />
                        )}
                      </div>
                    )}

                    {/* Interactive Action Buttons attached to message (only when completed streaming) */}
                    {!isUser && !m.isStreaming && m.text && (
                      <div className="pt-2.5 mt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80 flex flex-wrap items-center gap-2 sm:gap-2.5">
                        {/* Audio Speaker Playback Button */}
                        <button
                          onClick={() => handlePlayTTS(m.id, m.text)}
                          disabled={isLoadingAudio}
                          className={`inline-flex items-center space-x-1.5 min-h-[44px] sm:min-h-[46px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                            isPlaying
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300"
                              : "bg-emerald-100/70 dark:bg-emerald-950/50 hover:bg-emerald-200/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40"
                          }`}
                          title="Listen to response"
                        >
                          {isLoadingAudio ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>{loc.audioLoading}</span>
                            </>
                          ) : isPlaying ? (
                            <>
                              <VolumeX className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{loc.stopAudio}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{loc.listenAudio}</span>
                            </>
                          )}
                        </button>

                        {/* Navigation Shortcut Buttons */}
                        {(m.text.includes("[ACTION:advisory]") ||
                          m.actionTarget === "advisory") && (
                          <button
                            onClick={() => onNavigateTab("advisory")}
                            className="inline-flex items-center space-x-1.5 min-h-[44px] sm:min-h-[46px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
                          >
                            <span>{loc.openAdvisoryAction}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}

                        {(m.text.includes("[ACTION:diagnosis]") ||
                          m.actionTarget === "diagnosis") && (
                          <button
                            onClick={() => onNavigateTab("diagnosis")}
                            className="inline-flex items-center space-x-1.5 min-h-[44px] sm:min-h-[46px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-100/80 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300/60 hover:bg-rose-200 transition-colors cursor-pointer shrink-0"
                          >
                            <span>{loc.openDiagnosisAction}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}

                        {(m.text.includes("[ACTION:dashboard]") ||
                          m.actionTarget === "dashboard") && (
                          <button
                            onClick={() => onNavigateTab("dashboard")}
                            className="inline-flex items-center space-x-1.5 min-h-[44px] sm:min-h-[46px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-100/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-300/60 hover:bg-blue-200 transition-colors cursor-pointer shrink-0"
                          >
                            <span>{loc.openDashboardAction}</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {!isUser && !m.isStreaming && m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {m.suggestions.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(s)}
                          disabled={isProcessing}
                          className="min-h-[44px] sm:min-h-[46px] text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-full bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-[#e7e7ea] dark:border-zinc-700 transition-colors cursor-pointer shadow-2xs text-left disabled:opacity-50"
                        >
                          💬 {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Fallback Thinking Animation if no active streaming placeholder */}
          {isProcessing && !messages.some((m) => m.isStreaming) && (
            <div className="flex items-start space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                👨‍🌾
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-[#e7e7ea] dark:border-zinc-800 text-xs text-[#71717a] dark:text-zinc-400 flex items-center space-x-2">
                <span className="flex space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {loc.thinking}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Voice Controls */}
        <div className="p-3 sm:p-4 border-t border-[#e7e7ea] dark:border-zinc-800 bg-white/90 dark:bg-[#121216]/90 backdrop-blur-md">
          {/* Quick Learning Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-2.5 no-scrollbar text-xs">
            {loc.quickPrompts.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap min-h-[44px] sm:min-h-[46px] px-3.5 sm:px-4 py-2 rounded-full bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#18181b] dark:text-zinc-200 text-xs sm:text-sm font-bold border border-transparent hover:border-emerald-300 dark:hover:border-zinc-600 transition-all cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2 sm:space-x-3"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 sm:p-3 md:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] md:min-h-[52px] md:min-w-[52px] lg:min-h-[56px] lg:min-w-[56px] ${
                isListening
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse shadow-md"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
              }`}
              title={isListening ? "Listening... click to stop" : "Click to speak in your language"}
              aria-label="Voice input"
            >
              {isListening ? (
                <MicOff className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white shrink-0" />
              ) : (
                <Mic className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </button>

            {/* Text Input Field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={loc.placeholder}
              className="flex-1 min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] px-4 sm:px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-[#e7e7ea] dark:border-zinc-700 text-xs sm:text-sm md:text-base text-[#18181b] dark:text-white placeholder:text-[#a1a1aa] dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="p-2.5 sm:p-3 md:p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] md:min-h-[52px] md:min-w-[52px] lg:min-h-[56px] lg:min-w-[56px] flex items-center justify-center shadow-xs"
              title="Send message"
              aria-label="Send"
            >
              <Send className="w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0" />
            </button>
          </form>

          {isListening && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1.5 animate-pulse text-center">
              🎙️ {loc.browserVoiceNotice || "Listening... please speak in your language"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
