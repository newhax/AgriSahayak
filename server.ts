import express from "express";
import path from "path";
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
let currentApiKey = "";

function getAiClient(): GoogleGenAI {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  if (!aiClient || currentApiKey !== key) {
    currentApiKey = key;
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
  const originalModel = params.model || "gemini-3.8-flash";

  // For TTS, try gemini-3.8-flash-lite-tts first, then gemini-3.1-flash-tts-preview
  const isTts = originalModel.includes("tts");
  const modelsToTry = isTts
    ? ["gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"]
    : Array.from(new Set([originalModel, "gemini-3.8-flash", "gemini-3.1-flash-lite"]));

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
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint: Fetch Seeded State/District Metadata
app.get(["/api/states", "/states"], (req, res) => {
  res.json(SEEDED_STATES);
});

// Endpoint: Fetch dynamic ICAR soil profile with fallback hierarchy
app.get(["/api/soil-profile", "/soil-profile"], (req, res) => {
  const state = String(req.query.state || "Punjab");
  const district = String(req.query.district || "Ludhiana");
  const profile = getSoilProfileWithFallback(state, district);
  res.json(profile);
});

// Endpoint: Fetch Anonymized Reports
app.get(["/api/reports", "/reports"], (req, res) => {
  res.json(anonymizedReports);
});

// Endpoint: Log a Diagnosis
app.post(["/api/reports", "/reports"], (req, res) => {
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
  mni: "Manipuri / Meitei (मৈতৈলোন্)",
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

  const isHindi = language === "hi";
  const isPunjabi = language === "pa";
  const isMarathi = language === "mr";
  const isTamil = language === "ta";
  const isTelugu = language === "te";

  // 1. Wheat / Gehun / Kanak
  if (/wheat|gehu|kanak|गेहूं|गेहूँ|ਕਣਕ|கோதுமை|గోధుమ/.test(qLower)) {
    fallbackAction = "advisory";
    if (isHindi) {
      fallbackReply = `🌾 **${district} (${state}) में गेहूँ की वैज्ञानिक खेती व सलाह:**
1. **उन्नत किस्में:** HD-3086, DBW-187 (करण वंदना), DBW-222 और PBW-725 जो आपकी ${soilType} मिट्टी (pH ${ph}) में 20-25 क्विंटल/एकड़ पैदावार देती हैं।
2. **बुवाई समय:** 25 अक्टूबर से 15 नवंबर सबसे उत्तम समय है। बीज को कार्बेन्डाजिम या ट्राइकोडर्मा (5 ग्राम/किग्रा) से उपचारित करके बोएं।
3. **खाद की सही मात्रा:** प्रति एकड़ 50 किग्रा DAP, 20 किग्रा पोटाश और 10 किग्रा जिंक सल्फेट (21%) बुवाई के समय। यूरिया की पहली टॉप-ड्रेसिंग पहली सिंचाई पर दें।
4. **क्रांतिक सिंचाई:** पहली सिंचाई बुवाई के 20-22 दिन बाद (CRI स्टेज - ताज जड़ निकलते समय) बहुत जरूरी है।

क्या आप विस्तृत फसल परामर्श खोलना चाहते हैं? [ACTION:advisory]`;
      fallbackSuggestions = ["गेहूँ में पीला रतुआ कैसे रोकें?", "यूरिया की सही मात्रा", "फसल परामर्श खोलें"];
    } else if (isPunjabi) {
      fallbackReply = `🌾 **${district} ਵਿੱਚ ਕਣਕ ਦੀ ਖੇਤੀ ਸੰਬੰਧੀ ਸਲਾਹ:**
1. **ਸਿਫਾਰਸ਼ ਕੀਤੀਆਂ ਕਿਸਮਾਂ:** PBW-824, PBW-725, DBW-222 ਅਤੇ HD-3086।
2. **ਖਾਦ ਪ੍ਰਬੰਧਨ:** ਬਿਜਾਈ ਵੇਲੇ 55 ਕਿੱਲੋ ਡੀ.ਏ.ਪੀ. ਅਤੇ 10 ਕਿੱਲੋ ਜ਼ਿੰਕ ਸਲਫੇਟ। ਯੂਰੀਆ ਦੀ ਪਹਿਲੀ ਕਿਸ਼ਤ ਪਹਿਲੇ ਪਾਣੀ ਵੇਲੇ ਦਿਓ।
3. **ਪਹਿਲਾ ਪਾਣੀ (CRI):** ਬਿਜਾਈ ਤੋਂ 21-25 ਦਿਨਾਂ ਬਾਅਦ ਪਹਿਲਾ ਪਾਣੀ ਜ਼ਰੂਰ ਲਗਾਓ। [ACTION:advisory]`;
      fallbackSuggestions = ["ਕਣਕ ਦੇ ਪੀਲੇ ਰਤਵੇ ਦਾ ਇਲਾਜ", "ਨਦੀਨਾਂ ਦੀ ਰੋਕਥਾਮ", "ਫ਼ਸਲ ਸਲਾਹ ਖੋਲ੍ਹੋ"];
    } else {
      fallbackReply = `🌾 **Wheat Cultivation Guidance for ${district}, ${state}:**
1. **High-Yield Varieties:** HD-3086, DBW-187, DBW-222, PBW-725 adapted to your ${soilType} soil (pH ${ph}).
2. **Fertilizer Schedule:** Apply 50 kg DAP, 20 kg Potash, and 10 kg Zinc Sulphate (21%) per acre at basal sowing. Apply Urea in two split doses at 1st and 2nd irrigation.
3. **Critical Irrigation (CRI):** Ensure first irrigation at 20-22 days after sowing (Crown Root Initiation stage). [ACTION:advisory]`;
      fallbackSuggestions = ["Wheat yellow rust cure", "Fertilizer dosage guide", "Open Crop Advisory"];
    }
  }
  // 2. Rice / Paddy / Dhaan
  else if (/rice|paddy|dhaan|dhan|chawal|धान|चावल|ਝੋਨਾ|ਚੌਲ|நெல்|వరి/.test(qLower)) {
    fallbackAction = "advisory";
    if (isHindi) {
      fallbackReply = `🌾 **${district} में धान (Paddy) की आधुनिक खेती सलाह:**
1. **किस्में:** पूसा बासमती 1509, PR-126, PR-131 और पूसा 1718।
2. **जिंक की कमी (खैरा रोग):** अगर पत्तों पर लाल-भूरे धब्बे दिखें, तो 1 किग्रा जिंक सल्फेट (21%) + 500 ग्राम बुझा चूना 100 लीटर पानी में मिलाकर प्रति एकड़ छिड़कें।
3. **जल प्रबंधन:** रोपाई के 15 दिन बाद खेत में लगातार पानी भरने की जगह 'वैकल्पिक गीला और सूखा' (AWD) तरीका अपनाएं, जिससे पानी बचता है और जड़ें मजबूत होती हैं। [ACTION:advisory]`;
      fallbackSuggestions = ["खैरा रोग का इलाज", "तनाव मक्खी / तना छेदक नियंत्रण", "फसल परामर्श"];
    } else {
      fallbackReply = `🌾 **Paddy (Rice) Management for ${district}, ${state}:**
1. **Top Varieties:** PR-126, Pusa Basmati 1509/1718 suited for ${soilType} soil.
2. **Khaira Disease (Zinc Deficiency):** Spray 1 kg Zinc Sulphate (21%) + 0.5 kg Slaked Lime per acre in 100 L water.
3. **Water Management:** Practice Alternate Wetting and Drying (AWD) after initial 2 weeks to promote deep root growth. [ACTION:advisory]`;
      fallbackSuggestions = ["Paddy blast disease cure", "Stem borer organic spray", "Open Crop Advisory"];
    }
  }
  // 3. Fertilizers / Khad / Urea / DAP / Zinc / Bio-nutrients
  else if (/fertilizer|khad|urea|dap|npk|zinc|potash|vermicompost|jeevamrut|खाद|यूरिया|डीएपी|जिंक|पोटाश|जीवामृत|ਖਾਦ|ਉਰਮ|உரம்|ఎరువు/.test(qLower)) {
    if (isHindi) {
      fallbackReply = `🌱 **${district} के लिए संतुलित खाद और पोषण गाइड:**
1. **मिट्टी विश्लेषण:** आपकी मिट्टी का pH **${ph}** है और नमी **${moistureValue}%** है।
2. **यूरिया का सही इस्तेमाल:** यूरिया को कभी भी धूप में खुला न फेंकें। इसे शाम के समय या हल्की सिंचाई के बाद 2-3 किस्तों में दें ताकि नाइट्रोजन हवा में न उड़े।
3. **डीएपी और पोटाश:** डीएपी हमेशा बुवाई के समय बीज के नीचे (बेसल डोज) दें।
4. **देसी जीवामृत नुस्खा:** 10 किग्रा देसी गाय का गोबर + 10 लीटर गोमूत्र + 1 किग्रा गुड़ + 1 किग्रा बेसन + 200 लीटर पानी। 3 दिन छाया में रखें और सिंचाई के साथ खेत में दें। इससे जमीन की उर्वरता 3 गुना बढ़ती है!`;
      fallbackSuggestions = ["जीवामृत कैसे बनाएं?", "जिंक की सही मात्रा", "मिट्टी की जांच कैसे करें?"];
    } else {
      fallbackReply = `🌱 **Balanced Fertilizer & Soil Nutrition for ${district}, ${state}:**
1. **Soil Context:** Soil pH is **${ph}** (${soilType}), moisture index is **${moistureValue}%**.
2. **Basal Application:** Apply DAP and Potash strictly at sowing near root zone, not on top soil.
3. **Split Nitrogen:** Split Urea into 2-3 top dressings at tillering and panicle/flowering stages to minimize volatilization.
4. **Organic Jeevamrutha:** 10 kg cow dung + 10 L cow urine + 1 kg jaggery + 1 kg pulse flour in 200 L water. Ferment for 48 hours for microbial boost.`;
      fallbackSuggestions = ["Organic compost recipe", "Zinc deficiency signs", "Soil Health Card guide"];
    }
  }
  // 4. Yellow Rust / Rust / Fungal Blight
  else if (/yellow rust|rust|ratwa|peela|blight|jhulsa|fungus|रतुआ|झुलसा|पीला|ਰਤਵਾ/.test(qLower)) {
    fallbackAction = "diagnosis";
    if (isHindi) {
      fallbackReply = `🩺 **पीला रतुआ (Yellow Rust) और फफूंद से बचाव:**
1. **पहचान:** गेहूँ या फसल के पत्तों पर हल्दी जैसा पीला पाउडर बनता है। उंगली लगाने पर पीला रंग छूटता है।
2. **जैविक / घरेलू उपाय:** शुरुआती लक्षण पर 5 लीटर खट्टी छाछ (मट्ठा) + 200 ग्राम हींग 100 लीटर पानी में घोलकर छिड़कें।
3. **वैज्ञानिक दवा:** यदि प्रकोप अधिक हो, तो **प्रोपिकोनाज़ोल 25% EC (टिल्ट)** 1 मिली प्रति लीटर पानी (200 मिली प्रति एकड़) 200 लीटर पानी में मिलाकर दोपहर बाद छिड़कें।
4. **फोटो जांच:** पत्ते की फोटो खींचकर 'रोग निदान' में तुरंत जांचें। [ACTION:diagnosis]`;
      fallbackSuggestions = ["रोग निदान में फोटो भेजें", "नीम तेल का छिड़काव", "रोग नक्शा देखें"];
    } else {
      fallbackReply = `🩺 **Yellow Rust & Foliar Blight Management:**
1. **Symptom:** Yellow powdery stripe pustules on upper leaf blade that rub off on fingers.
2. **Immediate Action:** Spray **Propiconazole 25% EC** @ 1 ml/litre of water (200 ml/acre in 200 L water) on a clear day.
3. **Bio-control:** 5 L fermented sour buttermilk (chhach) diluted in 100 L water acts as natural fungicide.
4. **Plant Doctor:** Snap a leaf photo right now in Plant Doctor for instant confirmation. [ACTION:diagnosis]`;
      fallbackSuggestions = ["Scan leaf photo", "Outbreak alert map", "KVK helpline number"];
    }
  }
  // 5. Aphids / Whitefly / Sucking Pests (Mahu / Chepa / Keeda)
  else if (/aphid|mahu|chetpa|chepa|whitefly|tela|keeda|pest|insect|कीड़ा|माहू|चेपा|ਤੇਲਾ|ਸੁੰਡੀ|பூச்சி|తెగులు/.test(qLower)) {
    fallbackAction = "diagnosis";
    if (isHindi) {
      fallbackReply = `🩺 **माहू (चेपा) और रसचूसक कीटों का पक्का इलाज:**
1. **पहचान:** पत्तों और कलियों पर छोटे हरे, काले या पीले कीड़े चिपके रहते हैं और चिपचिपा रस छोड़ते हैं।
2. **पहला जैविक उपाय:** नीम का तेल 1500 PPM (5 मिली प्रति लीटर पानी) + थोड़ा सा साबुन का घोल मिलाकर छिड़कें।
3. **पीले स्टिकी ट्रैप:** खेत में प्रति एकड़ 15-20 पीले चिपचिपे कार्ड (Yellow Sticky Traps) लगाएं, इससे 80% कीट बिना किसी दवा के पकड़े जाते हैं।
4. **रासायनिक विकल्प:** यदि 15-20 कीड़े प्रति शाखा दिखें, तो **इमिडाक्लोप्रिड 17.8 SL** (0.5 मिली/लीटर) या **थियामेथोक्सम 25 WG** (1 ग्राम प्रति 3 लीटर पानी) छिड़कें। [ACTION:diagnosis]`;
      fallbackSuggestions = ["नीम तेल का घोल कैसे बनाएं?", "रोग निदान में फोटो अपलोड करें", "रोग नक्शा"];
    } else {
      fallbackReply = `🩺 **Aphids, Whiteflies & Sucking Pest Solution:**
1. **Organic First:** Neem oil 1500 ppm @ 5 ml/litre water mixed with 1 ml liquid soap.
2. **Yellow Sticky Traps:** Install 15-20 yellow sticky traps per acre to trap winged adults naturally.
3. **Threshold Control:** If infestation crosses ETL, spray **Imidacloprid 17.8% SL** @ 0.5 ml/L or **Thiamethoxam 25% WG** @ 1 g per 3 L water. [ACTION:diagnosis]`;
      fallbackSuggestions = ["Snap sick leaf photo", "Neem extract recipe", "Outbreak alert radar"];
    }
  }
  // 6. Irrigation / Water / Sinchai
  else if (/irrigation|water|sinchai|paani|pani|पानी|सिंचाई|ਪਾਣੀ|பாசனம்|నీరు/.test(qLower)) {
    if (isHindi) {
      fallbackReply = `💧 **${district} में वैज्ञानिक सिंचाई प्रबंधन:**
1. **मिट्टी की नमी:** आपके जिले की मिट्टी में नमी स्तर लगभग **${moistureValue}%** है।
2. **गेहूँ की 6 मुख्य सिंचाइयां:**
   - पहली: 20-22 दिन (ताज जड़ / CRI)
   - दूसरी: 40-45 दिन (कल्ले फूटते समय)
   - तीसरी: 60-65 दिन (गाभा अवस्था)
   - चौथी: 85-90 दिन (फूल निकलते समय)
   - पांचवीं: 100-105 दिन (दूधिया अवस्था)
   - छठी: 115-120 दिन (दाना भरते समय - तेज हवा में पानी न दें)।
3. **पानी की बचत:** फव्वारा (Sprinkler) या ड्रिप विधि से 40% पानी बचता है और पैदावार 15% बढ़ती है।`;
      fallbackSuggestions = ["मौसम का हाल क्या है?", "फसल परामर्श खोलें", "खाद देने का सही समय"];
    } else {
      fallbackReply = `💧 **Irrigation & Water Scheduling for ${district}, ${state}:**
1. **Moisture Level:** Soil moisture is currently around **${moistureValue}%** in your ${soilType} profile.
2. **Critical Wheat Stages:** CRI (21 DAS), Tillering (45 DAS), Jointing (65 DAS), Flowering (85 DAS), and Grain filling (105 DAS). Avoid irrigating during high wind speed to prevent crop lodging.
3. **Conservation:** Sprinkler or micro-irrigation saves up to 40% water while boosting uniform grain weight.`;
      fallbackSuggestions = ["Check 7-day weather", "Crop water requirement", "Fertilizer timing"];
    }
  }
  // 7. Mustard / Sarson / Rai
  else if (/mustard|sarson|rai|सरसों|ਸਰ੍ਹੋਂ|கடுगु|ఆవాలు/.test(qLower)) {
    fallbackAction = "advisory";
    if (isHindi) {
      fallbackReply = `🌱 **सरसों (Mustard) की अधिक तेल वाली पैदावार:**
1. **उन्नत किस्में:** आरएच-749, आरएच-725, पूसा मस्टर्ड 28 और गिरिराज।
2. **सल्फर (गंधक) का महत्व:** सरसों में तेल बढ़ाने के लिए 20-25 किग्रा बेंटोनाइट सल्फर प्रति एकड़ बुवाई के समय अवश्य डालें।
3. **माहू (चेपा) से बचाव:** जनवरी-फरवरी में बादल छाने पर माहू का खतरा बढ़ता है। खेत के किनारों पर येलो ट्रैप लगाएं। [ACTION:advisory]`;
      fallbackSuggestions = ["सरसों में माहू का इलाज", "सल्फर खाद के फायदे", "फसल परामर्श"];
    } else {
      fallbackReply = `🌱 **Mustard Agronomy for ${district}, ${state}:**
1. **Top Varieties:** RH-749, RH-725, Pusa Mustard 28.
2. **Sulphur Application:** Apply 20-25 kg elemental Sulphur/acre to boost oil content by 2-3%.
3. **Aphid Watch:** Cloudy weather attracts aphids; install yellow sticky traps and spray Neem oil early. [ACTION:advisory]`;
      fallbackSuggestions = ["Aphid spray in mustard", "Sowing window advice", "Open Crop Advisory"];
    }
  }
  // 8. Government Schemes / PM-KISAN / Crop Insurance (PMFBY)
  else if (/pm kisan|pmfby|scheme|subsidy|bima|yojana|kcc|msp|योजना|बीमा|सब्सिडी|ਸਕੀਮ/.test(qLower)) {
    if (isHindi) {
      fallbackReply = `🏛️ **किसान कल्याण योजनाएं व सहायता:**
1. **प्रधानमंत्री किसान सम्मान निधि (PM-KISAN):** पात्र किसानों को सालाना ₹6,000 (₹2,000 की तीन किस्तें) सीधे बैंक खाते में मिलती हैं। e-KYC pmkisan.gov.in पर कराएं।
2. **प्रधानमंत्री फसल बीमा योजना (PMFBY):** ओलावृष्टि, बेमौसम बारिश या सूखे से फसल खराब होने पर 72 घंटे के अंदर टोल-फ्री 14447 या 'Crop Insurance App' पर शिकायत दर्ज करना जरूरी है।
3. **किसान क्रेडिट कार्ड (KCC):** समय पर भुगतान करने पर मात्र 4% वार्षिक ब्याज दर पर ₹3 लाख तक का कृषि ऋण मिलता है।
4. **केवीके संपर्क:** आपके जिले ${district} के नजदीकी कृषि विज्ञान केंद्र से भी सीधी मदद मिल सकती है।`;
      fallbackSuggestions = ["फसल बीमा में क्लेम कैसे करें?", "KVK से संपर्क कैसे करें?", "फसल सलाह"];
    } else {
      fallbackReply = `🏛️ **Government Agricultural Schemes & Benefits:**
1. **PM-KISAN:** ₹6,000/year in 3 equal installments credited directly via DBT. Complete e-KYC on pmkisan.gov.in.
2. **PMFBY (Crop Insurance):** Report localized damage (hailstorm, inundation) within 72 hours via toll-free 14447 or Crop Insurance App.
3. **Kisan Credit Card (KCC):** Crop loans up to ₹3 Lakh at an effective interest rate of 4% with prompt repayment incentive.`;
      fallbackSuggestions = ["How to claim PMFBY?", "Local KVK helpline", "Crop Advisory"];
    }
  }
  // 9. Weather / Climate / Rain / Frost / Cold
  else if (/weather|mausam|rain|barish|frost|thand|cold|pala|मौसम|बारिश|पाला|ਠੰਡ|ਮੌਸਮ|வானிலை/.test(qLower)) {
    if (isHindi) {
      fallbackReply = `⛅ **${district} का मौसम और फसल सुरक्षा उपाय:**
1. **पाले (Frost) से बचाव:** अत्यधिक ठंड या पाले की आशंका होने पर शाम के समय खेत में हल्की सिंचाई कर दें। खेत की मेड़ों पर धुआं करने से तापमान 2-3 डिग्री बढ़ जाता है।
2. **बेमौसम बारिश:** खेत में जलभराव न होने दें, तुरंत जल निकासी की नालियां साफ रखें।
3. **हवा का रुख:** तेज हवा चलने के समय गेहूँ में कभी पानी न लगाएं, वर्ना फसल गिर (Lodging) सकती है।`;
      fallbackSuggestions = ["पाले से फसल कैसे बचाएं?", "सिंचाई का सही समय", "रोग नक्शा"];
    } else {
      fallbackReply = `⛅ **Weather & Crop Protection for ${district}, ${state}:**
1. **Frost/Cold Wave:** Light evening irrigation raises soil temperature and protects vegetative buds from freezing injury.
2. **Excess Rain Drainage:** Clear drainage channels immediately to prevent root asphyxiation and damping off.
3. **Wind Speed:** Avoid irrigating tall wheat during winds exceeding 15 km/h to prevent lodging.`;
      fallbackSuggestions = ["Frost mitigation tips", "7-day forecast", "Plant Doctor"];
    }
  }
  // 10. App How-To Guide
  else if (/how to use|use this app|teach|help|guide|app kaise|kaise chalaye|sikhaye|ऐप|सिखाओ|ਕਿਵੇਂ ਵਰਤਣਾ|ਵਰਤਣਾ/.test(qLower)) {
    if (isHindi) {
      fallbackReply = `राम-राम भाई! मैं आपका **किसान मित्र (Farmer's Friend)** हूँ। यह ऐप चलाना बहुत आसान है:

1. 🌾 **फसल सलाह (Crop Advisory)**: आपके जिले (${district}) की मिट्टी और उपग्रह मौसम के आधार पर सबसे अच्छी फसलें और जैविक खाद की सलाह। आप रेडियो स्पीकर से पूरी सलाह अपनी भाषा में सुन भी सकते हैं। [ACTION:advisory]
2. 🩺 **रोग डॉक्टर (Plant Doctor)**: बीमार या खराब पत्ते की फोटो खींचें, ऐप तुरंत बीमारी पहचानकर जैविक उपाय और सुरक्षित दवा बताएगा। [ACTION:diagnosis]
3. 🗺️ **रोग नक्शा (Outbreaks Map)**: पास के जिलों में फैलने वाली बीमारियों का लाइव नक्शा देखें। [ACTION:dashboard]
4. 🎙️ **बोलकर पूछें**: टाइप करने की जरूरत नहीं, बस माइक बटन दबाकर अपनी भाषा में पूछें!

बताइए दोस्त, मैं आपकी क्या मदद करूँ?`;
      fallbackSuggestions = ["फसल सलाह कैसे लें?", "बीमारी की फोटो कैसे भेजें?", "रोग नक्शा दिखाएं"];
    } else {
      fallbackReply = `Hello my friend! I am your **Farmer's Friend (Kisan Mitra)** for ${district}, ${state}:

1. 🌾 **Crop Advisory**: Tailored high-yield crops based on soil (${soilType}) and weather with audio broadcast. [ACTION:advisory]
2. 🩺 **Plant Doctor (Diagnosis)**: Snap any diseased leaf for instant organic bio-remedies and medicine doses. [ACTION:diagnosis]
3. 🗺️ **Outbreak Radar**: Live cross-district tracking of crop diseases. [ACTION:dashboard]
4. 🎙️ **Voice Feature**: Tap the mic to talk with me in your preferred language!

What would you like to explore first?`;
      fallbackSuggestions = ["How do I get crop advice?", "How to scan plant disease?", "Show outbreak map"];
    }
  }
  // 11. Greetings
  else if (/hello|hi|namaste|hey|नमस्ते|सलाम|வணக்கம்|నమస్కారం|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ/.test(qLower)) {
    if (isHindi) {
      fallbackReply = `राम-राम भाई! मैं आपका सच्चा साथी **किसान मित्र (Farmer's Friend)** हूँ। मैं ${district}, ${state} में आपकी फसलों, मौसम, खाद और खेती से जुड़ी हर समस्या का समाधान करने के लिए तैयार हूँ। आप कैसे हैं दोस्त? आज आप क्या जानकारी चाहते हैं?`;
      fallbackSuggestions = ["गेहूँ की अच्छी किस्में", "जैविक खाद कैसे बनाएं?", "कीट से बचाव कैसे करें?"];
    } else {
      fallbackReply = `Hello my dear friend! I am your **Farmer's Friend (Kisan Mitra)** for ${district}, ${state}. How is your farm and family doing today? What farming topic or question can I help you with?`;
      fallbackSuggestions = ["Best crops this season", "Organic fertilizer recipe", "Pest control tips"];
    }
  }
  // 12. General contextual response tailored to user query
  else {
    if (isHindi) {
      fallbackReply = `दोस्त, ${district} (${state}) में आपकी ${soilType} मिट्टी (pH ${ph}, नमी ${moistureValue}%) के संदर्भ में:

आपके सवाल **"${message}"** पर मेरी वैज्ञानिक सलाह है:
1. **मिट्टी व पोषण:** मिट्टी में पर्याप्त जैविक कार्बन बनाए रखने के लिए कम्पोस्ट या वर्मीकम्पोस्ट का प्रयोग करें। रासायनिक खाद हमेशा मिट्टी परीक्षण के आधार पर ही दें।
2. **पौध संरक्षण:** किसी भी असामान्य कीट या धब्बे के दिखने पर शुरुआती चरण में नीम तेल (1500 PPM) का छिड़काव करें।
3. **निगरानी:** आप इस ऐप के 'रोग निदान' [ACTION:diagnosis] में फोटो अपलोड करके या 'फसल सलाह' [ACTION:advisory] में जिले के अनुसार फसल चक्र देख सकते हैं।

क्या आप इस विषय पर कुछ और विस्तार से जानना चाहते हैं?`;
      fallbackSuggestions = ["फसल परामर्श खोलें", "रोग निदान खोलें", "जैविक खाद कैसे बनाएं?"];
    } else {
      fallbackReply = `My friend, regarding your question **"${message}"** for ${district}, ${state} (${soilType} soil, pH ${ph}, moisture ${moistureValue}%):

1. **Agronomic Practice:** Maintain balanced organic and inorganic nutrition based on your local soil conditions.
2. **Crop Protection:** For any pest or foliar spots, apply bio-pesticides like Neem oil (1500 ppm) early before threshold is crossed.
3. **App Guidance:** You can scan leaf photos in Plant Doctor [ACTION:diagnosis] or explore climate-adapted sowing windows in Crop Advisory [ACTION:advisory].

Would you like more specific instructions on seeds, fertilizers, or pest management?`;
      fallbackSuggestions = ["Open Crop Advisory", "Open Plant Doctor", "Weather forecast"];
    }
  }

  return {
    reply: fallbackReply,
    suggestions: fallbackSuggestions,
    agentBadge: "Kisan Mitra — Farmer's Friend",
    actionTarget: fallbackAction,
  };
}

// Unified Endpoint: Interactive Conversational AI Chatbot (Supports SSE Streaming & JSON)
app.post(["/api/friend-chat", "/api/chat/stream", "/api/chat"], async (req, res) => {
  const isStreaming = req.body.stream === true ||
    Boolean(req.headers.accept && req.headers.accept.includes("text/event-stream")) ||
    req.path.includes("/stream");

  if (isStreaming) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
  }

  const sendSSE = (data: any) => {
    if (isStreaming) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const message = req.body.message || req.body.query || req.body.prompt;
    const history = req.body.history || [];
    const language = req.body.language || "hi";
    const state = req.body.state || "Punjab";
    const district = req.body.district || "Ludhiana";

    if (!message || typeof message !== "string" || !message.trim()) {
      if (isStreaming) {
        sendSSE({ type: "error", error: "Missing message text parameter" });
        return res.end();
      }
      return res.status(400).json({ error: "Missing message text parameter" });
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

    const systemPrompt = `You are "Kisan Mitra" (Farmer's Friend / किसान मित्र), a warm, loving, rural friend and expert agricultural scientist advising smallholder Indian farmers in their village.
You are chatting with a farmer in ${district}, ${state}.
You speak like a close, caring friend or brother over a cup of chai in the village chaupal — respectful, enthusiastic, patient, empathetic, and encouraging ("राम-राम भाई!", "नमस्ते दोस्त!", "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰ ਜੀ!", "வணக்கம் நண்பரே!", "నమస్కారం మిత్రమా!", "Hello my dear farmer friend!").

CRITICAL MANDATE - ANSWER THE FARMER'S SPECIFIC QUESTION DIRECTLY:
1. Whatever question the farmer asks, you MUST provide a direct, comprehensive, specific, and actionable answer tailored to their exact query.
   - If they ask about a crop (e.g., wheat, rice/paddy, cotton, mustard, potato, tomato, pulses, sugarcane, vegetables): Give exact recommended varieties, sowing window, seed treatment, fertilizer dose (DAP, Urea, Zinc, Potash) per acre, and irrigation schedule.
   - If they ask about pests or plant diseases (e.g., yellow rust, aphids/chepa, whitefly, leaf curl, stem borer, blight, caterpillars): Give immediate low-cost organic remedies (Neem oil 1500ppm, fermented buttermilk, yellow sticky traps) and safe chemical remedies with exact dosage. Suggest they can take a leaf photo in Plant Doctor [ACTION:diagnosis].
   - If they ask about fertilizers or soil: Explain balanced NPK nutrition, vermicompost, Jeevamrutha preparation, and how to correct soil pH for their ${soilType} soil (pH ${ph}, organic carbon ${organicCarbon}%).
   - If they ask about irrigation or water: Give critical watering stages (like CRI for wheat) and water conservation tips.
   - If they ask about weather or seasonal risks: Explain protection from frost, heatwaves, or unseasonal rains in ${district} (current weather: ${weatherSummary}).
   - If they ask about government schemes: Explain PM-KISAN, PMFBY crop insurance claim steps, KCC, and local KVK assistance.
   - If they ask how to use this app: Explain Crop Advisory [ACTION:advisory], Plant Doctor [ACTION:diagnosis], and Outbreak Radar Map [ACTION:dashboard].
   - If they greet you: Greet them warmly and ask how their farm is doing in ${district}.

2. LOCAL CONTEXT FOR ${district}, ${state}:
   - Soil: ${soilType}, pH: ${ph}, Organic Carbon: ${organicCarbon}%, Moisture index: ${moistureValue}%.
   - Live Weather: ${weatherSummary}.
   - Nearby Outbreak Status: ${outbreakContext}.

3. STRICT LANGUAGE MANDATE:
   - The farmer's selected language is: ${targetLang} (Language code: "${language}").
   - Respond 100% in ${targetLang} using native script (e.g. Hindi in Devanagari, Punjabi in Gurmukhi, Marathi in Devanagari, Tamil in Tamil script, Telugu in Telugu script, Bengali in Bengali script, Gujarati in Gujarati script, Kannada in Kannada script, Malayalam in Malayalam script, English in English).
   - Format cleanly with bullet points where helpful.
   - Include action tags [ACTION:advisory], [ACTION:diagnosis], or [ACTION:dashboard] when appropriate.`;

    if (isStreaming) {
      sendSSE({
        type: "start",
        agentBadge: "Kisan Mitra — Farmer's Friend",
      });
    }

    // Build contents with past conversation turns
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        if (h.sender === "user") {
          contents.push({ role: "user", parts: [{ text: h.text }] });
        } else if (h.sender === "copilot" || h.sender === "friend" || h.sender === "assistant") {
          contents.push({ role: "model", parts: [{ text: h.text }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    let fullText = "";
    let streamSuccess = false;

    // Try Gemini model rotation
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

    for (const modelCandidate of modelsToTry) {
      try {
        console.log(`[Chat API] Invoking ${modelCandidate}...`);
        const streamResponse = await getAiClient().models.generateContentStream({
          model: modelCandidate,
          contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullText += chunkText;
            if (isStreaming) {
              sendSSE({
                type: "chunk",
                delta: chunkText,
                text: chunkText,
              });
            }
          }
        }

        if (fullText.trim()) {
          streamSuccess = true;
          break;
        }
      } catch (candidateError: any) {
        console.warn(`[Chat API] Model ${modelCandidate} failed:`, candidateError?.message || candidateError);
      }
    }

    // If Gemini model rotation succeeded
    if (streamSuccess && fullText.trim()) {
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
          : ["गेहूँ में खाद प्रबंधन", "कीटों का जैविक उपाय", "मौसम का हाल"];
      } else if (language === "pa") {
        suggestions = isHowTo
          ? ["ਫ਼ਸਲ ਸਲਾਹ ਖੋਲ੍ਹੋ", "ਬਿਮਾਰੀ ਦੀ ਜਾਂਚ ਕਰੋ", "ਬਿਮਾਰੀ ਨਕਸ਼ਾ ਦੇਖੋ"]
          : ["ਖਾਦ ਦੀ ਸਹੀ ਵਰਤੋਂ", "ਕੀਟ ਰੋਕਥਾਮ", "ਮੌਸਮ ਦਾ ਹਾਲ"];
      } else if (language === "mr") {
        suggestions = isHowTo
          ? ["पीक सल्ला कसा मिळवावा?", "रोगाचा फोटो कसा टाकावा?", "रोग नकाशा दाखवा"]
          : ["सेंद्रिय खत कसे बनवावे?", "कीड नियंत्रण उपाय", "हवामानाचा अंदाज"];
      } else if (language === "ta") {
        suggestions = isHowTo
          ? ["பயிர் ஆலோசனை பெறுக", "நோய் கண்டறிதல்", "நோய் வரைபடம்"]
          : ["உர மேலாண்மை", "இயற்கை பூச்சி விரட்டி", "வானிலை தகவல்"];
      } else {
        suggestions = isHowTo
          ? ["How do I get crop advice?", "How to scan plant disease?", "Show outbreak map"]
          : ["Balanced fertilizer guide", "Organic pest control", "7-day weather outlook"];
      }

      if (isStreaming) {
        sendSSE({
          type: "done",
          fullText,
          suggestions,
          actionTarget,
          agentBadge: "Kisan Mitra — Farmer's Friend",
        });
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      return res.json({
        reply: fullText,
        text: fullText,
        suggestions,
        actionTarget,
        agentBadge: "Kisan Mitra — Farmer's Friend",
      });
    }

    throw new Error("Unable to connect to Gemini AI. Please check your network connection or API configuration.");
  } catch (error: any) {
    console.error("Chat error:", error);
    if (isStreaming) {
      sendSSE({
        type: "error",
        error: error.message || "Failed to process chat with Gemini AI",
      });
      res.end();
    } else {
      res.status(500).json({ error: error.message || "Failed to process chat with Gemini AI" });
    }
  }
});

// Endpoint: Voice/Text Crop Advisory (Flow 1)
app.post(["/api/advisory", "/advisory"], async (req, res) => {
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
    const advisoryData = JSON.parse(outputText);
    if (!advisoryData || !Array.isArray(advisoryData.crops) || advisoryData.crops.length === 0) {
      throw new Error("Invalid schema generated by Gemini AI");
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
    console.error("Advisory error:", error);
    res.status(500).json({ error: error.message || "Failed to generate real-time AI crop advisory" });
  }
});

// Endpoint: Crop Disease Diagnosis (Flow 2)
app.post(["/api/diagnose", "/diagnose"], async (req, res) => {
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
app.get(["/api/early-warning", "/early-warning"], async (req, res) => {
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
app.post(["/api/tts", "/tts"], async (req, res) => {
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

// Setup Vite (dev only) or static serving (production).
// IMPORTANT: "vite" is imported dynamically, ONLY inside the dev branch below.
// This ensures the Vite/Rollup module (and its platform-specific native binding)
// is never loaded at all in production/serverless (Vercel), which is what was
// previously causing "Cannot find module '@rollup/rollup-linux-x64-gnu'" crashes
// at request time even though startServer() itself is never called on Vercel.
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
