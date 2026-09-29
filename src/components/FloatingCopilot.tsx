'use client';

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { ThemeTokens, lightTheme, darkTheme } from "../theme";
import { Language, SUPPORTED_LANGUAGES } from "../types";
import { getFriendLocalization } from "../data/friendLocalization";

interface FloatingCopilotProps {
  theme?: ThemeTokens;
  isDarkMode?: boolean;
  selectedLanguage: Language;
  selectedState: string;
  selectedDistrict: string;
  onNavigateTab?: (tab: "advisory" | "diagnosis" | "dashboard" | "friend") => void;
}

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  agentBadge?: string;
  suggestions?: string[];
  actionTarget?: string;
  isStreaming?: boolean;
}

export default function FloatingCopilot({
  isDarkMode = false,
  selectedLanguage,
  selectedState,
  selectedDistrict,
  onNavigateTab,
}: FloatingCopilotProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const loc = getFriendLocalization(selectedLanguage);

  const getInitialGreeting = (): Message => {
    const text = loc.greeting
      .replace("{district}", selectedDistrict)
      .replace("{state}", selectedState);
    return {
      id: "initial-greeting",
      sender: "copilot",
      text,
      timestamp: "Just now",
      agentBadge: loc.friendName || "Hero Assistant",
      suggestions: loc.quickPrompts,
    };
  };

  const [messages, setMessages] = useState<Message[]>([getInitialGreeting()]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update initial message when language, district, or state changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [getInitialGreeting()];
      }
      return prev;
    });
  }, [selectedLanguage, selectedDistrict, selectedState]);

  // Auto-scroll to bottom on new messages or streaming chunks
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isProcessing]);

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

  const toggleVoiceInput = () => {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          id: `notice-${Date.now()}`,
          sender: "copilot",
          text: loc.browserVoiceNotice || "Voice input is not supported in this browser.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          agentBadge: loc.friendName || "Hero Assistant",
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

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `copilot-${Date.now()}`;

    const userMessage: Message = {
      id: userMessageId,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const optimisticBotMessage: Message = {
      id: botMessageId,
      sender: "copilot",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agentBadge: loc.friendName || "Hero Assistant",
      isStreaming: true,
    };

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
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.delta) {
                  accumulatedText += parsed.delta;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? { ...msg, text: accumulatedText, isStreaming: true }
                        : msg
                    )
                  );
                } else if (parsed.text) {
                  accumulatedText = parsed.text;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? { ...msg, text: accumulatedText, isStreaming: true }
                        : msg
                    )
                  );
                }
              } catch (e) {}
            }
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
                  suggestions: loc.quickPrompts.slice(0, 3),
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
                  suggestions: loc.quickPrompts.slice(0, 3),
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.warn("Hero Assistant chat error:", err);
      const fallbackReply = `Hello! In ${selectedDistrict}, ${selectedState}, you can explore Crop Advisory, Plant Doctor, and Outbreak Radar map for live recommendations.`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: fallbackReply,
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
    setMessages([getInitialGreeting()]);
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
            <strong key={pIdx} className="font-semibold text-[#09090b] dark:text-white">
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
            isBullet ? "pl-2 border-l-2 border-blue-500/50 my-0.5" : "my-0.5"
          }`}
        >
          {formattedLine}
        </span>
      );
    });
  };

  return (
    <>
      {/* 1. Viewport Stacking: Persistent Floating Action Button (FAB) Anchor */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fab-trigger"
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        title={isOpen ? "Close AI Assistant" : "Hero Assistant"}
        id="hero-assistant-fab"
      >
        <motion.div
          key={isOpen ? "close" : "open"}
          initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.18 }}
        >
          {isOpen ? <X size={24} /> : <Bot size={26} />}
        </motion.div>
      </button>

      {/* 2. Glassmorphism Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-window"
            id="hero-assistant-panel"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            {/* Header Bar (.chat-head / .chat-header) */}
            <div className="chat-header">
              <div className="avatar-badge">
                <Bot size={17} color="#ffffff" />
              </div>
              <div className="title-group">
                <span className="title">Hero Assistant</span>
                <span className="subtitle">
                  <span className="status-dot" /> Live · Gemini AI · {selectedDistrict}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetChat}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Close"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Message Body (.chat-body / .chat-messages) */}
            <div className="chat-messages" ref={messagesEndRef}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Bubble Content */}
                  <div className={`bubble ${m.sender === "user" ? "user" : "assistant"}`}>
                    {m.sender === "copilot" ? (
                      m.isStreaming && !m.text ? (
                        <div className="bubble assistant typing">
                          <span>●</span>
                          <span>●</span>
                          <span>●</span>
                        </div>
                      ) : (
                        <div>
                          {renderFormattedText(m.text)}
                          {m.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-blue-600 dark:bg-blue-400 ml-1 animate-pulse align-middle" />
                          )}
                        </div>
                      )
                    ) : (
                      m.text
                    )}

                    {/* Spoken Audio Narration Micro-button for Assistant Messages */}
                    {m.sender === "copilot" && !m.isStreaming && m.text && (
                      <div className="mt-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handlePlayTTS(m.id, m.text)}
                          disabled={audioLoadingId === m.id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 cursor-pointer transition-colors"
                          title="Listen to audio"
                        >
                          {audioLoadingId === m.id ? (
                            <RefreshCw size={12} className="animate-spin text-blue-500" />
                          ) : playingAudioId === m.id ? (
                            <VolumeX size={12} className="text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Volume2 size={12} />
                          )}
                          <span>{playingAudioId === m.id ? loc.stopAudio : loc.listenAudio}</span>
                        </button>
                      </div>
                    )}

                    {/* Interactive Action Navigation Buttons */}
                    {m.sender === "copilot" && !m.isStreaming && onNavigateTab && (
                      <div className="pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-wrap gap-1.5">
                        {(m.text.includes("[ACTION:advisory]") || m.actionTarget === "advisory") && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab("advisory");
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>{loc.openAdvisoryAction}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                        {(m.text.includes("[ACTION:diagnosis]") || m.actionTarget === "diagnosis") && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab("diagnosis");
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>{loc.openDiagnosisAction}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                        {(m.text.includes("[ACTION:dashboard]") || m.actionTarget === "dashboard") && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab("dashboard");
                              setIsOpen(false);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>{loc.openDashboardAction}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggestion Pills */}
                  {!m.isStreaming && m.suggestions && m.suggestions.length > 0 && (
                    <div className="chat-suggestions">
                      {m.suggestions.map((prompt, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isProcessing}
                          className="suggestion-pill"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing / Awaiting response indicator */}
              {isProcessing && !messages.some((m) => m.isStreaming) && (
                <div className="bubble assistant typing">
                  <span>●</span>
                  <span>●</span>
                  <span>●</span>
                </div>
              )}
            </div>

            {/* Input Footer (.chat-foot / .chat-input-bar) */}
            <form
              className="chat-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                type="text"
                placeholder={loc.placeholder || "Ask about crops, weather, or soil..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="chat-input-pill"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                  isListening
                    ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                    : "bg-[#fafafa] dark:bg-[#202024] text-zinc-500 hover:text-blue-600 dark:text-zinc-400 border-[#e4e4e7] dark:border-zinc-700"
                }`}
                aria-label="Voice input"
                title="Voice input"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  inputText.trim() && !isProcessing
                    ? "bg-[#18181b] dark:bg-blue-600 text-white shadow-xs hover:scale-105 active:scale-95"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 opacity-45 cursor-not-allowed"
                }`}
                aria-label="Send message"
                title="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
