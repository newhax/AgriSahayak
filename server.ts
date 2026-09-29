import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";
import dotenv from "dotenv";
import { getLocalizedFallbackAdvisory as getPanIndiaFallbackAdvisory } from "./src/data/panIndiaAdvisory.js";
import {
  INITIAL_ANONYMIZED_REPORTS,
  SEEDED_STATES,
  DISTRICT_COORDS,
  getSoilProfileWithFallback,
  getNearestKvkContact,
  getDistrictCoordinates,
} from "./src/data.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "20mb" }));

// Lazy initializer for GoogleGenAI to prevent module-load crashes
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Converts raw 16-bit PCM (sampleRate=24000, 1 channel) into standard playable WAV with a 44-byte RIFF header
function pcmToWav(pcmBase64: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = Buffer.alloc(totalSize);

  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // copy PCM data
  pcmBuffer.copy(buffer, 44);

  return buffer.toString("base64");
}

// Helper to perform generateContent calls with retry and model fallback to handle 503 high-demand exceptions
async function generateContentWithFallback(params: any): Promise<any> {
  const originalModel = params.model || "gemini-3.1-flash-lite";
  
  // For TTS, try gemini-3.8-flash-lite-tts first, then gemini-3.1-flash-tts-preview
  const isTts = originalModel.includes("tts");
  const modelsToTry = isTts
    ? ["gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"]
    : Array.from(new Set([originalModel, "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]));

  let lastError: any = null;
  const maxAttempts = isTts ? 2 : modelsToTry.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const modelName = modelsToTry[attempt];
    try {
      console.log(`[Gemini API] Invoking ${modelName} (attempt ${attempt + 1}/${maxAttempts})`);
      const updatedParams = { ...params, model: modelName };
      const response = await getAiClient().models.generateContent(updatedParams);
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error.status || (error.error && error.error.code);
      const message = error.message || "";
      const isTransient = status === 503 || status === 429 || 
                          message.includes("503") || 
                          message.includes("temporary") || 
                          message.includes("high demand") || 
                          message.includes("rate limit") || 
                          message.includes("UNAVAILABLE");
      
      console.log(`[Gemini API] Notice: ${modelName} responded with status ${status || 'code ' + message.slice(0, 40)}. Rotating to fallback model...`);
      
      if (attempt < maxAttempts - 1) {
        const delay = isTransient ? (attempt + 1) * 300 : 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  throw lastError || new Error("All attempts to generate content failed.");
}

// In-memory data store for report logging
interface Report {
  id: string;
  state: string;
  district: string;
  crop: string;
  disease: string;
  date: string;
  latitude: number;
  longitude: number;
}

// In-memory array initialized with synthetic reports
let anonymizedReports: Report[] = [...INITIAL_ANONYMIZED_REPORTS];

// In-memory cache for regional early warning outbreak detection
let cachedEarlyWarning: { data: any; timestamp: number } | null = null;
const EARLY_WARNING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function computeAlgorithmicEarlyWarning(reports: Report[]) {
  const recent = reports.slice(0, 45);
  const diseaseMap: Record<string, Set<string>> = {};
  for (const r of recent) {
    if (!diseaseMap[r.disease]) {
      diseaseMap[r.disease] = new Set();
    }
    diseaseMap[r.disease].add(r.district);
  }

  let topDisease = "";
  let maxDistricts = 0;
  let topDistricts: string[] = [];

  for (const [disease, distSet] of Object.entries(diseaseMap)) {
    if (distSet.size > maxDistricts) {
      maxDistricts = distSet.size;
      topDisease = disease;
      topDistricts = Array.from(distSet);
    }
  }

  if (topDisease && maxDistricts >= 2) {
    return {
      alert: true,
      affected_districts: topDistricts.slice(0, 4),
      disease: topDisease,
      message: `Multiple cluster incidents of ${topDisease} identified across ${topDistricts.slice(0, 4).join(", ")}. Immediate preventative scouting and bio-control treatments recommended.`
    };
  }

  return {
    alert: false,
    affected_districts: [],
    disease: "",
    message: "All monitored districts are currently stable with no warning alerts."
  };
}

// Endpoint: Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint: Fetch Seeded State/District Metadata
app.get("/api/states", (req, res) => {
  res.json(SEEDED_STATES);
});

// Endpoint: Fetch dynamic ICAR soil profile with fallback hierarchy
app.get("/api/soil-profile", (req, res) => {
  const state = String(req.query.state || "Punjab");
  const district = String(req.query.district || "Ludhiana");
  const profile = getSoilProfileWithFallback(state, district);
  res.json(profile);
});

// Endpoint: Fetch Anonymized Reports
app.get("/api/reports", (req, res) => {
  res.json(anonymizedReports);
});

// Endpoint: Log a Diagnosis
app.post("/api/reports", (req, res) => {
  const { state, district, crop, disease, latitude, longitude } = req.body;
  if (!state || !district || !crop || !disease) {
    return res.status(400).json({ error: "Missing required report fields" });
  }

  const newReport: Report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    state,
    district,
    crop,
    disease,
    date: new Date().toISOString(),
    latitude: latitude || 20,
    longitude: longitude || 78,
  };

  anonymizedReports.unshift(newReport);
  // Invalidate early warning cache when a new report is added
  cachedEarlyWarning = null;
  res.status(201).json(newReport);
});

// Helper: Open-Meteo Weather Fetching with In-Memory Caching (15 min TTL)
const weatherCache = new Map<string, { summary: string; timestamp: number }>();
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchDistrictWeather(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return cached.summary;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with status ${response.status}`);
    }
    const data = await response.json();
    if (data.daily) {
      const days = data.daily.time || [];
      const maxTemps = data.daily.temperature_2m_max || [];
      const minTemps = data.daily.temperature_2m_min || [];
      const precipSums = data.daily.precipitation_sum || [];
      
      let summary = "7-day Outlook: ";
      for (let i = 0; i < Math.min(3, days.length); i++) {
        summary += `${days[i]}: Max ${maxTemps[i]}°C, Min ${minTemps[i]}°C, Rain: ${precipSums[i]}mm; `;
      }
      weatherCache.set(cacheKey, { summary, timestamp: Date.now() });
      return summary;
    }
    return "Weather forecast unavailable, relying on seasonal averages.";
  } catch (error) {
    console.error("Error fetching live weather:", error);
    return "Weather forecast currently unavailable, relying on seasonal averages.";
  }
}

// Endpoint: Fetch real-time weather & severe weather alerts for a district
app.get("/api/weather-alerts", async (req, res) => {
  try {
    const district = String(req.query.district || "Ludhiana");
    const state = String(req.query.state || "Punjab");
    const coords = getDistrictCoordinates(district, state);
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max&timezone=auto&forecast_days=7`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: "Open-Meteo upstream error" });
    }
    const data = await response.json();
    res.json({
      district,
      state,
      coordinates: coords,
      data
    });
  } catch (error: any) {
    console.error("Weather alerts endpoint error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch weather data" });
  }
});

const LANG_MAP: Record<string, string> = {
  // Tier 1: Core Major Languages
  hi: "Hindi (हिन्दी)",
  bn: "Bengali (বাংলা)",
  mr: "Marathi (मराठी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  gu: "Gujarati (ગુજરાતી)",
  ur: "Urdu (اردو)",
  kn: "Kannada (ಕನ್ನಡ)",
  or: "Odia (ଓଡ଼ିଆ)",
  ml: "Malayalam (മലയാളം)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  as: "Assamese (অসমীয়া)",
  en: "English",
  // Tier 2: Additional Scheduled & Regional Languages
  mai: "Maithili (मैथिली)",
  sat: "Santali (ᱥᱟᱱᱛᱟᱲᱤ)",
  ks: "Kashmiri (کٲشُر)",
  ne: "Nepali (नेपाली)",
  kok: "Konkani (कोंकणी)",
  sd: "Sindhi (سنڌي / सिन्धी)",
  doi: "Dogri (डोगरी)",
  mni: "Manipuri / Meitei (মৈতৈলোন্)",
  brx: "Bodo (बर')",
  sa: "Sanskrit (संस्कृतम्)",
};

function getLocalizedFallbackAdvisory(
  language: string,
  state: string,
  district: string,
  soilType: string,
  ph: number,
  organicCarbon: number,
  moistureValue: number,
  season: string,
  agroClimaticZone = "General"
) {
  return getPanIndiaFallbackAdvisory(
    language,
    state,
    district,
    soilType,
    ph,
    organicCarbon,
    moistureValue,
    season,
    agroClimaticZone
  );
}

function getIntelligentChatFallback(
  message: string,
  language: string,
  district: string,
  state: string,
  soilType: string,
  ph: number,
  moistureValue: number
) {
  const qLower = (message || "").toLowerCase();
  let fallbackReply = "";
  let fallbackSuggestions: string[] = [];
  let fallbackAction = "";

  const isAppHowTo =
    qLower.includes("how to use") ||
    qLower.includes("use this app") ||
    qLower.includes("teach") ||
    qLower.includes("help") ||
    qLower.includes("guide") ||
    qLower.includes("app kaise") ||
    qLower.includes("kaise chalaye") ||
    qLower.includes("sikhaye") ||
    qLower.includes("ऐप") ||
    qLower.includes("सिखाओ") ||
    qLower.includes("ਕਿਵੇਂ ਵਰਤਣਾ") ||
    qLower.includes("ఎలా ఉపయోగించాలి") ||
    qLower.includes("எப்படி பயன்படுத்துவது");

  const isAdvisoryQuery =
    qLower.includes("advisory") ||
    qLower.includes("crop") ||
    qLower.includes("फसल") ||
    qLower.includes("ਫ਼ਸਲ") ||
    qLower.includes("पिक") ||
    qLower.includes("பயிர்") ||
    qLower.includes("పంట");

  const isDiseaseQuery =
    qLower.includes("disease") ||
    qLower.includes("pathology") ||
    qLower.includes("doctor") ||
    qLower.includes("बीमारी") ||
    qLower.includes("कीड़ा") ||
    qLower.includes("ਕੀਟ") ||
    qLower.includes("रोग") ||
    qLower.includes("நோய்") ||
    qLower.includes("తెగులు");

  const isOutbreakQuery =
    qLower.includes("outbreak") ||
    qLower.includes("map") ||
    qLower.includes("radar") ||
    qLower.includes("नक्शा") ||
    qLower.includes("रडार") ||
    qLower.includes("ਚੇਤਾਵਨੀ") ||
    qLower.includes("மேப்");

  if (isAppHowTo) {
    if (language === "hi") {
      fallbackReply = `राम-राम भाई! मैं आपका **किसान मित्र (Farmer's Friend)** हूँ। यह ऐप (AgriSahayak) चलाना बहुत आसान है, आइए मैं आपको सिखाता हूँ:

1. 🌾 **फसल सलाह (Crop Advisory)**: आपके जिले (${district}) की मिट्टी और मौसम के आधार पर सबसे अच्छी फसलें और जैविक खाद की सलाह देता है। आप रेडियो की तरह आवाज़ में भी सुन सकते हैं। [ACTION:advisory]
2. 🩺 **रोग डॉक्टर (Plant Doctor)**: अगर फसल में कोई बीमारी या पीला पत्ता दिखे, तो उसकी फोटो खींचें। ऐप तुरंत जैविक उपाय और सही दवा की मात्रा बताएगा। [ACTION:diagnosis]
3. 🗺️ **रोग नक्शा (Outbreaks Map)**: पास के जिलों में कौन सी बीमारी फैल रही है, उसका नक्शा और चेतावनी देखें। [ACTION:dashboard]
4. 🎙️ **बोलकर बात करें**: आप टाइप करने की जगह माइक दबाकर अपनी भाषा में बात कर सकते हैं!

बताइए दोस्त, आप पहले कौन सा फीचर आज़माना चाहते हैं?`;
      fallbackSuggestions = ["फसल सलाह कैसे लें?", "बीमारी की फोटो कैसे भेजें?", "रोग नक्शा दिखाएं"];
    } else if (language === "pa") {
      fallbackReply = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰ ਜੀ! ਮੈਂ ਤੁਹਾਡਾ **ਕਿਸਾਨ ਮਿੱਤਰ (Farmer's Friend)** ਹਾਂ। ਇਹ ਐਪ ਚਲਾਉਣਾ ਬਹੁਤ ਆਸਾਨ ਹੈ:

1. 🌾 **ਫ਼ਸਲ ਸਲਾਹ**: ${district} ਦੀ ਮਿੱਟੀ ਅਤੇ ਮੌਸਮ ਅਨੁਸਾਰ ਵਧੀਆ ਫ਼ਸਲਾਂ ਅਤੇ ਦੇਸੀ ਖਾਦ ਦੇ ਨੁਸਖੇ। [ACTION:advisory]
2. 🩺 **ਫ਼ਸਲ ਡਾਕਟਰ**: ਖਰਾਬ ਪੱਤੇ ਦੀ ਫੋਟੋ ਖਿੱਚੋ, ਐਪ ਤੁਰੰਤ ਬਿਮਾਰੀ ਅਤੇ ਜੈਵਿਕ ਇਲਾਜ ਦੱਸੇਗਾ। [ACTION:diagnosis]
3. 🗺️ **ਬਿਮਾਰੀ ਨਕਸ਼ਾ**: ਨੇੜਲੇ ਜ਼ਿਲ੍ਹਿਆਂ ਵਿੱਚ ਫੈਲ ਰਹੀਆਂ ਬਿਮਾਰੀਆਂ ਦੀ ਜਾਣਕਾਰੀ। [ACTION:dashboard]
4. 🎙️ **ਬੋਲ ਕੇ ਪੁੱਛੋ**: ਮਾਈਕ ਦਬਾ ਕੇ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਗੱਲਬਾਤ ਕਰੋ!`;
      fallbackSuggestions = ["ਫ਼ਸਲ ਸਲਾਹ ਖੋਲ੍ਹੋ", "ਬਿਮਾਰੀ ਦੀ ਜਾਂਚ ਕਰੋ", "ਮੌਸਮ ਬਾਰੇ ਪੁੱਛੋ"];
    } else if (language === "mr") {
      fallbackReply = `नमस्कार मित्रा! मी आपला **शेतकरी मित्र (Farmer's Friend)** आहे. हे ॲप वापरणे खूप सोपे आहे:

1. 🌾 **पीक सल्ला**: ${district} मधील माती व हवामानानुसार फायदेशीर पिके आणि सेंद्रिय खतांचा सल्ला. [ACTION:advisory]
2. 🩺 **पीक डॉक्टर**: आजारी पानाचा फोटो काढून तात्काळ सेंद्रिय व सुरक्षित औषधोपचार मिळवा. [ACTION:diagnosis]
3. 🗺️ **रोग नकाशा**: आजूबाजूच्या जिल्ह्यांमधील कीड-रोगांची पूर्वसूचना पाहा. [ACTION:dashboard]
4. 🎙️ **आवाजाने विचारा**: माइक बटण दाबून आपल्या भाषेत बोला!`;
      fallbackSuggestions = ["पीक सल्ला कसा मिळवावा?", "रोगाचा फोटो कसा टाकावा?", "रोग नकाशा दाखवा"];
    } else if (language === "ta") {
      fallbackReply = `வணக்கம் நண்பரே! நான் உங்கள் **விவசாயி நண்பன் (Farmer's Friend)**. இந்த செயலியை மிக எளிதாக பயன்படுத்தலாம்:

1. 🌾 **பயிர் ஆலோசனை**: ${district} பகுதிக்கான சிறந்த பயிர்கள் மற்றும் இயற்கை உர ஆலோசனைகள். [ACTION:advisory]
2. 🩺 **தாவர மருத்துவர்**: பாதிக்கப்பட்ட இலையை படம் பிடித்து உடனுக்குடன் இயற்கை தீர்வு பெறலாம். [ACTION:diagnosis]
3. 🗺️ **நோய் வரைபடம்**: அண்டை மாவட்டங்களில் பரவும் பயிர் நோய்களை வரைபடத்தில் அறியலாம். [ACTION:dashboard]
4. 🎙️ **குரல் வழி பேசுங்கள்**: தட்டச்சு செய்யாமல் மைக் அழுத்தி நேரடியாக பேசலாம்!`;
      fallbackSuggestions = ["பயிர் ஆலோசனை பெறுக", "நோய் கண்டறிதல்", "நோய் வரைபடம்"];
    } else {
      fallbackReply = `Hello my friend! I am your **Farmer's Friend (Kisan Mitra)**. Here is how you can use this app:

1. 🌾 **Crop Advisory**: Tailored to your soil and weather in ${district}, ${state} with voice broadcast. [ACTION:advisory]
2. 🩺 **Plant Doctor (Diagnosis)**: Snap a photo of any sick leaf to get instant organic bio-cures and chemical dosages with KVK contact. [ACTION:diagnosis]
3. 🗺️ **Outbreak Map**: Real-time cross-district tracking of crop threats. [ACTION:dashboard]
4. 🎙️ **Voice Feature**: Tap the mic to talk with me naturally in your selected language!

Which feature would you like to explore first?`;
      fallbackSuggestions = ["How do I get crop advice?", "How to check plant disease?", "Show outbreak map"];
    }
  } else if (isAdvisoryQuery) {
    fallbackAction = "advisory";
    if (language === "hi") {
      fallbackReply = `दोस्त, **फसल सलाह** का उपयोग करना बहुत सरल है! 
1. ऊपर मेनू में **फसल परामर्श** पर क्लिक करें।
2. आपकी मिट्टी (${soilType}, pH ${ph}) और उपग्रह मौसम पहले से दर्ज हैं।
3. 'परामर्श प्राप्त करें' बटन दबाएं — आपको 2-3 सबसे अच्छी फसलें, अपेक्षित पैदावार और जैविक खाद के नुस्खे मिलेंगे।
4. आप रेडियो स्पीकर बटन दबाकर पूरा विवरण अपनी भाषा में सुन भी सकते हैं! [ACTION:advisory]`;
      fallbackSuggestions = ["फसल परामर्श खोलें", "जैविक खाद कैसे बनाएं?", "मौसम की जानकारी"];
    } else {
      fallbackReply = `My friend, using **Crop Advisory** is very easy!
1. Click on **Crop Advisory** in the top navigation.
2. Your district (${district}), soil profile (${soilType}, pH ${ph}), and weather are automatically loaded.
3. Click 'Get Advisory' to see high-yielding crops and organic soil practices.
4. Tap the radio broadcast button to listen to it read aloud in your language! [ACTION:advisory]`;
      fallbackSuggestions = ["Open Crop Advisory", "How to prepare organic compost?", "Weather outlook"];
    }
  } else if (isDiseaseQuery) {
    fallbackAction = "diagnosis";
    if (language === "hi") {
      fallbackReply = `दोस्त, **रोग डॉक्टर (Plant Pathology)** आपकी फसल का रक्षक है!
1. मेनू में **रोग निदान** पर जाएं।
2. अपने फोन के कैमरे से खराब या कीड़ा लगे पत्ते की साफ फोटो खींचें या गैलरी से चुनें।
3. ऐप तुरंत बीमारी की पहचान करेगा और नीम का तेल, ट्राइकोडर्मा जैसे जैविक उपाय और सुरक्षित दवा की सही मात्रा बताएगा।
4. साथ ही आपके नजदीकी कृषि विज्ञान केंद्र (KVK) का फोन नंबर भी देगा! [ACTION:diagnosis]`;
      fallbackSuggestions = ["रोग निदान खोलें", "नीम का काढ़ा कैसे बनाएं?", "KVK से संपर्क कैसे करें?"];
    } else {
      fallbackReply = `My friend, **Plant Doctor (Disease Pathology)** protects your harvest!
1. Click on **Disease Pathology** in the navigation.
2. Snap a clear photo of the infected leaf with your camera.
3. You will instantly get the exact disease diagnosis, low-cost organic remedies (Neem oil, Jeevamrutha), safe generic medicine dosage, and your local KVK helpline number! [ACTION:diagnosis]`;
      fallbackSuggestions = ["Open Plant Doctor", "How to prepare neem spray?", "Contact local KVK"];
    }
  } else if (
    qLower.includes("hello") ||
    qLower.includes("hi") ||
    qLower.includes("namaste") ||
    qLower.includes("hey") ||
    qLower.includes("नमस्ते") ||
    qLower.includes("सलाम") ||
    qLower.includes("வணக்கம்") ||
    qLower.includes("నమస్కారం") ||
    qLower.includes("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ")
  ) {
    if (language === "hi") {
      fallbackReply = `राम-राम भाई! मैं आपका सच्चा दोस्त **किसान मित्र (Farmer's Friend)** हूँ। मैं ${district}, ${state} में आपकी फसलों, मौसम, मिट्टी और इस ऐप को चलाना सिखाने के लिए हमेशा हाज़िर हूँ। आप कैसे हैं दोस्त? आज मैं आपकी क्या मदद करूँ?`;
      fallbackSuggestions = ["यह ऐप कैसे इस्तेमाल करें?", "फसल सलाह कैसे लें?", "मेरे खेत के लिए मौसम क्या है?"];
    } else if (language === "pa") {
      fallbackReply = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰ ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਪਿਆਰਾ ਦੋਸਤ **ਕਿਸਾਨ ਮਿੱਤਰ (Farmer's Friend)** ਹਾਂ। ਮੈਂ ${district}, ${state} ਵਿੱਚ ਤੁਹਾਡੀ ਖੇਤੀ ਅਤੇ ਇਹ ਐਪ ਸਿਖਾਉਣ ਲਈ ਹਾਜ਼ਰ ਹਾਂ। ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ ਜੀ?`;
      fallbackSuggestions = ["ਐਪ ਵਰਤਣਾ ਸਿਖਾਓ", "ਕਣਕ ਬਾਰੇ ਸਲਾਹ", "ਮੌਸਮ ਦਾ ਹਾਲ"];
    } else {
      fallbackReply = `Hello my dear friend! I am your **Farmer's Friend (Kisan Mitra)** for ${district}, ${state}. I am here to teach you how to use every part of this app and help you with your crops, soil, and weather. How are you and your family doing today?`;
      fallbackSuggestions = ["Teach me how to use this app", "How do I get crop advice?", "Check local weather"];
    }
  } else if (
    qLower.includes("how are you") ||
    qLower.includes("how r u") ||
    qLower.includes("कैसे हो") ||
    qLower.includes("कसा आहेस") ||
    qLower.includes("எப்படி இருக்கிறீர்கள்") ||
    qLower.includes("ఎలా ఉన్నారు") ||
    qLower.includes("ਕਿਵੇਂ ਹੋ")
  ) {
    if (language === "hi") {
      fallbackReply = `मैं बिल्कुल ठीक और प्रसन्न हूँ भाई, पूछने के लिए बहुत धन्यवाद! मैं ${district} के किसान भाइयों की सेवा के लिए 24 घंटे तैयार हूँ। आप बताइए, आपकी खेती-बाड़ी और परिवार कैसा है? क्या आप इस ऐप के किसी फीचर के बारे में सीखना चाहते हैं?`;
      fallbackSuggestions = ["ऐप के फीचर्स सिखाएं", "जैविक खाद कैसे बनाएं?", "फसल बीमा योजना"];
    } else {
      fallbackReply = `I am doing wonderful, thank you for asking, my friend! I am keeping an eye on the weather and crops in ${district}, ${state}. How are you and your farm doing? Would you like me to teach you how any part of this app works?`;
      fallbackSuggestions = ["Teach me app features", "Organic fertilizer recipe", "Crop insurance details"];
    }
  } else {
    if (language === "hi") {
      fallbackReply = `दोस्त, ${district} (${state}) के लिए: आपकी मिट्टी (${soilType}, pH ${ph}, नमी ${moistureValue}%) और मौसम के अनुसार, आपके सवाल "${message}" के संबंध में संतुलित जैविक पोषण, सही समय पर सिंचाई और आईसीएआर की वैज्ञानिक पद्धतियों का पालन करना सबसे अच्छा रहेगा। किसी भी समस्या के लिए अपने पास के कृषि विज्ञान केंद्र (KVK) से भी संपर्क कर सकते हैं।`;
      fallbackSuggestions = ["यह ऐप चलाना सिखाएं", "सिंचाई का सही समय", "कीट प्रकोप से बचाव"];
    } else {
      fallbackReply = `My friend, for ${district}, ${state}: Regarding "${message}", taking into account your ${soilType} soil (pH ${ph}, ${moistureValue}% moisture) and local climate, adhering to organic compost, moisture-conserving irrigation, and ICAR extension guidance is strongly advised.`;
      fallbackSuggestions = ["Teach me how to use the app", "Best crop for this season", "Pest control tips"];
    }
  }

  return {
    reply: fallbackReply,
    suggestions: fallbackSuggestions,
    agentBadge: "Kisan Mitra — Farmer's Friend",
    actionTarget: fallbackAction,
  };
}

// Endpoint: Interactive Conversational AI Chatbot (Stream-based SSE)
app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendSSE = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const message = req.body.message || req.body.query || req.body.prompt;
    const history = req.body.history || [];
    const language = req.body.language || "hi";
    const state = req.body.state || "Punjab";
    const district = req.body.district || "Ludhiana";

    if (!message || typeof message !== "string" || !message.trim()) {
      sendSSE({ type: "error", error: "Missing message text parameter" });
      return res.end();
    }

    const targetLang = LANG_MAP[language] || "English";

    // Soil & telemetry context using fallback hierarchy
    const profile = getSoilProfileWithFallback(state, district);
    const soilType = profile.soilType;
    const ph = profile.ph;
    const organicCarbon = profile.organicCarbon;
    const moistureValue = profile.moistureValue;
    const coords = { lat: profile.lat, lng: profile.lng };

    let weatherSummary = "Seasonal average conditions.";
    try {
      weatherSummary = await fetchDistrictWeather(coords.lat, coords.lng);
    } catch (e) {
      // ignore
    }

    // Nearby disease reports
    const nearbyReports = anonymizedReports
      .filter(
        (r) =>
          r.district.toLowerCase() === district.toLowerCase() ||
          r.state.toLowerCase() === state.toLowerCase()
      )
      .slice(0, 3);
    const outbreakContext =
      nearbyReports.length > 0
        ? `Recent local reports in ${district}: ${nearbyReports
            .map((r) => `${r.crop} (${r.disease})`)
            .join(", ")}`
        : "No active severe outbreak alerts reported in this district.";

    const systemPrompt = `You are "Kisan Mitra" (Farmer's Friend / किसान मित्र), a warm, loving, rural friend and personal teacher to smallholder Indian farmers in their village.
You are chatting with a farmer in ${district}, ${state}.
You speak like a close, caring friend or brother over a cup of chai in the village chaupal — respectful, enthusiastic, patient, empathetic, and encouraging ("राम-राम भाई!", "नमस्ते दोस्त!", "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰ ਜੀ!", "வணக்கம் நண்பரே!", "నమస్కారం మిత్రమా!", "Hello my dear farmer friend!").

YOUR CORE ROLES:
1. TEACH THE FARMER HOW TO USE THIS APP (AgriSahayak):
   Smallholder farmers may not be tech-savvy. You are their patient, friendly guide who teaches them how every section works step-by-step in simple words:
   - 🌾 **फसल सलाह (Crop Advisory)**:
     Explain that this tool analyzes their local ICAR soil chemistry (${soilType}, pH ${ph}, organic carbon ${organicCarbon}%) and 7-day live weather in ${district} to recommend the top 2-3 most profitable, resilient crops and organic practices. Teach them that they can also click the radio broadcast speaker button to listen to the whole advisory read aloud in their language!
     Mention that they can click [ACTION:advisory] to open Crop Advisory right away.
   - 🩺 **रोग डॉक्टर / पौधा निदान (Plant Doctor / Disease Diagnosis)**:
     Explain that whenever they see a diseased, spotted, or pest-eaten leaf on their farm, they can simply snap a clear photo or upload an image. The AI plant pathologist immediately identifies the disease, gives an organic bio-control remedy (like Neem oil spray or Jeevamrutha) and safe generic medicine with exact dosages, and provides the direct helpline phone number of their nearest Krishi Vigyan Kendra (KVK).
     Mention that they can click [ACTION:diagnosis] to open Plant Doctor.
   - 🗺️ **प्रकोप नक्शा / सामुदायिक चेतावनी (Outbreak Radar & Early Warning)**:
     Explain that this interactive map tracks real-time crop disease reports and alerts across neighboring districts in ${state}. If a blight or pest starts spreading, the app warns farmers early so they can protect their crops before it hits their field.
     Mention that they can click [ACTION:dashboard] to open the Outbreak Map.
   - 🎙️ **बोलकर बात करें (Voice Feature)**:
     Explain that farmers don't need to type — they can simply tap the microphone icon 🎙️ in any tool or here in chat to ask questions by speaking naturally, and the app will listen and answer back with voice!
   - 🌐 **भाषा और ज़िला बदलें (Change Language & District)**:
     Explain that they can switch between Indian languages at any time from the top globe icon, and change their farm district using the "Change Farm" button.

2. CHAT AS A TRUE FRIEND & AGRONOMY COMPANION:
   - Greet them warmly and lovingly as a friend/brother in their native tongue.
   - Ask about their well-being, their family, their harvest, and how their crops are doing in ${district}.
   - Answer any practical farming questions: organic fertilizers, vermicompost, sowing windows, water-saving irrigation, PM-KISAN, PMFBY crop insurance, mandi prices, soil health. Always favor low-cost, organic solutions first to save farmers money.
   - Context for ${district}, ${state}:
     Soil: ${soilType}, pH: ${ph}, Organic Carbon: ${organicCarbon}%, Moisture index: ${moistureValue}%, Weather: ${weatherSummary}.
     Outbreak status: ${outbreakContext}.

CRITICAL LANGUAGE MANDATE:
- The farmer's selected language is: ${targetLang} (Language code: "${language}").
- EVERY SINGLE WORD in your response MUST be in ${targetLang} using native script (e.g. Hindi in Devanagari, Punjabi in Gurmukhi, Tamil in Tamil script, etc.).
- Keep the language natural, affectionate, formatting with clear bullet points where helpful.
- If relevant to navigate, include action tags like [ACTION:advisory], [ACTION:diagnosis], [ACTION:dashboard].
- Do not wrap in JSON; stream natural conversational text directly.`;

    sendSSE({
      type: "start",
      agentBadge: "Kisan Mitra — Farmer's Friend",
    });

    // Build contents with past conversation turns
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        if (h.sender === "user") {
          contents.push({ role: "user", parts: [{ text: h.text }] });
        } else if (h.sender === "copilot" || h.sender === "friend") {
          contents.push({ role: "model", parts: [{ text: h.text }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    let fullText = "";

    try {
      const streamResponse = await getAiClient().models.generateContentStream({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });

      for await (const chunk of streamResponse) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          sendSSE({
            type: "chunk",
            text: chunkText,
          });
        }
      }

      // Determine action target
      let actionTarget = "";
      if (fullText.includes("[ACTION:advisory]")) actionTarget = "advisory";
      else if (fullText.includes("[ACTION:diagnosis]")) actionTarget = "diagnosis";
      else if (fullText.includes("[ACTION:dashboard]")) actionTarget = "dashboard";

      // Contextual suggestions in target language
      let suggestions: string[] = [];
      const isHowTo = /use|how|app|kaise|chalaye|sikhaye|सिखा/i.test(message);
      if (language === "hi") {
        suggestions = isHowTo
          ? ["फसल सलाह कैसे लें?", "रोग डॉक्टर कैसे चलाएं?", "रोग नक्शा दिखाएं"]
          : ["यह ऐप कैसे इस्तेमाल करें?", "जैविक खाद कैसे बनाएं?", "मौसम की जानकारी"];
      } else if (language === "pa") {
        suggestions = isHowTo
          ? ["ਫ਼ਸਲ ਸਲਾਹ ਖੋਲ੍ਹੋ", "ਬਿਮਾਰੀ ਦੀ ਜਾਂਚ ਕਰੋ", "ਬਿਮਾਰੀ ਨਕਸ਼ਾ ਦੇਖੋ"]
          : ["ਐਪ ਵਰਤਣਾ ਸਿਖਾਓ", "ਕਣਕ ਬਾਰੇ ਸਲਾਹ", "ਮੌਸਮ ਦਾ ਹਾਲ"];
      } else if (language === "mr") {
        suggestions = isHowTo
          ? ["पीक सल्ला कसा मिळवावा?", "रोगाचा फोटो कसा टाकावा?", "रोग नकाशा दाखवा"]
          : ["हे ॲप कसे वापरावे?", "सेंद्रिय खत कसे बनवावे?", "हवामानाचा अंदाज"];
      } else if (language === "ta") {
        suggestions = isHowTo
          ? ["பயிர் ஆலோசனை பெறுக", "நோய் கண்டறிதல்", "நோய் வரைபடம்"]
          : ["செயலியை பயன்படுத்துவது எப்படி?", "இயற்கை உரம் தயாரிப்பு", "வானிலை நிலவரம்"];
      } else {
        suggestions = isHowTo
          ? ["How do I get crop advice?", "How to scan plant disease?", "Show outbreak map"]
          : ["Teach me how to use this app", "Organic fertilizer recipe", "Check local weather"];
      }

      sendSSE({
        type: "done",
        fullText,
        suggestions,
        actionTarget,
        agentBadge: "Kisan Mitra — Farmer's Friend",
      });
      return res.end();
    } catch (modelError: any) {
      console.warn("Gemini stream error, streaming intelligent fallback:", modelError?.message);

      const fallback = getIntelligentChatFallback(
        message,
        language,
        district,
        state,
        soilType,
        ph,
        moistureValue
      );

      // Stream fallback in small natural chunks to simulate lively response
      const words = fallback.reply.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        const slice = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
        sendSSE({
          type: "chunk",
          text: slice,
        });
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      sendSSE({
        type: "done",
        fullText: fallback.reply,
        suggestions: fallback.suggestions,
        actionTarget: fallback.actionTarget,
        agentBadge: fallback.agentBadge,
      });
      return res.end();
    }
  } catch (error: any) {
    console.error("Fatal chat stream error:", error);
    sendSSE({
      type: "error",
      error: error.message || "Failed to process chat stream",
    });
    res.end();
  }
});

// Endpoint: Interactive Conversational AI Chatbot (Casual & Local Problems - Non-streaming fallback)
app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message || req.body.query || req.body.prompt;
    const history = req.body.history || [];
    const language = req.body.language || "hi";
    const state = req.body.state || "Punjab";
    const district = req.body.district || "Ludhiana";

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing message text parameter" });
    }

    const targetLang = LANG_MAP[language] || "English";

    // Soil & telemetry context using fallback hierarchy
    const profile = getSoilProfileWithFallback(state, district);
    const soilType = profile.soilType;
    const ph = profile.ph;
    const organicCarbon = profile.organicCarbon;
    const ndviValue = profile.ndviValue;
    const moistureValue = profile.moistureValue;
    const agroClimaticZone = profile.agroClimaticZone;
    const coords = { lat: profile.lat, lng: profile.lng };

    let weatherSummary = "Seasonal average conditions.";
    try {
      weatherSummary = await fetchDistrictWeather(coords.lat, coords.lng);
    } catch (e) {
      // ignore
    }

    // Nearby disease reports
    const nearbyReports = anonymizedReports.filter(r => r.district.toLowerCase() === district.toLowerCase() || r.state.toLowerCase() === state.toLowerCase()).slice(0, 3);
    const outbreakContext = nearbyReports.length > 0 
      ? `Recent local reports in ${district}: ${nearbyReports.map(r => `${r.crop} (${r.disease})`).join(", ")}`
      : "No active severe outbreak alerts reported in this district.";

    const systemPrompt = `You are "Kisan Mitra" (Farmer's Friend / किसान मित्र), a warm, loving, rural friend and personal teacher to smallholder Indian farmers in their village.
You are chatting with a farmer in ${district}, ${state}.
You speak like a close, caring friend or brother over a cup of chai in the village chaupal — respectful, enthusiastic, patient, empathetic, and encouraging ("राम-राम भाई!", "नमस्ते दोस्त!", "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰ ਜੀ!", "வணக்கம் நண்பரே!", "నమస్కారం మిత్రమా!", "Hello my dear farmer friend!").

YOUR CORE ROLES:
1. TEACH THE FARMER HOW TO USE THIS APP (AgriSahayak):
   Smallholder farmers may not be tech-savvy. You are their patient, friendly guide who teaches them how every section works step-by-step in simple words:
   - 🌾 **फसल सलाह (Crop Advisory)**:
     Explain that this tool analyzes their local ICAR soil chemistry (${soilType}, pH ${ph}, organic carbon ${organicCarbon}%) and 7-day live weather in ${district} to recommend the top 2-3 most profitable, resilient crops and organic practices. Teach them that they can also click the radio broadcast speaker button to listen to the whole advisory read aloud in their language!
     Mention that they can click [ACTION:advisory] to open Crop Advisory right away.
   - 🩺 **रोग डॉक्टर / पौधा निदान (Plant Doctor / Disease Diagnosis)**:
     Explain that whenever they see a diseased, spotted, or pest-eaten leaf on their farm, they can simply snap a clear photo or upload an image. The AI plant pathologist immediately identifies the disease, gives an organic bio-control remedy (like Neem oil spray or Jeevamrutha) and safe generic medicine with exact dosages, and provides the direct helpline phone number of their nearest Krishi Vigyan Kendra (KVK).
     Mention that they can click [ACTION:diagnosis] to open Plant Doctor.
   - 🗺️ **प्रकोप नक्शा / सामुदायिक चेतावनी (Outbreak Radar & Early Warning)**:
     Explain that this interactive map tracks real-time crop disease reports and alerts across neighboring districts in ${state}. If a blight or pest starts spreading, the app warns farmers early so they can protect their crops before it hits their field.
     Mention that they can click [ACTION:dashboard] to open the Outbreak Map.
   - 🎙️ **बोलकर बात करें (Voice Feature)**:
     Explain that farmers don't need to type — they can simply tap the microphone icon 🎙️ in any tool or here in chat to ask questions by speaking naturally, and the app will listen and answer back with voice!
   - 🌐 **भाषा और ज़िला बदलें (Change Language & District)**:
     Explain that they can switch between Indian languages at any time from the top globe icon, and change their farm district using the "Change Farm" button.

2. CHAT AS A TRUE FRIEND & AGRONOMY COMPANION:
   - Greet them warmly and lovingly as a friend/brother in their native tongue.
   - Ask about their well-being, their family, their harvest, and how their crops are doing in ${district}.
   - Answer any practical farming questions: organic fertilizers, vermicompost, sowing windows, water-saving irrigation, PM-KISAN, PMFBY crop insurance, mandi prices, soil health. Always favor low-cost, organic solutions first to save farmers money.
   - Context for ${district}, ${state}:
     Soil: ${soilType}, pH: ${ph}, Organic Carbon: ${organicCarbon}%, Moisture index: ${moistureValue}%, Weather: ${weatherSummary}.
     Outbreak status: ${outbreakContext}.

CRITICAL LANGUAGE MANDATE:
- The farmer's selected language is: ${targetLang} (Language code: "${language}").
- EVERY SINGLE WORD in your response and suggestions MUST be in ${targetLang} using native script (e.g. Hindi in Devanagari, Punjabi in Gurmukhi, Tamil in Tamil script, etc.).
- Keep the language natural, affectionate, and easy for rural farmers to understand.

Output JSON format:
{
  "reply": "The response message in the target language (supports markdown formatting and action tags like [ACTION:advisory], [ACTION:diagnosis], [ACTION:dashboard])",
  "suggestions": ["2 or 3 short friendly follow-up questions or prompts in target language"],
  "agentBadge": "Kisan Mitra — Farmer's Friend",
  "actionTarget": "optional string: 'advisory' | 'diagnosis' | 'dashboard' | 'voice' or ''"
}`;

    // Build contents with past conversation turns
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      // Include last 6 turns
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        if (h.sender === "user") {
          contents.push({ role: "user", parts: [{ text: h.text }] });
        } else if (h.sender === "copilot" || h.sender === "friend") {
          contents.push({ role: "model", parts: [{ text: h.text }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    try {
      const response = await generateContentWithFallback({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: "Detailed warm conversational response in target language" },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 short relevant follow-up prompts in target language"
              },
              agentBadge: { type: Type.STRING, description: "Contextual agent badge e.g. Kisan Mitra" },
              actionTarget: { type: Type.STRING, description: "Optional action target: advisory, diagnosis, dashboard, or empty" }
            },
            required: ["reply", "suggestions"]
          }
        }
      });

      const outputText = response.text || "{}";
      const chatData = JSON.parse(outputText);
      if (!chatData.agentBadge) {
        chatData.agentBadge = "Kisan Mitra — Farmer's Friend";
      }
      return res.json(chatData);
    } catch (modelError: any) {
      console.warn("Gemini chat error, providing intelligent conversational fallback:", modelError?.message);
      const fallback = getIntelligentChatFallback(
        message,
        language,
        district,
        state,
        soilType,
        ph,
        moistureValue
      );
      return res.json(fallback);
    }
  } catch (error: any) {
    console.error("Fatal chat endpoint error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat query" });
  }
});

// Endpoint: Voice/Text Crop Advisory (Flow 1)
app.post("/api/advisory", async (req, res) => {
  try {
    const state = req.body.state || "Punjab";
    const district = req.body.district || "Ludhiana";
    const language = req.body.language || "hi";
    const query = req.body.query || req.body.prompt || req.body.question;
    
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Missing query or prompt text parameter" });
    }

    const targetLang = LANG_MAP[language] || "English";

    // Find the soil profile from verified data using fallback hierarchy
    const profile = getSoilProfileWithFallback(state, district);
    const soilType = profile.soilType;
    const ph = profile.ph;
    const organicCarbon = profile.organicCarbon;
    const ndviValue = profile.ndviValue;
    const moistureValue = profile.moistureValue;
    const agroClimaticZone = profile.agroClimaticZone;
    const coords = { lat: profile.lat, lng: profile.lng };

    // Fetch live weather summary from Open-Meteo
    const weatherSummary = await fetchDistrictWeather(coords.lat, coords.lng);

    // Current season estimate
    const currentMonth = new Date().getMonth(); // 0-11
    let season = "Kharif (Monsoon)";
    if (currentMonth >= 9 && currentMonth <= 1) {
      season = "Rabi (Winter)";
    } else if (currentMonth >= 2 && currentMonth <= 5) {
      season = "Zaid (Summer)";
    }

    const ai = getAiClient();

    // Request response in JSON matching the Crops Schema
    const systemPrompt = `You are a distinguished agricultural extension scientist and agronomist advising smallholder Indian farmers in their local tongue.
CRITICAL LANGUAGE MANDATE:
The farmer's selected language is: ${targetLang} (Language Code: "${language}").
EVERY SINGLE STRING AND TEXT in your JSON output MUST be written 100% in ${targetLang} using native script:
- If language is "hi" (Hindi): Write strictly in Hindi Devanagari script (e.g., cropName: "गेहूँ (HD-3086)", rationale: "...", expectedYield: "20-22 क्विंटल प्रति एकड़", sowingWindow: "15 अक्टूबर से 15 नवंबर", etc.).
- If language is "mr" (Marathi): Write strictly in Marathi Devanagari script.
- If language is "ta" (Tamil): Write strictly in Tamil script (e.g., cropName: "நெல் / கோதுமை", etc.).
- If language is "te" (Telugu): Write strictly in Telugu script.
- If language is "bn" (Bengali): Write strictly in Bengali script.
- If language is "gu" (Gujarati): Write strictly in Gujarati script.
- If language is "kn" (Kannada): Write strictly in Kannada script.
- If language is "pa" (Punjabi): Write strictly in Punjabi Gurmukhi script (e.g., cropName: "ਕਣਕ", etc.).
- If language is "en" (English): Write in English.

Fields required in ${targetLang}:
1. crops: Array of 2-3 recommended crops with "cropName", "rationale" (referencing district ${district}, soil pH ${ph}, organic carbon ${organicCarbon}%, moisture ${moistureValue}%), "expectedYield", and "sowingWindow".
2. regenerativePractices: Array of organic/regenerative practices in ${targetLang}.
3. riskMitigation: Seasonal weather & pest risk mitigation in ${targetLang}.
4. audioTranscript: A complete, comprehensive spoken radio broadcast transcript in fluent, natural, spoken ${targetLang}. It will be read aloud in the "Listen to Advisory Transcript" audio player. It must begin with a respectful greeting in ${targetLang} (e.g., "नमस्कार किसान भाई..." in Hindi, "வணக்கம் விவசாய பெருமக்களே..." in Tamil, "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰੋ..." in Punjabi, etc.), summarize the top recommended crops with rationale, sowing window, regenerative soil tips, and seasonal risk warnings clearly and encouragingly.

Context:
- State: ${state}, District: ${district}
- Current season: ${season}
- Agro-climatic Zone: ${agroClimaticZone}
- Soil profile: ${soilType}, pH ${ph}, organic carbon ${organicCarbon}%
- Satellite vegetation index (NDVI): ${ndviValue}
- Soil moisture index: ${moistureValue}%
- 7-day weather forecast: ${weatherSummary}
- Farmer's question: "${query}"`;

    let advisoryData: any = null;

    try {
      const response = await generateContentWithFallback({
        model: "gemini-3.8-flash",
        contents: "Generate agricultural advisory based on the expert instructions.",
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              crops: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cropName: { type: Type.STRING, description: "Name of the crop in target language" },
                    rationale: { type: Type.STRING, description: "Reasoning tied to soil, weather, or satellite data in target language" },
                    expectedYield: { type: Type.STRING, description: "Expected yield estimate in target language" },
                    sowingWindow: { type: Type.STRING, description: "Recommended window for sowing in target language" }
                  },
                  required: ["cropName", "rationale", "expectedYield", "sowingWindow"]
                }
              },
              regenerativePractices: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Recommended organic/regenerative practices in target language"
              },
              riskMitigation: {
                type: Type.STRING,
                description: "Seasonal risk warning and mitigation advice in target language"
              },
              audioTranscript: {
                type: Type.STRING,
                description: "Complete spoken audio broadcast transcript in target language"
              }
            },
            required: ["crops", "regenerativePractices", "riskMitigation", "audioTranscript"]
          }
        }
      });

      const outputText = response.text || "{}";
      advisoryData = JSON.parse(outputText);
    } catch (modelError: any) {
      console.warn("Gemini advisory generation error, falling back to localized agronomic engine:", modelError?.message);
      advisoryData = getLocalizedFallbackAdvisory(
        language,
        state,
        district,
        soilType,
        ph,
        organicCarbon,
        moistureValue,
        season,
        agroClimaticZone
      );
    }

    // Ensure audioTranscript, language, and data confidence metadata are present
    if (!advisoryData.audioTranscript) {
      advisoryData.audioTranscript = advisoryData.crops?.map((c: any) => c.cropName).join(", ") + ". " + (advisoryData.riskMitigation || "");
    }
    advisoryData.language = language;
    advisoryData.soilDataSource = profile.confidence;
    advisoryData.soilDataLabel = profile.confidenceLabel;
    advisoryData.soilDataDescription = profile.confidenceDescription;
    advisoryData.kvkHelpline = profile.kvkContact.phone;
    advisoryData.kvkTitle = profile.kvkContact.title;

    res.json(advisoryData);
  } catch (error: any) {
    console.error("Advisory fatal error:", error);
    res.status(500).json({ error: error.message || "Failed to generate crop advisory" });
  }
});

// Endpoint: Crop Disease Diagnosis (Flow 2)
app.post("/api/diagnose", async (req, res) => {
  try {
    const rawImage = req.body.imageBase64 || req.body.image;
    const mimeType = req.body.mimeType || "image/jpeg";
    const language = req.body.language || "hi";
    const state = req.body.state || "Punjab";
    const district = req.body.district || "Ludhiana";

    if (!rawImage || typeof rawImage !== "string") {
      return res.status(400).json({ error: "Missing imageBase64 or image parameter" });
    }

    const ai = getAiClient();

    const cleanBase64 = rawImage.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const targetLang = LANG_MAP[language] || "English";

    const systemPrompt = `You are an expert plant pathologist assisting Indian smallholder farmers across any state and district in India. 
Your response MUST be written entirely in the requested farmer language: ${targetLang} (code: "${language}").
Respond entirely in ${targetLang}. Do not include English text unless referencing scientific botanical or chemical Latin names.

CRITICAL TREATMENT INTEGRITY RULES:
1. Low-Cost / Organic First: Prioritize bio-control and natural remedies accessible to smallholder farmers (e.g., Neem oil formulation at 5ml/L, Trichoderma viride seed/soil treatment, Pseudomonas fluorescens, Jeevamrutha, Beauveria bassiana).
2. Generic Chemical Fallback: ALWAYS recommend generic chemical active ingredient names (e.g., Mancozeb 75% WP, Copper Oxychloride 50% WP, Carbendazim, Chlorantraniliprole 18.5% SC) with clear standard dilution measurements (e.g., 2g per liter of water).
3. NEVER recommend commercial proprietary brand names that may not be sold or available in the farmer's specific state or district.
4. If the photo does not clearly show plant tissue, set disease to "Not a Plant" (translated to ${targetLang}) and advise retaking in natural light.`;

    const promptText = `Analyze this crop photo for a farmer in ${district}, ${state}. Provide diagnosis completely in ${targetLang}:
1. Likely disease or pest name in ${targetLang}
2. Honest confidence framing in ${targetLang} (e.g., "fairly confident" or "possible — confirm with your nearest Krishi Vigyan Kendra officer")
3. Immediate low-cost organic treatment in ${targetLang}
4. Generic chemical active ingredient treatment with dosage in ${targetLang}
5. Practical prevention advice for future seasons in ${targetLang}`;

    const response = await generateContentWithFallback({
      model: "gemini-3.8-flash",
      contents: {
        parts: [imagePart, { text: promptText }]
      },
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            disease: { type: Type.STRING, description: "Name of the crop disease" },
            confidence: { type: Type.STRING, description: "Confidence explanation in the selected language" },
            treatmentOrganic: { type: Type.STRING, description: "Low-cost organic remedy" },
            treatmentChemical: { type: Type.STRING, description: "Chemical backup treatment" },
            prevention: { type: Type.STRING, description: "Future prevention advice" }
          },
          required: ["disease", "confidence", "treatmentOrganic", "treatmentChemical", "prevention"]
        }
      }
    });

    const outputText = response.text || "{}";
    const diagnosis = JSON.parse(outputText);

    // If a valid state and district are provided, automatically log the diagnosis into our shared memory pool
    if (state && district && diagnosis.disease && diagnosis.disease.toLowerCase() !== "not a plant") {
      const coords = getDistrictCoordinates(district, state);
      
      const newReport: Report = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        state,
        district,
        crop: req.body.crop || "Diagnosed Crop",
        disease: diagnosis.disease,
        date: new Date().toISOString(),
        latitude: coords.lat + (Math.random() - 0.5) * 0.05,
        longitude: coords.lng + (Math.random() - 0.5) * 0.05,
      };
      anonymizedReports.unshift(newReport);
      // Invalidate early warning cache
      cachedEarlyWarning = null;
    }

    diagnosis.kvkContact = getNearestKvkContact(state, district);

    res.json(diagnosis);
  } catch (error: any) {
    console.error("Diagnosis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze crop photo" });
  }
});

// Endpoint: Cross-District Early Warning analysis (Flow 3)
app.get("/api/early-warning", async (req, res) => {
  // 1. Check in-memory cache
  if (cachedEarlyWarning && (Date.now() - cachedEarlyWarning.timestamp < EARLY_WARNING_CACHE_TTL_MS)) {
    return res.json(cachedEarlyWarning.data);
  }

  try {
    const ai = getAiClient();

    // Get recent reports for context
    const recentReports = anonymizedReports.slice(0, 30).map(r => ({
      district: r.district,
      state: r.state,
      crop: r.crop,
      disease: r.disease,
      date: r.date
    }));

    const systemPrompt = `You are analyzing anonymized crop disease reports across Indian districts to detect potential spreading outbreaks.
Analyze the following list of recent diagnoses: ${JSON.stringify(recentReports)}

Task:
1. Identify any disease appearing in multiple nearby districts within a short time window (possible spreading outbreak).
2. Generate a clear warning alert message.
3. If no alert is found, return alert: false, affected_districts: [], disease: "", message: "All monitored districts are currently stable with no warning alerts."`;

    const response = await generateContentWithFallback({
      model: "gemini-3.1-flash-lite",
      contents: "Perform crop outbreak early warning analysis and output JSON.",
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alert: { type: Type.BOOLEAN, description: "True if a spreading threat/outbreak is detected" },
            affected_districts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of districts involved or nearby at risk"
            },
            disease: { type: Type.STRING, description: "Name of the disease posing the threat" },
            message: { type: Type.STRING, description: "Actionable warning alert message" }
          },
          required: ["alert", "affected_districts", "disease", "message"]
        }
      }
    });

    const outputText = response.text || "{}";
    const parsedData = JSON.parse(outputText);
    cachedEarlyWarning = { data: parsedData, timestamp: Date.now() };
    res.json(parsedData);
  } catch (error: any) {
    console.warn("Notice: Gemini early warning analysis temporarily unavailable, returning algorithmic assessment:", error.message || error);
    const fallbackData = computeAlgorithmicEarlyWarning(anonymizedReports);
    cachedEarlyWarning = { data: fallbackData, timestamp: Date.now() };
    res.json(fallbackData);
  }
});

// Endpoint: Text-to-Speech Generation using gemini-3.1-flash-tts-preview
app.post("/api/tts", async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided for TTS" });
    }

    const ai = getAiClient();

    // Map language code to voice instruction for all Indian languages
    const langStyles: Record<string, string> = {
      hi: "Say warmly in clear Hindi: ",
      bn: "Say warmly in clear Bengali: ",
      mr: "Say warmly in clear Marathi: ",
      te: "Say warmly in clear Telugu: ",
      ta: "Say warmly in clear Tamil: ",
      gu: "Say warmly in clear Gujarati: ",
      ur: "Say warmly in clear Urdu: ",
      kn: "Say warmly in clear Kannada: ",
      or: "Say warmly in clear Odia: ",
      ml: "Say warmly in clear Malayalam: ",
      pa: "Say warmly in clear Punjabi: ",
      as: "Say warmly in clear Assamese: ",
      en: "Say warmly in clear Indian English: ",
      ne: "Say warmly in clear Nepali: ",
      mai: "Say warmly in clear Maithili or Hindi: ",
      kok: "Say warmly in clear Konkani or Marathi: ",
      sd: "Say warmly in clear Sindhi: ",
      doi: "Say warmly in clear Dogri or Hindi: ",
      mni: "Say warmly in clear Manipuri: ",
      brx: "Say warmly in clear Bodo: ",
      sa: "Say warmly in clear Sanskrit: ",
      ks: "Say warmly in clear Kashmiri: ",
      sat: "Say warmly in clear Santali: ",
    };

    const style = langStyles[language] || "Say clearly and warmly in a respectful tone: ";

    const response = await generateContentWithFallback({
      model: "gemini-3.8-flash-lite-tts",
      contents: [{ parts: [{ text: `${style} ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const base64Audio = inlineData?.data;
    const rawMimeType = inlineData?.mimeType || "audio/pcm;rate=24000";

    if (!base64Audio) {
      return res.json({
        audio: null,
        audioBase64: null,
        mimeType: null,
        ttsAvailable: false,
        fallbackToBrowserSpeech: true,
        notice: `Voice playback not yet available in ${LANG_MAP[language] || language}. Text transcript provided.`,
      });
    }

    let finalBase64 = base64Audio;
    let finalMimeType = rawMimeType;

    // The Gemini TTS model typically returns raw PCM without a RIFF header.
    // Wrap in standard WAV container so standard HTML5 Audio and browsers can play it directly.
    if (rawMimeType.includes("pcm") || !rawMimeType.includes("wav")) {
      const rateMatch = rawMimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      finalBase64 = pcmToWav(base64Audio, sampleRate);
      finalMimeType = "audio/wav";
    }

    res.json({
      audio: finalBase64,
      audioBase64: finalBase64,
      mimeType: finalMimeType
    });
  } catch (error: any) {
    console.error("TTS generation error:", error);
    // Graceful fallback response so the client can speak using browser speech synthesis
    res.json({
      audio: null,
      audioBase64: null,
      mimeType: null,
      fallbackToBrowserSpeech: true,
      ttsAvailable: false,
      notice: `Voice playback temporarily unavailable for this request. Text transcript is ready.`,
      error: error.message
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
