import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeTokens } from "../../theme";
import {
  Bot,
  User,
  Lightbulb,
  Sprout,
  ShieldCheck,
  Droplets,
  Bug,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Cpu,
  CheckCircle2,
  Heart,
} from "lucide-react";

interface AdvisorySkeletonProps {
  theme: ThemeTokens;
  activeQuery?: string;
  selectedDistrict: string;
  selectedState: string;
  currentLangNative: string;
  selectedLanguage?: string;
}

interface FarmingTip {
  category: string;
  title: string;
  content: string;
  iconType: "sprout" | "bug" | "droplet" | "shield";
}

const FARMING_TIPS_BY_LANG: Record<string, FarmingTip[]> = {
  hi: [
    {
      category: "जैविक खाद व मिट्टी पोषण",
      title: "देसी जीवामृत बनाने का तरीका",
      content: "10 किग्रा गाय का गोबर + 10 लीटर गोमूत्र + 1 किग्रा गुड़ + 1 किग्रा बेसन को 200 लीटर पानी में 48 घंटे फर्मेंट करके खेत में देने से मिट्टी में मित्र जीवाणु 3 गुना बढ़ते हैं।",
      iconType: "sprout",
    },
    {
      category: "सुरक्षित कीट नियंत्रण",
      title: "पीले चिपचिपे कार्ड (Yellow Sticky Traps)",
      content: "प्रति एकड़ 15-20 पीले चिपचिपे कार्ड लगाने से चेपा (माहू) और सफेद मक्खी 80% तक बिना किसी रासायनिक कीटनाशक के पकड़े जाते हैं।",
      iconType: "bug",
    },
    {
      category: "सिंचाई प्रबंधन",
      title: "गेहूँ की पहली क्रांतिक सिंचाई (CRI Stage)",
      content: "गेहूँ में बुवाई के 20-22 दिन बाद ताज जड़ (CRI) निकलते समय पहली सिंचाई बहुत जरूरी है। इस समय पानी न देने से पैदावार 25-30% घट सकती है।",
      iconType: "droplet",
    },
    {
      category: "मौसम व पाला सुरक्षा",
      title: "पाले (Frost) से फसल का बचाव",
      content: "अत्यधिक ठंड या पाले की आशंका होने पर शाम के समय खेत में हल्की सिंचाई कर दें। गीली मिट्टी दिन की धूप की गर्मी रोककर जड़ों को जमाव से बचाती है।",
      iconType: "shield",
    },
    {
      category: "जैविक कीटनाशक",
      title: "नीम तेल 1500 PPM का सही छिड़काव",
      content: "रसचूसक कीटों के शुरुआती लक्षण दिखते ही 5 मिली नीम तेल प्रति लीटर पानी में थोड़ा साबुन घोलकर शाम के समय छिड़कें।",
      iconType: "sprout",
    },
  ],
  pa: [
    {
      category: "ਕੁਦਰਤੀ ਖਾਦ",
      title: "ਦੇਸੀ ਜੀਵਾਮ੍ਰਿਤ ਦੀ ਵਰਤੋਂ",
      content: "ਦੇਸੀ ਗਾਂ ਦੇ ਗੋਬਰ ਅਤੇ ਗਊ ਮੂਤਰ ਨਾਲ ਤਿਆਰ ਜੀਵਾਮ੍ਰਿਤ ਮਿੱਟੀ ਦੀ ਜੈਵਿਕ ਤਾਕਤ ਵਧਾਉਂਦਾ ਹੈ ਅਤੇ ਰਸਾਇਣਕ ਖਾਦਾਂ ਦਾ ਖਰਚਾ ਘਟਾਉਂਦਾ ਹੈ।",
      iconType: "sprout",
    },
    {
      category: "ਕੀਟ ਰੋਕਥਾਮ",
      title: "ਪੀਲੇ ਸਟਿੱਕੀ ਟ੍ਰੈਪ (Yellow Traps)",
      content: "ਖੇਤ ਵਿੱਚ ਪੀਲੇ ਚਿਪਚਿਪੇ ਕਾਰਡ ਲਗਾਉਣ ਨਾਲ ਤੇਲੇ ਅਤੇ ਚਿੱਟੀ ਮੱਖੀ ਦੀ ਰੋਕਥਾਮ ਬਿਨਾਂ ਜ਼ਹਿਰੀਲੀਆਂ ਦਵਾਈਆਂ ਤੋਂ ਹੁੰਦੀ ਹੈ।",
      iconType: "bug",
    },
    {
      category: "ਕਣਕ ਦੀ ਸੰਭਾਲ",
      title: "ਪਹਿਲਾ ਪਾਣੀ (CRI ਸਟੇਜ)",
      content: "ਕਣਕ ਨੂੰ ਬਿਜਾਈ ਤੋਂ 20-22 ਦਿਨਾਂ ਬਾਅਦ ਪਹਿਲਾ ਪਾਣੀ ਦੇਣਾ ਸਭ ਤੋਂ ਜ਼ਰੂਰੀ ਹੈ, ਜਿਸ ਨਾਲ ਜੜ੍ਹਾਂ ਮਜ਼ਬੂਤ ਹੁੰਦੀਆਂ ਹਨ।",
      iconType: "droplet",
    },
  ],
  mr: [
    {
      category: "सेंद्रिय शेती",
      title: "जीवामृत तयार करण्याची पद्धत",
      content: "१० किलो शेण + १० लिटर गोमूत्र + १ किलो गूळ + १ किलो बेसन २०० लिटर पाण्यात ४८ तास भिजवल्यास उत्तम सेंद्रिय जिवाणू खत तयार होते.",
      iconType: "sprout",
    },
    {
      category: "कीड नियंत्रण",
      title: "पिवळे चिकट सापळे",
      content: "पिकांवर किडींचा प्रादुर्भाव टाळण्यासाठी एकरी १५-२० पिवळे सापळे लावल्यास मावा आणि पांढरी माशी नैसर्गिकरित्या नियंत्रणात येते.",
      iconType: "bug",
    },
    {
      category: "पाणी व्यवस्थापन",
      title: "ठिबक व तुषार सिंचन",
      content: "तुषार किंवा ठिबक सिंचनामुळे ४०% पाण्याची बचत होते आणि पिकांची वाढ एकसारखी होते.",
      iconType: "droplet",
    },
  ],
  ta: [
    {
      category: "இயற்கை உரம்",
      title: "ஜீவாமிர்தம் தயாரிக்கும் முறை",
      content: "பசும் சாணம், கோமியம், வெல்லம் மற்றும் கடலை மாவு கலந்து 48 மணி நேரம் ஊறவைத்து ஜீவாமிர்தம் தயாரித்தால் மண் வளம் பெருக்கம் அடையும்.",
      iconType: "sprout",
    },
    {
      category: "பூச்சி மேலாண்மை",
      title: "மஞ்சள் ஒட்டுப் பொறி",
      content: "ஏக்கருக்கு 15-20 மஞ்சள் ஒட்டுப் பொறிகளை வைத்தால் அசுவினி மற்றும் வெள்ளை ஈக்கள் பூச்சிக்கொல்லி இன்றி கட்டுப்படும்.",
      iconType: "bug",
    },
    {
      category: "நீர் மேலாண்மை",
      title: "சொட்டு நீர் பாசனம்",
      content: "சொட்டு நீர் பாசனம் மூலம் 40% நீர் சேமிக்கப்பட்டு பயிர்களின் மகசூல் 15% அதிகரிக்கும்.",
      iconType: "droplet",
    },
  ],
  te: [
    {
      category: "సేంద్రీయ వ్యవసాయం",
      title: "జీవామృతం తయారీ విధానం",
      content: "ఆవు పేడ, మూత్రం, బెల్లం, శనగపిండితో తయారుచేసిన జీవామృతం నేలలోని పోషక విలువలను మరియు మిత్ర పురుగులను పెంచుతుంది.",
      iconType: "sprout",
    },
    {
      category: "పురుగుల నివారణ",
      title: "పసుపు జిగురు కార్డులు",
      content: "ఎకరానికి 15-20 పసుపు జిగురు కార్డులు అమర్చడం ద్వారా రసం పీల్చే పురుగులను కెమికల్స్ లేకుండా అరికట్టవచ్చు.",
      iconType: "bug",
    },
  ],
  bn: [
    {
      category: "জৈব সার",
      title: "জীবাণুমৃত তৈরির সহজ উপায়",
      content: "গোবর, গোমূত্র, গুড় ও বেসন মিশিয়ে তৈরি জীবাণুমৃত মাটিতে দিলে মাটির ফলের গুণমান ও উর্বরতা ৩ গুণ বৃদ্ধি পায়।",
      iconType: "sprout",
    },
    {
      category: "পোকা দমন",
      title: "হলুদ স্টিকি ট্র্যাপ",
      content: "একরে ১৫-২০টি হলুদ আঠালো কার্ড বসালে পোকা ও শোষক পোকা ক্ষতিকর রাসায়নিক ছাড়াই সহজে নিয়ন্ত্রিত হয়।",
      iconType: "bug",
    },
  ],
  en: [
    {
      category: "Organic Soil Boost",
      title: "Jeevamrutha Bio-Fertilizer Recipe",
      content: "10 kg indigenous cow dung + 10 L cow urine + 1 kg jaggery + 1 kg pulse flour in 200 L water. Ferment for 48 hours to multiply beneficial soil microbes by 3x.",
      iconType: "sprout",
    },
    {
      category: "Eco Pest Control",
      title: "Yellow Sticky Traps for Sucking Pests",
      content: "Installing 15-20 yellow sticky traps per acre captures 80% of aphids and whiteflies naturally without any synthetic chemical spray.",
      iconType: "bug",
    },
    {
      category: "Smart Irrigation",
      title: "Critical Crown Root Initiation (CRI) in Wheat",
      content: "First irrigation at 20-22 days after sowing (Crown Root Initiation stage) is crucial for deep root anchorage and tillering in wheat.",
      iconType: "droplet",
    },
    {
      category: "Weather Protection",
      title: "Frost & Cold Wave Mitigation",
      content: "Light evening irrigation during extreme cold spells increases soil thermal mass and prevents frost injury to young vegetative tissues.",
      iconType: "shield",
    },
    {
      category: "Bio-Pesticide",
      title: "Neem Oil 1500 PPM Spray Ratio",
      content: "At first sign of foliar pests, spray Neem oil 1500 PPM @ 5 ml per litre of water mixed with 1 ml liquid soap during evening hours.",
      iconType: "sprout",
    },
  ],
};

export default function AdvisorySkeleton({
  theme,
  activeQuery,
  selectedDistrict,
  selectedState,
  currentLangNative,
  selectedLanguage = "hi",
}: AdvisorySkeletonProps) {
  const tips = FARMING_TIPS_BY_LANG[selectedLanguage] || FARMING_TIPS_BY_LANG.hi || FARMING_TIPS_BY_LANG.en;
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Auto-rotate tips every 4.5 seconds while waiting for Gemini API response
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [tips.length]);

  const activeTip = tips[currentTipIndex];

  const renderIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "droplet":
        return <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "shield":
        return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div
      className="space-y-6"
      id="advisory-loading-tips-container"
      role="status"
      aria-label="Gemini AI Analyzing Advisory and Showing Farmer Tips"
    >
      {/* 1. User Query Mirror Bubble */}
      {activeQuery && (
        <div className="flex justify-end" id="user-query-mirror">
          <div className="bg-[#2563eb] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-xs max-w-lg shadow-sm space-y-1">
            <div className="flex items-center space-x-1.5 text-[10px] opacity-90 uppercase font-bold tracking-wider">
              <User className="w-3 h-3" />
              <span>You Asked</span>
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed">{activeQuery}</p>
          </div>
        </div>
      )}

      {/* 2. Main Live Gemini AI Status Header Card */}
      <div className={`${theme.card} p-4 sm:p-6 space-y-5 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e7e7ea] dark:border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Bot className="w-5 h-5 animate-spin-slow" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base text-[#18181b] dark:text-white flex items-center gap-1.5">
                  Gemini AI Advisor Working
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 animate-pulse" />
                </span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                  {currentLangNative}
                </span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span>Analyzing soil & satellite models for {selectedDistrict}, {selectedState}...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-zinc-400 bg-[#f4f4f6] dark:bg-[#18181D] px-3 py-1.5 rounded-full border border-[#e7e7ea] dark:border-zinc-800 self-start sm:self-auto font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Fetching real-time advice...</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#71717a] dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              ICAR Soil Profile + Open-Meteo Weather Model
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">Reading Farmer Wisdom...</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 rounded-full"
              initial={{ width: "10%" }}
              animate={{ width: ["15%", "45%", "75%", "92%"] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            />
          </div>
        </div>

        {/* 3. HERO FARMING TIP ROTATING CAROUSEL CARD */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-amber-50/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-amber-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs relative overflow-hidden">
          {/* Top Label & Navigation Arrows */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Lightbulb className="w-4 h-4 fill-amber-300 text-amber-200 animate-bounce" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Farmer's Wisdom while loading (किसान ज्ञान)
                </span>
                <span className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                  {activeTip.category}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentTipIndex((prev) => (prev === 0 ? tips.length - 1 : prev - 1))}
                className="p-1.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer"
                title="Previous Tip"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 px-1">
                {currentTipIndex + 1}/{tips.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentTipIndex((prev) => (prev + 1) % tips.length)}
                className="p-1.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer"
                title="Next Tip"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Tip Content with Motion Fade Transition */}
          <div className="min-h-[90px] sm:min-h-[80px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="space-y-1.5 w-full"
              >
                <h4 className="text-sm sm:text-base font-extrabold text-[#18181b] dark:text-white flex items-center gap-2">
                  {renderIcon(activeTip.iconType)}
                  <span>{activeTip.title}</span>
                </h4>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {activeTip.content}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tip Indicators Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {tips.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentTipIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentTipIndex ? "w-6 bg-emerald-600 dark:bg-emerald-400" : "w-1.5 bg-emerald-200 dark:bg-emerald-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 4. THREE ESSENTIAL AGRONOMY QUICK WISDOM CARDS */}
        <div className="space-y-3 pt-1">
          <span className="text-[11px] font-extrabold text-[#71717a] dark:text-zinc-400 uppercase tracking-wider block">
            Essential Seasonal Practices for Smallholders:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Soil Microbiology */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sprout className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                  {selectedLanguage === "hi" ? "जैविक पोषण" : selectedLanguage === "pa" ? "ਜੈਵਿਕ ਖਾਦ" : "Organic Soil Microbes"}
                </h5>
              </div>
              <p className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium leading-normal">
                {selectedLanguage === "hi"
                  ? "गोबर खाद व जीवामृत देने से केंचुए और मित्र फफूंद बढ़कर पौधों को डीएपी व नाइट्रोजन 2 गुना ज्यादा पहुंचाते हैं।"
                  : selectedLanguage === "pa"
                  ? "ਗੋਬਰ ਖਾਦ ਅਤੇ ਜੀਵਾਮ੍ਰਿਤ ਮਿੱਟੀ ਦੀ ਜੈਵਿਕ ਤਾਕਤ ਵਧਾਉਂਦੇ ਹਨ।"
                  : "Vermicompost & Jeevamrut fermentation increases earthworms & beneficial mycorrhiza fungi."}
              </p>
            </div>

            {/* Card 2: Bio Pest Traps */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Bug className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                  {selectedLanguage === "hi" ? "बिना दवा कीट नियंत्रण" : selectedLanguage === "pa" ? "ਕੀਟ ਰੋਕਥਾਮ" : "Non-Chemical Pest Traps"}
                </h5>
              </div>
              <p className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium leading-normal">
                {selectedLanguage === "hi"
                  ? "पीले और नीले स्टिकी कार्ड लगाने से रसचूसक कीड़े तुरंत आकर्षित होकर चिपकते हैं।"
                  : selectedLanguage === "pa"
                  ? "ਪੀਲੇ ਚਿਪਚਿਪੇ ਕਾਰਡ ਲਗਾਉਣ ਨਾਲ ਤੇਲੇ ਦੀ ਰੋਕਥਾਮ ਹੁੰਦੀ ਹੈ।"
                  : "Yellow & blue sticky cards capture winged aphids and thrips naturally before egg laying."}
              </p>
            </div>

            {/* Card 3: Precise Water Scheduling */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold text-[#18181b] dark:text-zinc-200">
                  {selectedLanguage === "hi" ? "सटीक सिंचाई प्रबंधन" : selectedLanguage === "pa" ? "ਸਹੀ ਸਿੰਚਾਈ" : "Precise Water Schedule"}
                </h5>
              </div>
              <p className="text-[11px] text-[#71717a] dark:text-zinc-400 font-medium leading-normal">
                {selectedLanguage === "hi"
                  ? "फसल की नाजुक अवस्थाओं (जैसे फूल व दाना भरते समय) पर हल्की सिंचाई जरूर करें।"
                  : selectedLanguage === "pa"
                  ? "ਫੁੱਲ ਅਤੇ ਦਾਣਾ ਬਣਨ ਵੇਲੇ ਸਹੀ ਪਾਣੀ ਜ਼ਰੂਰ ਦਿਓ।"
                  : "Irrigate lightly during critical stages (flowering & grain fill) to maximize harvest density."}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Kisan Call Centre Officer Emergency Helpline Card */}
        <div className="bg-[#f8f9fa] dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-[#18181b] dark:text-zinc-200">
              Need immediate expert agricultural officer assistance?
            </span>
          </div>
          <a
            href="tel:18001801551"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/80 px-3 py-1.5 rounded-full hover:bg-emerald-200 transition-colors w-fit shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Kisan Call Centre: 1800-180-1551 (Toll Free)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
