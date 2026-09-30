import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeTokens } from "../../theme";
import {
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Microscope,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Clock,
  PhoneCall,
  CheckCircle2,
  Bug,
  Sprout,
  Droplets,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface DiagnosisSkeletonProps {
  theme: ThemeTokens;
  selectedDistrict: string;
  selectedState?: string;
  selectedLanguage?: string;
}

interface ProtectionTip {
  crop: string;
  category: string;
  title: string;
  content: string;
  organicRemedy: string;
  iconType: "shield" | "bug" | "sprout" | "droplet";
}

const PROTECTION_TIPS_BY_LANG: Record<string, ProtectionTip[]> = {
  hi: [
    {
      crop: "गेहूँ (Wheat)",
      category: "पीला रतुआ (Yellow Rust) सुरक्षा",
      title: "पीले पाउडर वाले रतुआ रोग की तुरंत पहचान व जैविक इलाज",
      content: "पत्तों पर हल्दी जैसा पीला पाउडर दिखे तो तुरंत 5 लीटर खट्टी छाछ (मट्ठा) + 200 ग्राम हींग 100 लीटर पानी में घोलकर प्रति एकड़ छिड़कें।",
      organicRemedy: "वैज्ञानिक दवा: प्रोपिकोनाज़ोल 25% EC (1 मिली/लीटर) दोपहर बाद छिड़कें।",
      iconType: "shield",
    },
    {
      crop: "धान / चावल (Paddy)",
      category: "झोंका रोग (Rice Blast) व खैरा रोग",
      title: "धान की पत्तियों पर आंख के आकार के धब्बों से बचाव",
      content: "रोपाई से पहले ट्राइकोडर्मा विरिडी (5 ग्राम/किग्रा) से बीज उपचारित करें। पत्तियों पर लाल-भूरे धब्बे (खैरा) दिखने पर 1 किग्रा जिंक सल्फेट (21%) + 500 ग्राम बुझा चूना छिड़कें।",
      organicRemedy: "सूटेड दवा: ट्राइसाइक्लाजोल 75% WP @ 0.6 ग्राम प्रति लीटर पानी।",
      iconType: "sprout",
    },
    {
      crop: "सरसों व कपास (Mustard & Cotton)",
      category: "माहू (चेपा) व रसचूसक कीट",
      title: "बिना किसी जहरीली दवा के 80% कीटों का नियंत्रण",
      content: "खेत में प्रति एकड़ 15-20 पीले चिपचिपे कार्ड (Yellow Sticky Traps) लगाएं। शुरुआती कीटों पर नीम का तेल 1500 PPM (5 मिली/लीटर) + थोड़ा साबुन घोलकर छिड़कें।",
      organicRemedy: "कीट नियंत्रण: इमिडाक्लोप्रिड 17.8 SL (0.5 मिली/लीटर) शाम को प्रयोग करें।",
      iconType: "bug",
    },
    {
      crop: "आलू व टमाटर (Potato & Tomato)",
      category: "अगेती व पिछेती झुलसा (Blight)",
      title: "पत्तियों के गीले काले धब्बों व सड़न से बचाव",
      content: "बादल वाले नमीयुक्त मौसम में ओवरहेड फव्वारा सिंचाई न करें। शुरुआती सुरक्षा के लिए 5 ग्राम ट्राइकोडर्मा मिट्टी में मिलाएं या छाछ का छिड़काव करें।",
      organicRemedy: "कवकनाशी: मैंकोजेब 75% WP (2 ग्राम/लीटर) या कॉपर ऑक्सीक्लोराइड 50% WP (2.5 ग्राम/लीटर)।",
      iconType: "droplet",
    },
    {
      crop: "दालें व सब्जियां (Pulses & Vegetables)",
      category: "उकठा रोग (Wilt) व जड़ सड़न",
      title: "जड़ों के गलने व पौधों के सूखने की जैविक रोकथाम",
      content: "बुवाई के समय सड़ी गोबर खाद या वर्मीकम्पोस्ट (100 किग्रा) में स्यूडोमोनास फ्लोरेसेंस (2.5 किग्रा) मिलाकर खेत में डालें।",
      organicRemedy: "मृदा संशोधन: फसल चक्र अपनाएं और जलभराव न होने दें।",
      iconType: "sprout",
    },
  ],
  pa: [
    {
      crop: "ਕਣਕ (Wheat)",
      category: "ਪੀਲਾ ਰਤਵਾ (Yellow Rust)",
      title: "ਕਣਕ ਦੇ ਪੀਲੇ ਰਤਵੇ ਦੀ ਰੋਕਥਾਮ",
      content: "ਪੱਤਿਆਂ 'ਤੇ ਪੀਲਾ ਹਲਦੀ ਵਰਗਾ ਪਾਊਡਰ ਦਿਸਣ 'ਤੇ 5 ਲੀਟਰ ਖੱਟੀ ਲੱਸੀ 100 ਲੀਟਰ ਪਾਣੀ ਵਿੱਚ ਮਿਲਾ ਕੇ ਛਿੜਕੋ।",
      organicRemedy: "ਦਵਾਈ: ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ 25% EC (1 ਮਿ.ਲੀ./ਲੀਟਰ) ਦਾ ਛਿੜਕਾਅ ਕਰੋ।",
      iconType: "shield",
    },
    {
      crop: "ਝੋਨਾ (Paddy)",
      category: "ਝੁਲਸ ਰੋਗ ਅਤੇ ਖੈਰਾ",
      title: "ਝੋਨੇ ਦੀ ਫ਼ਸਲ ਨੂੰ ਬਿਮਾਰੀਆਂ ਤੋਂ ਬਚਾਓ",
      content: "ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਟ੍ਰਾਈਕੋਡਰਮਾ ਨਾਲ ਬੀਜ ਸੋਧੋ। ਜ਼ਿੰਕ ਦੀ ਘਾਟ ਲਈ ਜ਼ਿੰਕ ਸਲਫੇਟ 1 ਕਿੱਲੋ + ਅੱਧਾ ਕਿੱਲੋ ਚੂਨਾ ਛਿੜਕੋ।",
      organicRemedy: "ਟ੍ਰਾਈਸਾਈਕਲਾਜ਼ੋਲ 75% WP (0.6 ਗ੍ਰਾਮ/ਲੀਟਰ)।",
      iconType: "sprout",
    },
    {
      crop: "ਸਰ੍ਹੋਂ (Mustard)",
      category: "ਤੇਲਾ ਅਤੇ ਚੇਪਾ (Aphids)",
      title: "ਪੀਲੇ ਸਟਿੱਕੀ ਕਾਰਡਾਂ ਨਾਲ ਤੇਲੇ ਦੀ ਰੋਕਥਾਮ",
      content: "ਖੇਤ ਵਿੱਚ 15-20 ਪੀਲੇ ਚਿਪਚਿਪੇ ਕਾਰਡ ਲਗਾਓ ਅਤੇ ਨੀਮ ਦੇ ਤੇਲ (5 ਮਿ.ਲੀ./ਲੀਟਰ) ਦਾ ਛਿੜਕਾਅ ਕਰੋ।",
      organicRemedy: "ਈਮਿਡਾਕਲੋਪ੍ਰਿਡ 17.8 SL (0.5 ਮਿ.ਲੀ./ਲੀਟਰ)।",
      iconType: "bug",
    },
  ],
  mr: [
    {
      crop: "गहू व कापूस (Wheat & Cotton)",
      category: "तांबेरा व मावा कीड नियंत्रण",
      title: "पिकांवरील रोगांचे सेंद्रिय व जैविक व्यवस्थापन",
      content: "पानांवर पिवळे धब्बे किंवा मावा दिसल्यास १५०० पीपीएम कडुनिंब तेल (५ मिली/लिटर) साबणाच्या द्रावणासोबत फवारा.",
      organicRemedy: "रासायनिक पर्याय: प्रोपिकोनाझोल किंवा इमिडाक्लोप्रिड योग्य प्रमाणात वापरा.",
      iconType: "shield",
    },
    {
      crop: "भात व भाजीपाला (Paddy & Vegetables)",
      category: "करपा व मूळकूज रोग",
      title: "बियाणे प्रक्रिया व ट्रायकोडर्माचा वापर",
      content: "पेरणीपूर्वी ट्रायकोडर्मा विरिडी (५ ग्रॅम/किलो) ने बीजप्रक्रिया करा. शेतात पाणी साचू देऊ नका.",
      organicRemedy: "मँकोझेब ७५% WP (२ ग्रॅम/लिटर) फवारा.",
      iconType: "sprout",
    },
  ],
  ta: [
    {
      crop: "நெல் & பருத்தி (Paddy & Cotton)",
      category: "பயிர நோய் மற்றும் பூச்சி மேலாண்மை",
      title: "இயற்கை முறையில் பூச்சி மற்றும் நோய் கட்டுப்பாடு",
      content: "இலைகளில் மஞ்சள் ஒட்டுப் பொறிகளை (15-20/ஏக்கர்) வைத்து அசுவினி பூச்சிகளைக் கட்டுப்படுத்தவும். வேப்ப எண்ணெய் 1500 PPM தெளிக்கவும்.",
      organicRemedy: "ட்ரைசைக்ளசோல் அல்லது மேன்கோசெப் பரிந்துரைக்கப்பட்ட அளவில் தெளிக்கவும்.",
      iconType: "shield",
    },
  ],
  te: [
    {
      crop: "వరి & పత్తి (Paddy & Cotton)",
      category: "పంటల చీడపీడల నివారణ",
      title: "సహజ సిద్ధమైన తెగుళ్ల నివారణ చిట్కాలు",
      content: "ఎకరానికి 15-20 పసుపు జిగురు కార్డులు అమర్చండి. వేప నూనె 1500 PPM నీటిలో కలిపి పిచికారీ చేయండి.",
      organicRemedy: "ట్రైకోడెర్మా విరిడీతో విత్తన శుద్ధి చేయండి.",
      iconType: "shield",
    },
  ],
  en: [
    {
      crop: "Wheat (गेंहू)",
      category: "Yellow Rust Prevention",
      title: "Identify Yellow Powder Symptoms & Apply Bio-Control",
      content: "If turmeric-like yellow powdery stripes appear on leaves, spray 5L fermented sour buttermilk + 200g asafoetida (hing) in 100L water per acre.",
      organicRemedy: "Fungicide: Propiconazole 25% EC @ 1 ml/L during clear afternoon hours.",
      iconType: "shield",
    },
    {
      crop: "Paddy / Rice (धान)",
      category: "Rice Blast & Khaira Correction",
      title: "Prevent Spindle Lesions & Zinc Deficiency",
      content: "Perform seed treatment with Trichoderma viride @ 5g/kg seed. For Khaira reddish-brown spots, spray 1kg Zinc Sulphate (21%) + 0.5kg Slaked lime per acre.",
      organicRemedy: "Fungicide: Tricyclazole 75% WP @ 0.6 g/L of water.",
      iconType: "sprout",
    },
    {
      crop: "Mustard & Cotton (सरसों व कपास)",
      category: "Aphids & Whiteflies Control",
      title: "Capture 80% Sucking Pests Non-Chemically",
      content: "Install 15-20 Yellow Sticky Traps per acre. Spray Neem oil 1500 PPM @ 5 ml/L mixed with 1 ml liquid soap during initial infestation.",
      organicRemedy: "Insecticide: Imidacloprid 17.8% SL @ 0.5 ml/L during evening.",
      iconType: "bug",
    },
    {
      crop: "Potato & Tomato (आलू व टमाटर)",
      category: "Early & Late Blight",
      title: "Protect Foliage From Water-Soaked Necrotic Spots",
      content: "Avoid overhead sprinkler irrigation during humid cloudy conditions. Apply soil Trichoderma @ 5g/L or fermented buttermilk spray.",
      organicRemedy: "Fungicide: Mancozeb 75% WP @ 2g/L or Copper Oxychloride 50% WP @ 2.5g/L.",
      iconType: "droplet",
    },
    {
      crop: "Pulses & Vegetables (दालें व सब्जियां)",
      category: "Wilt & Root Rot Prevention",
      title: "Organic Root Bio-Shield with Beneficial Bacteria",
      content: "Incorporate Pseudomonas fluorescens @ 2.5 kg/acre mixed with 100 kg compost into soil during land preparation.",
      organicRemedy: "Cultural Practice: Ensure proper drainage & practice crop rotation.",
      iconType: "sprout",
    },
  ],
};

export default function DiagnosisSkeleton({
  theme,
  selectedDistrict,
  selectedState = "Punjab",
  selectedLanguage = "hi",
}: DiagnosisSkeletonProps) {
  const tips = PROTECTION_TIPS_BY_LANG[selectedLanguage] || PROTECTION_TIPS_BY_LANG.hi || PROTECTION_TIPS_BY_LANG.en;
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Auto-rotate protection tips every 4 seconds while Gemini AI pathology model is scanning
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [tips.length]);

  const activeTip = tips[currentTipIndex];

  const renderIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "droplet":
        return <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "sprout":
        return <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div
      className={`${theme.card} p-4 sm:p-6 md:p-8 space-y-6 transition-all duration-200 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-md`}
      id="diagnosis-result-skeleton"
      role="status"
      aria-label="Diagnosing crop leaf image with pathology protection tips"
    >
      {/* 1. TOP LIVE PATHOLOGY AI SCANNING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e7e7ea] dark:border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Microscope className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500" />
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base text-[#18181b] dark:text-white flex items-center gap-1.5">
                Gemini AI Pathology Scanning
                <Sparkles className="w-4 h-4 text-purple-500 fill-purple-400 animate-pulse" />
              </span>
              <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                ICAR Pathology Standard
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold flex items-center gap-1">
              <ScanLine className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>Scanning leaf tissue symptoms for {selectedDistrict}, {selectedState}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-zinc-400 bg-[#f4f4f6] dark:bg-[#18181D] px-3 py-1.5 rounded-full border border-[#e7e7ea] dark:border-zinc-800 self-start sm:self-auto font-medium">
          <Clock className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          <span>Analyzing microscopic patterns...</span>
        </div>
      </div>

      {/* Animated Scanning Line Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#71717a] dark:text-zinc-400">
          <span>Symptom Extraction & Pathogen Database Lookup</span>
          <span className="text-purple-600 dark:text-purple-400">Reading Crop Protection Tips...</span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-full"
            initial={{ width: "10%" }}
            animate={{ width: ["15%", "50%", "80%", "95%"] }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
          />
        </div>
      </div>

      {/* 2. HERO CROP PROTECTION TIPS ROTATING CAROUSEL CARD */}
      <div className="bg-gradient-to-br from-purple-50/80 via-emerald-50/50 to-amber-50/60 dark:from-purple-950/40 dark:via-emerald-950/30 dark:to-amber-950/30 border border-purple-200/90 dark:border-purple-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs relative overflow-hidden">
        {/* Top Header Row with Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Lightbulb className="w-4 h-4 fill-amber-300 text-amber-200 animate-bounce" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 block">
                Crop Protection Wisdom (फसल सुरक्षा ज्ञान)
              </span>
              <span className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                {activeTip.crop} — {activeTip.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentTipIndex((prev) => (prev === 0 ? tips.length - 1 : prev - 1))}
              className="p-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 transition-colors cursor-pointer"
              title="Previous Protection Tip"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 px-1">
              {currentTipIndex + 1}/{tips.length}
            </span>
            <button
              type="button"
              onClick={() => setCurrentTipIndex((prev) => (prev + 1) % tips.length)}
              className="p-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 transition-colors cursor-pointer"
              title="Next Protection Tip"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Tip Content with Motion Fade Transition */}
        <div className="min-h-[100px] sm:min-h-[85px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="space-y-2 w-full"
            >
              <h4 className="text-sm sm:text-base font-extrabold text-[#18181b] dark:text-white flex items-center gap-2">
                {renderIcon(activeTip.iconType)}
                <span>{activeTip.title}</span>
              </h4>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                {activeTip.content}
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{activeTip.organicRemedy}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {tips.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentTipIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentTipIndex ? "w-6 bg-purple-600 dark:bg-purple-400" : "w-1.5 bg-purple-200 dark:bg-purple-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. THREE CROP PATHOLOGY PROTECTION ESSENTIAL CARDS */}
      <div className="space-y-3 pt-1">
        <span className="text-[11px] font-extrabold text-[#71717a] dark:text-zinc-400 uppercase tracking-wider block">
          Essential Crop Disease Prevention Rules:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Seed Bio-Treatment */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sprout className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                {selectedLanguage === "hi" ? "बीज शोधन (Seed Treatment)" : "Seed Bio-Treatment"}
              </h5>
            </div>
            <p className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium leading-normal">
              {selectedLanguage === "hi"
                ? "बुवाई से पहले ट्राइकोडर्मा विरिडी (5 ग्राम/किग्रा बीज) से शोधन करने पर 90% उकठा व जड़ सड़न रुकती है।"
                : "Treating seeds with Trichoderma viride @ 5g/kg seed prevents 90% soil-borne seedling wilts."}
            </p>
          </div>

          {/* Card 2: Organic Bio-Fungicide */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                {selectedLanguage === "hi" ? "देसी कवकनाशी (Bio Spray)" : "Bio-Fungicide Spray"}
              </h5>
            </div>
            <p className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium leading-normal">
              {selectedLanguage === "hi"
                ? "5 लीटर खट्टी मट्ठा छाछ + 200 ग्राम हींग 100 लीटर पानी में मिलाकर छिड़कना फफूंद का प्राकृतिक इलाज है।"
                : "Fermented sour buttermilk (5L/100L water) acts as a natural organic copper bio-fungicide."}
            </p>
          </div>

          {/* Card 3: Generic Chemical Active Dosing */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                {selectedLanguage === "hi" ? "सटीक दवा प्रयोग (Safe Dosing)" : "Generic Fungicide Dosing"}
              </h5>
            </div>
            <p className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium leading-normal">
              {selectedLanguage === "hi"
                ? "दवा हमेशा प्रति लीटर पानी (2 ग्राम/लीटर) के मानक घोल अनुसार शाम के समय साफ धूप वाले दिन छिड़कें।"
                : "Always dilute generic fungicides at standard 2g/L water ratio and spray during clear evening hours."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. EMERGENCY AGRICULTURAL OFFICER HELPLINE */}
      <div className="bg-[#f8f9fa] dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="font-bold text-[#18181b] dark:text-zinc-200">
            Need officer plant pathology confirmation in {selectedDistrict}?
          </span>
        </div>
        <a
          href="tel:18001801551"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-800/80 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors w-fit shrink-0"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Kisan Call Centre: 1800-180-1551 (Toll Free)</span>
        </a>
      </div>
    </div>
  );
}
