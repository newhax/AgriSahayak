import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Language, CropRecommendationResponse, SUPPORTED_LANGUAGES } from "../types";
import { getSoilProfileWithFallback, getLocalizedFallbackAdvisory } from "../data";
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Send,
  Volume2,
  ThermometerSun,
  Leaf,
  AlertCircle,
  Bot,
  User,
  CheckCircle2,
  Headphones,
  FileText,
  Copy,
  Check,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  PhoneCall,
} from "lucide-react";
import { lightTheme, darkTheme } from "../theme";
import AdvisorySkeleton from "./skeletons/AdvisorySkeleton";

interface AdvisoryProps {
  selectedLanguage: Language;
  selectedState: string;
  selectedDistrict: string;
  isDarkMode?: boolean;
}

const PRESET_QUERIES: Partial<Record<Language, string[]>> = {
  en: [
    "What should I plant this season for high yield?",
    "How do I improve my soil health organically?",
    "Suggest a suitable rotation crop for my district.",
  ],
  hi: [
    "अधिक उपज के लिए मुझे इस मौसम में क्या बोना चाहिए?",
    "मैं जैविक रूप से अपनी मिट्टी के स्वास्थ्य को कैसे सुधारूं?",
    "मेरे जिले के लिए एक उपयुक्त फसल चक्र का सुझाव दें।",
  ],
  mr: [
    "अधिक उत्पादनासाठी मी या हंगामात काय पेरावे?",
    "मी सेंद्रिय पद्धतीने माझ्या मातीचे आरोग्य कसे सुधारू?",
    "माझ्या जिल्ह्यासाठी योग्य पीक फिरतीचा सल्ला द्या.",
  ],
  ta: [
    "அதிக மகசூலுக்கு இந்த பருவத்தில் நான் என்ன நடவு செய்ய வேண்டும்?",
    "இயற்கை முறையில் மண்ணின் ஆரோக்கியத்தை மேம்படுத்துவது எப்படி?",
    "எனது மாவட்டத்திற்கு ஏற்ற பயிர் சுழற்சியைப் பரிந்துரைக்கவும்.",
  ],
  te: [
    "అధిక దిగుబడి కోసం ఈ సీజన్‌లో నేను ఏమి నాటాలి?",
    "సేంద్రీయ పద్ధతిలో నా నేల ఆరోగ్యాన్ని ఎలా మెరుగుపరచుకోవాలి?",
    "నా జిల్లాకు తగిన పంట మార్పిడిని సూచించండి.",
  ],
  bn: [
    "অধিক ফলনের জন্য এই মরসুমে আমার কী রোপণ করা উচিত?",
    "আমি কীভাবে জৈবিকভাবে আমার মাটির স্বাস্থ্য উন্নত করব?",
    "আমার জেলার জন্য একটি উপযুক্ত ফসল আবর্তনের পরামর্শ দিন।",
  ],
  gu: [
    "વધુ ઉપજ માટે મારે આ ઋતુમાં શું વાવવું જોઈએ?",
    "હું કુદરતી રીતે જમીનની ફળદ્રુપતા કેવી રીતે સુધારી શકું?",
    "મારા જિલ્લા માટે યોગ્ય પાક ચક્ર સૂચવો.",
  ],
  kn: [
    "ಹೆಚ್ಚಿನ ಇಳುವರಿಗಾಗಿ ನಾನು ಈ ಋತುವಿನಲ್ಲಿ ಏನು ಬಿತ್ತಬೇಕು?",
    "ಸಾವಯವವಾಗಿ ಮಣ್ಣಿನ ಫಲವತ್ತತೆಯನ್ನು ಹೇಗೆ ಹೆಚ್ಚಿಸುವುದು?",
    "ನನ್ನ ಜಿಲ್ಲೆಗೆ ಸೂಕ್ತವಾದ ಬೆಳೆ ಪರಿವರ್ತನೆಯನ್ನು ಸೂಚಿಸಿ.",
  ],
  pa: [
    "ਵੱਧ ਝਾੜ ਲਈ ਮੈਨੂੰ ਇਸ ਸੀਜ਼ਨ ਵਿੱਚ ਕੀ ਬੀਜਣਾ ਚਾਹੀਦਾ ਹੈ?",
    "ਮੈਂ ਕੁਦਰਤੀ ਤਰੀਕੇ ਨਾਲ ਆਪਣੀ ਮਿੱਟੀ ਦੀ ਸਿਹਤ ਕਿਵੇਂ ਸੁਧਾਰਾਂ?",
    "ਮੇਰੇ ਜ਼ਿਲ੍ਹੇ ਲਈ ਢੁਕਵੇਂ ਫ਼ਸਲ ਚੱਕਰ ਦਾ ਸੁਝਾਅ ਦਿਓ।",
  ],
  ml: [
    "കൂടുതൽ വിളവിനായി ഈ സീസണിൽ ഞാൻ എന്താണ് കൃഷി ചെയ്യേണ്ടത്?",
    "ജൈവരീതിയിൽ മണ്ണിന്റെ ഫലഭൂയിഷ്ഠത എങ്ങനെ വർദ്ധിപ്പിക്കാം?",
    "എന്റെ ജില്ലയ്ക്ക് അനുയോജ്യമായ വിള പരിക്രമണം നിർദ്ദേശിക്കുക.",
  ],
  or: [
    "ଅଧିକ ଅମଳ ପାଇଁ ଏହି ଋତୁରେ କେଉଁ ଫସଲ ଚାଷ କରିବା ଉଚିତ?",
    "ଜୈବିକ ଉପାୟରେ ମାଟିର ସ୍ୱାସ୍ଥ୍ୟ କିପରି ସୁଧାରିବି?",
    "ମୋ ଜିଲ୍ଲା ପାଇଁ ଉପଯୁକ୍ତ ଫସଲ ପର୍ଯ୍ୟାୟ ପରାମର୍ଶ ଦିଅନ୍ତୁ।",
  ],
  as: [
    "অধিক উৎপাদনৰ বাবে এই ঋতুত কি শস্য সিঁচিব লাগে?",
    "জৈৱিক পদ্ধতিৰে মাটিৰ উৰ্বৰতা কেনেকৈ বৃদ্ধি কৰিব পাৰি?",
    "মোৰ জিলাৰ বাবে উপযুক্ত শস্য পৰ্য্যায়ৰ পৰামৰ্শ দিয়ক।",
  ],
  ur: [
    "زیادہ پیداوار کے لیے اس موسم میں مجھے کیا بونا چاہیے؟",
    "نامیاتی طریقے سے مٹی کی زرخیزی کو کیسے بہتر بنایا جائے؟",
    "میرے ضلع کے لیے موزوں فصلی چکر تجویز کریں۔",
  ],
};

export default function Advisory({
  selectedLanguage,
  selectedState,
  selectedDistrict,
  isDarkMode = false,
}: AdvisoryProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CropRecommendationResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsAudio, setTtsAudio] = useState<string | null>(null);
  const [ttsMimeType, setTtsMimeType] = useState<string>("audio/wav");
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>("");
  const [isTranscriptVisible, setIsTranscriptVisible] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const prevLangRef = useRef<Language>(selectedLanguage);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_LANGUAGES[0];

  // Dynamically resolve district soil profile with ICAR fallback hierarchy
  const districtProfile = useMemo(() => {
    return getSoilProfileWithFallback(selectedState, selectedDistrict);
  }, [selectedState, selectedDistrict]);

  const handleCopyTranscript = () => {
    if (currentSpeechText) {
      navigator.clipboard.writeText(currentSpeechText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && currentLangObj.voiceInputSupported) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = currentLangObj.bcp47 || "hi-IN";

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        setVoiceNotice(null);
      };

      rec.onerror = (e: any) => {
        console.warn("Speech Recognition Error:", e);
        setIsListening(false);
        if (e.error === "not-allowed") {
          setVoiceNotice("Microphone permission was denied. Please enable mic access or type your question.");
        } else if (e.error === "no-speech") {
          // ignore silence
        } else {
          setVoiceNotice(`Speech recognition notice (${e.error}). You can continue using keyboard input.`);
        }
        setTimeout(() => setVoiceNotice(null), 5000);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      recognitionRef.current = null;
    }
  }, [selectedLanguage, currentLangObj]);

  // Re-generate if language changes and an active query exists
  useEffect(() => {
    if (prevLangRef.current !== selectedLanguage) {
      prevLangRef.current = selectedLanguage;
      if (activeQuery) {
        executeAdvisory(activeQuery, selectedLanguage);
      }
    }
  }, [selectedLanguage]);

  const toggleListening = () => {
    if (!currentLangObj.voiceInputSupported) {
      setVoiceNotice(
        currentLangObj.voiceNotice ||
          `Voice input is currently in preview for ${currentLangObj.nativeName}. Please type your question in the text box.`
      );
      setTimeout(() => setVoiceNotice(null), 7000);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice("Speech recognition is not supported in this browser. Please type your query.");
      setTimeout(() => setVoiceNotice(null), 5000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        setVoiceNotice(null);
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition error:", err);
      }
    }
  };

  const executeAdvisory = async (
    queryText: string,
    langToUse: Language = selectedLanguage
  ) => {
    if (!queryText.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setActiveQuery(queryText);
    setTtsAudio(null);
    setCurrentSpeechText("");

    try {
      const response = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langToUse,
          state: selectedState,
          district: selectedDistrict,
          query: queryText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned HTTP ${response.status}`);
      }

      const data: CropRecommendationResponse = await response.json();
      if (!data || !Array.isArray(data.crops) || data.crops.length === 0) {
        throw new Error("Invalid advisory response format from Gemini AI");
      }

      setResult(data);

      const speechScript =
        data.audioTranscript ||
        `${data.crops?.map((c) => c.cropName).join(", ") || ""}. ${
          data.riskMitigation || ""
        }`;
      setCurrentSpeechText(speechScript);

      try {
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: speechScript,
            language: langToUse,
          }),
        });

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          const audio = ttsData.audio || ttsData.audioBase64;
          if (audio) {
            setTtsAudio(audio);
            if (ttsData.mimeType) {
              setTtsMimeType(ttsData.mimeType);
            }
          }
        }
      } catch (ttsErr) {
        console.warn("TTS generation warning:", ttsErr);
      }
    } catch (error: any) {
      console.error("Advisory error:", error);
      setErrorMessage(error?.message || "Failed to generate real-time AI crop advisory. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const generateAdvisory = (e: React.FormEvent) => {
    e.preventDefault();
    executeAdvisory(query, selectedLanguage);
  };

  const speakWithBrowser = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLangObj.bcp47 || "hi-IN";
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playAudio = (base64: string, mimeType: string = "audio/wav") => {
    try {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch((playErr) => {
        console.warn("Autoplay or audio playback was prevented/failed:", playErr);
        if (currentSpeechText) {
          speakWithBrowser(currentSpeechText);
        }
      });
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
      };
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsPlaying(false);
      if (currentSpeechText) {
        speakWithBrowser(currentSpeechText);
      }
    }
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else if (ttsAudio) {
      playAudio(ttsAudio, ttsMimeType);
    } else if (currentSpeechText) {
      speakWithBrowser(currentSpeechText);
    }
  };

  const presetList = PRESET_QUERIES[selectedLanguage] || PRESET_QUERIES.en || [];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto w-full min-w-0" id="advisory-container">
      {/* Farm Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`${theme.card} p-4 sm:p-6 space-y-4`}
        id="advisory-header"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={theme.accentBadge}>
                {selectedDistrict}, {selectedState}
              </span>
              {/* Dynamic Soil Fallback Confidence Badge */}
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-2xs ${
                  districtProfile.confidence === "district-verified"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : districtProfile.confidence === "zone-estimate"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                }`}
                title={districtProfile.confidenceDescription}
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>{districtProfile.confidenceLabel}</span>
              </span>
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                {districtProfile.soilType}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#18181b] dark:text-white">
              {t("advisory.title")}
            </h2>
            <p className="text-[#71717a] dark:text-zinc-300 text-xs sm:text-sm font-medium">
              {t("advisory.subtitle")}
            </p>
          </div>

          {/* Real-time telemetry badges using actual districtProfile values */}
          <div className="grid grid-cols-3 gap-2 text-xs bg-[#f4f4f6] dark:bg-[#18181D] border border-[#e7e7ea] dark:border-zinc-800 p-2.5 sm:p-3.5 rounded-xl shadow-2xs w-full md:w-auto">
            <div className="text-center px-1">
              <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-bold uppercase truncate">
                {t("advisory.satelliteNdvi")}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                {districtProfile.ndviValue}
              </span>
            </div>
            <div className="border-x border-[#e7e7ea] dark:border-zinc-800 text-center px-1">
              <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-bold uppercase truncate">
                {t("advisory.soilMoisture")}
              </span>
              <span className="font-bold text-[#18181b] dark:text-white text-xs sm:text-sm">
                {districtProfile.moistureValue}%
              </span>
            </div>
            <div className="text-center px-1">
              <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-bold uppercase truncate">
                {t("advisory.soilChemistry")}
              </span>
              <span className="font-bold text-[#18181b] dark:text-white text-xs sm:text-sm">
                pH {districtProfile.ph}
              </span>
            </div>
          </div>
        </div>

        {/* Human Escalation Path: Krishi Vigyan Kendra & Kisan Call Centre */}
        <div className="pt-2 border-t border-[#e7e7ea] dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 text-[#71717a] dark:text-zinc-400">
            <User className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
            <span className="font-bold text-[11px] text-[#18181b] dark:text-zinc-200">
              {districtProfile.kvkContact.title}
            </span>
            <span className="text-[10px] text-[#71717a] dark:text-zinc-400 hidden md:inline">
              • {districtProfile.confidenceDescription}
            </span>
          </div>
          <a
            href="tel:18001801551"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors w-fit"
            title="Free 24x7 agricultural officer guidance"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Kisan Call Centre: 1800-180-1551 (22 Languages)</span>
          </a>
        </div>
      </motion.div>

      {/* Query Bar */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className={`${theme.card} p-4 sm:p-6 md:p-8 space-y-5`}
        id="query-panel"
      >
        <div className="space-y-1">
          <h3 className="font-bold text-[#18181b] dark:text-white text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563eb]" />
            {t("advisory.title")} ({currentLangObj.nativeName})
          </h3>
          <p className="text-[#71717a] dark:text-zinc-300 text-xs sm:text-sm font-medium">
            {t("advisory.subtitle")}
          </p>
        </div>

        {/* Input Bar with Accent Mic Button & Responsive Touch Targets */}
        <form onSubmit={generateAdvisory} className="flex gap-2 sm:gap-3 items-center w-full">
          <div className="relative flex-1 min-w-0">
            <input
              id="query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("advisory.queryPlaceholder")}
              className={`${theme.input} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] text-xs sm:text-sm md:text-base py-2.5 sm:py-3 px-3.5 sm:px-4.5`}
              aria-label="Ask agriculture question"
            />
          </div>

          {/* Voice Input Button (Thumb-reachable, 44px on mobile to 56px on desktop) */}
          <button
            type="button"
            id="mic-btn"
            onClick={toggleListening}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] md:min-h-[52px] md:min-w-[52px] lg:min-h-[56px] lg:min-w-[56px] p-2.5 sm:p-3 md:p-3.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isListening
                ? "bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-500/20"
                : "bg-white dark:bg-[#18181c] text-[#71717a] dark:text-zinc-300 border-[#e7e7ea] dark:border-zinc-700 hover:border-[#2563eb] hover:text-[#2563eb]"
            }`}
            title={isListening ? "Listening..." : "Click to speak"}
            aria-label="Voice input button"
          >
            {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5" />}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            id="submit-advisory-btn"
            disabled={!query.trim() || loading}
            className={`${theme.primaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] px-3.5 sm:px-5 md:px-6 lg:px-7 gap-1.5 sm:gap-2 disabled:opacity-40 shrink-0 text-xs sm:text-sm md:text-base font-bold`}
            aria-label="Submit query"
          >
            <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>

        {/* Preset Query Chips (Fluid tap targets on mobile) */}
        <div className="space-y-2 xs:space-y-2.5 pt-2 border-t border-[#e7e7ea] dark:border-zinc-800">
          <span className="text-[10px] xs:text-[11px] font-bold text-[#71717a] dark:text-zinc-400 uppercase tracking-wider block">
            {t("advisory.presetQueriesTitle", "Recommended Inquiries")}
          </span>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {presetList.map((preset, idx) => (
              <motion.button
                key={idx}
                id={`preset-btn-${idx}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setQuery(preset);
                  executeAdvisory(preset);
                }}
                className="min-h-[44px] sm:min-h-[46px] md:min-h-[48px] text-xs sm:text-sm bg-white dark:bg-[#141418] text-[#18181b] dark:text-zinc-200 border border-[#e7e7ea] dark:border-zinc-700/80 hover:border-[#2563eb] dark:hover:border-blue-500 hover:bg-[#eff4ff] dark:hover:bg-blue-950/40 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full font-medium transition-all cursor-pointer shadow-2xs text-left"
              >
                {preset}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Loading Screen with Farmer Tips */}
      {loading && (
        <AdvisorySkeleton
          theme={theme}
          activeQuery={activeQuery || query}
          selectedDistrict={selectedDistrict}
          selectedState={selectedState}
          currentLangNative={currentLangObj.nativeName}
          selectedLanguage={selectedLanguage}
        />
      )}

      {/* Error state */}
      {errorMessage && !loading && (
        <div
          className="p-4 sm:p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start space-x-3 text-rose-950 dark:text-rose-200 shadow-2xs"
          id="advisory-error-banner"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold">Unable to load crop advisory</p>
            <p className="text-xs text-rose-800 dark:text-rose-300">{errorMessage}</p>
            {activeQuery && (
              <button
                type="button"
                id="retry-advisory-btn"
                onClick={() => executeAdvisory(activeQuery)}
                className="inline-flex items-center min-h-[40px] text-xs font-semibold px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors shadow-2xs cursor-pointer"
              >
                Retry Query
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State before any question */}
      {!result && !loading && !errorMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`${theme.card} p-6 sm:p-10 text-center space-y-3.5`}
          id="advisory-empty-state"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 flex items-center justify-center mx-auto shadow-2xs border border-blue-200/60 dark:border-blue-800/40">
            <Bot className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-base sm:text-lg text-[#18181b] dark:text-white">
            {t("advisory.emptyStateTitle")}
          </h4>
          <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
            {t("advisory.emptyStateSubtitle")}
          </p>
        </motion.div>
      )}

      {/* Chat conversation area: User input vs AI response cards */}
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
          id="chat-conversation-thread"
        >
          {/* User Message Bubble */}
          <div className="flex justify-end" id="user-message-bubble">
            <div className="bg-[#2563eb] text-white p-3.5 sm:p-4.5 rounded-2xl rounded-tr-xs max-w-lg shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-[10px] opacity-90 uppercase font-bold tracking-wider">
                <User className="w-3 h-3" />
                <span>You</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{activeQuery}</p>
            </div>
          </div>

          {/* AI Response Card */}
          <div className="space-y-6" id="ai-response-card">
            <div className={`${theme.card} p-4 sm:p-6 md:p-8 space-y-6`}>
              {/* Header with Multi-Agent Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e7e7ea] dark:border-zinc-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#18181b] dark:text-white">
                    {t("nav.title")} Autonomous Advisory
                  </span>
                  <span className="text-[10px] bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {currentLangObj.nativeName}
                  </span>
                </div>

                {(ttsAudio || currentSpeechText) && (
                  <button
                    id="tts-play-btn-header"
                    onClick={handlePlayToggle}
                    className={`${theme.secondaryButton} min-h-[44px] sm:min-h-[46px] md:min-h-[48px] lg:min-h-[52px] text-xs sm:text-sm px-3.5 sm:px-4 md:px-5 py-2 gap-1.5 self-start sm:self-auto shrink-0`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current text-rose-500 shrink-0" />
                        <span>{t("advisory.stopAudio")}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-[#2563eb] shrink-0" />
                        <span>{t("advisory.listenAudio")}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Step-by-Step Agentic Verification Timeline (Responsive grid) */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2.5" id="agentic-timeline">
                <span className="text-[10px] font-bold text-[#71717a] dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  Agentic Triage Protocol Verification
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-[#18181c] border border-[#e7e7ea] dark:border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-[11px] text-[#18181b] dark:text-zinc-200 truncate">Parsed</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-[#18181c] border border-[#e7e7ea] dark:border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-[11px] text-[#18181b] dark:text-zinc-200 truncate">Weather</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-[#18181c] border border-[#e7e7ea] dark:border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-[11px] text-[#18181b] dark:text-zinc-200 truncate">Soil</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300 truncate">ICAR</span>
                  </div>
                </div>
              </div>

              {/* Dedicated Listen to Advisory Transcript Suite */}
              {(ttsAudio || currentSpeechText) && (
                <div
                  className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-2xs"
                  id="listen-advisory-transcript-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-xs shrink-0">
                        <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#18181b] dark:text-white">
                            {t("advisory.listenTranscript", "Listen to Advisory Broadcast")}
                          </h4>
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-semibold px-2 py-0.5 rounded-full">
                            {currentLangObj.nativeName}
                          </span>
                        </div>
                        <p className="text-xs text-[#71717a] dark:text-zinc-300 font-medium mt-0.5">
                          {t("advisory.audioNarrator", "Agricultural Audio Narration")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <button
                        id="tts-play-btn"
                        onClick={handlePlayToggle}
                        className={`${theme.primaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] text-xs sm:text-sm md:text-base px-4 sm:px-5 md:px-6 lg:px-7 py-2 sm:py-2.5 gap-2 flex-1 xs:flex-initial justify-center font-bold`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-4 h-4 fill-current text-white animate-pulse shrink-0" />
                            <span>{t("advisory.stopAudio", "Stop Audio")}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                            <span>{t("advisory.listenTranscript", "Listen Broadcast")}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        id="toggle-transcript-view-btn"
                        onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                        className={`${theme.secondaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] text-xs sm:text-sm md:text-base px-3.5 sm:px-4 md:px-5 py-2 sm:py-2.5 gap-1.5 font-bold`}
                      >
                        <FileText className="w-4 h-4 text-[#71717a] dark:text-zinc-300 shrink-0" />
                        <span>
                          {isTranscriptVisible
                            ? t("advisory.hideTranscript", "Hide")
                            : t("advisory.viewTranscript", "Transcript")}
                        </span>
                      </button>

                      {currentSpeechText && (
                        <button
                          type="button"
                          id="copy-transcript-btn"
                          onClick={handleCopyTranscript}
                          className={`${theme.secondaryButton} min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] md:min-h-[52px] md:min-w-[52px] lg:min-h-[56px] lg:min-w-[56px] text-xs px-3 py-2 gap-1.5 flex items-center justify-center shrink-0`}
                          title={t("advisory.copyTranscript", "Copy Transcript")}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#71717a] shrink-0" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Spoken Transcript Content */}
                  {isTranscriptVisible && currentSpeechText && (
                    <div
                      className="bg-white/95 dark:bg-zinc-900/90 border border-blue-200/70 dark:border-blue-800/50 rounded-xl p-3.5 sm:p-4 space-y-2 shadow-2xs"
                      id="spoken-transcript-content"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                          {t("advisory.transcriptTitle", "Spoken Advisory Transcript")} ({currentLangObj.name})
                        </span>
                        {isPlaying && (
                          <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold animate-pulse text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-ping" />
                            Playing
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-[#18181b] dark:text-zinc-100 leading-relaxed italic bg-blue-50/40 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100/70 dark:border-blue-900/40">
                        "{currentSpeechText}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Four Clearly Labeled Mini-Sections */}
              <div className="space-y-6 text-left">
                {/* 1. Crop Choice */}
                <div className="space-y-3" id="section-crop-choice">
                  <div className="flex items-center space-x-2 text-[#18181b] dark:text-white">
                    <Leaf className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
                    <h4 className="font-extrabold text-sm sm:text-base">
                      1. {t("advisory.whyCrop")}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {result.crops?.map((crop, idx) => (
                      <div
                        key={idx}
                        id={`crop-card-${idx}`}
                        className="bg-[#f8f9fa] dark:bg-[#18181D] border border-[#e7e7ea] dark:border-zinc-800 p-4 sm:p-5 rounded-2xl space-y-2.5"
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-bold text-[#18181b] dark:text-white text-sm sm:text-base">
                            {crop.cropName}
                          </h5>
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/50">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 leading-relaxed font-normal">
                          {crop.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Sowing Window */}
                <div className="space-y-3" id="section-sowing-window">
                  <div className="flex items-center space-x-2 text-[#18181b] dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-extrabold text-sm sm:text-base">
                      2. {t("advisory.sowingWindow")}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {result.crops?.map((crop, idx) => (
                      <div
                        key={idx}
                        className="bg-[#f8f9fa] dark:bg-[#18181D] border border-[#e7e7ea] dark:border-zinc-800 p-4 rounded-2xl flex justify-between items-center text-xs sm:text-sm"
                      >
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-[#71717a] dark:text-zinc-400">
                            Crop
                          </span>
                          <span className="font-bold text-[#18181b] dark:text-white">
                            {crop.cropName}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-[#71717a] dark:text-zinc-400">
                            {t("advisory.sowingWindow")}
                          </span>
                          <span className="font-bold text-[#18181b] dark:text-zinc-200">
                            {crop.sowingWindow}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-[#71717a] dark:text-zinc-400">
                            Yield
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {crop.expectedYield}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Soil Practice */}
                <div className="space-y-3" id="section-soil-practice">
                  <div className="flex items-center space-x-2 text-[#18181b] dark:text-white">
                    <ThermometerSun className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-extrabold text-sm sm:text-base">
                      3. {t("advisory.regenPractices")}
                    </h4>
                  </div>
                  <div className="bg-[#f8f9fa] dark:bg-[#18181D] border border-[#e7e7ea] dark:border-zinc-800 p-4 sm:p-5 rounded-2xl">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {result.regenerativePractices?.map((practice, idx) => (
                        <li
                          key={idx}
                          className="flex items-start text-xs sm:text-sm text-[#18181b] dark:text-zinc-200 font-medium"
                        >
                          <span className="text-[#2563eb] mr-2 font-bold">•</span>
                          <span>{practice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. Risk to Watch */}
                <div className="space-y-3" id="section-risk-to-watch">
                  <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <h4 className="font-extrabold text-sm sm:text-base">
                      4. {t("advisory.seasonalRisk")}
                    </h4>
                  </div>
                  <div className={`${theme.dangerBg} border ${theme.dangerBorder} p-4 sm:p-5 rounded-2xl`}>
                    <p className="text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 leading-relaxed font-medium">
                      {result.riskMitigation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
