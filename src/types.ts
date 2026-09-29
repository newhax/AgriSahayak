export type Language =
  // Tier 1: Core major Indian languages (Full UI, Voice, AI generation)
  | "en"
  | "hi"
  | "bn"
  | "mr"
  | "te"
  | "ta"
  | "gu"
  | "ur"
  | "kn"
  | "or"
  | "ml"
  | "pa"
  | "as"
  // Tier 2: Additional Scheduled & regional Indian languages (UI + fallback voice)
  | "mai"
  | "sat"
  | "ks"
  | "ne"
  | "kok"
  | "sd"
  | "doi"
  | "mni"
  | "brx"
  | "sa";

export type SoilDataConfidence =
  | "district-verified"
  | "zone-estimate"
  | "state-estimate"
  | "national-default";

export interface SupportedLanguage {
  code: Language;
  name: string;
  nativeName: string;
  bcp47: string;
  tier: 1 | 2;
  voiceInputSupported: boolean;
  ttsAvailable: boolean;
  generationQuality: "native-fluent" | "standard" | "assisted";
  fallbackLanguage?: Language;
  voiceNotice?: string;
  ttsNotice?: string;
}

export interface LanguageConfig {
  code: Language;
  native_name: string;
  english_name: string;
  speech_locale: string;
  dir: "ltr" | "rtl";
  tier: 1 | 2;
  voice_input_supported: boolean;
  tts_available: boolean;
}

export interface DistrictData {
  id: string;
  name: string;
  district_name?: string;
  lat: number;
  lng: number;
  soilType: string;
  default_soil_type?: string;
  ph: number;
  organicCarbon: number; // in percentage, e.g. 0.65
  ndviValue: number; // 0.1 to 0.9 (vegetation health)
  moistureValue: number; // 0 to 100 (soil moisture %)
  agroClimaticZone: string;
  agro_climatic_zone?: string;
  data_confidence: SoilDataConfidence | "verified" | "state-level-default";
}

export interface ResolvedDistrictContext {
  state: string;
  district: string;
  lat: number;
  lng: number;
  soilType: string;
  ph: number;
  organicCarbon: number;
  ndviValue: number;
  moistureValue: number;
  agroClimaticZone: string;
  confidence: SoilDataConfidence;
  confidenceLabel: string;
  confidenceDescription: string;
  kvkContact: {
    title: string;
    phone: string;
    helpline: string;
    address: string;
  };
}

export interface StateData {
  id: string;
  state_code: string;
  name: string;
  state_name?: string;
  districts: DistrictData[];
}

export interface CropRecommendation {
  cropName: string;
  rationale: string;
  expectedYield: string;
  sowingWindow: string;
}

export interface CropRecommendationResponse {
  crops: CropRecommendation[];
  regenerativePractices: string[];
  riskMitigation: string;
  audioTranscript?: string;
  language?: string;
  soilDataSource?: SoilDataConfidence;
  soilDataLabel?: string;
  kvkHelpline?: string;
}

export interface DiseaseDiagnosisResponse {
  disease: string;
  confidence: string; // e.g. "fairly confident" or "possible..."
  treatmentOrganic: string;
  treatmentChemical: string;
  prevention: string;
  audioTranscript?: string;
  language?: string;
  kvkAdvice?: string;
  kvkContact?: {
    title: string;
    phone: string;
    helpline?: string;
    address?: string;
  };
}

export interface AnonymizedReport {
  id: string;
  state: string;
  district: string;
  crop: string;
  disease: string;
  date: string; // ISO format
  latitude: number;
  longitude: number;
}

export interface EarlyWarningAlert {
  alert: boolean;
  affected_districts: string[];
  disease: string;
  message: string;
}

export type WeatherSeverity = "critical" | "warning" | "advisory" | "normal";

export interface SevereWeatherAlert {
  hasAlert: boolean;
  severity: WeatherSeverity;
  alertType: "heatwave" | "heavy_rain" | "thunderstorm" | "hailstorm" | "high_winds" | "cold_wave" | "frost" | "none";
  title: string;
  headline: string;
  summary: string;
  agronomicAdvisory: string;
  actions: string[];
  metrics: {
    currentTemp?: number;
    maxTemp?: number;
    minTemp?: number;
    precipitationSum?: number;
    precipitationProbability?: number;
    windSpeed?: number;
    windGusts?: number;
    humidity?: number;
    weatherCode?: number;
    weatherCondition?: string;
  };
  dailyForecast: Array<{
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    precipitationSum: number;
    precipitationProbability: number;
    windGustsMax: number;
    weatherCode: number;
    conditionText: string;
    isSevere: boolean;
    severeReason?: string;
  }>;
  district: string;
  state: string;
  source: string;
  updatedAt: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // --- Tier 1: Core Pan-India Languages ---
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    bcp47: "hi-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    bcp47: "en-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    bcp47: "bn-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    bcp47: "mr-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    bcp47: "te-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    bcp47: "ta-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    bcp47: "gu-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    bcp47: "ur-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    bcp47: "kn-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    bcp47: "or-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
    voiceNotice: "Odia voice input uses Google Speech. Text input is also always available.",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    bcp47: "ml-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    bcp47: "pa-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
    bcp47: "as-IN",
    tier: 1,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
    voiceNotice: "Assamese voice input uses Web Speech API. If unsupported on your browser, use keyboard input.",
  },

  // --- Tier 2: Additional Scheduled & Regional Languages ---
  {
    code: "mai",
    name: "Maithili",
    nativeName: "मैथिली",
    bcp47: "mai-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "hi",
    voiceNotice: "Voice recognition is not yet standardized for Maithili. Please type your query in Devanagari or use Hindi voice.",
    ttsNotice: "Voice playback is not yet available in Maithili. Comprehensive text transcript is provided.",
  },
  {
    code: "sat",
    name: "Santali",
    nativeName: "ᱥᱟᱱᱛᱟᱲᱤ (Ol Chiki)",
    bcp47: "sat-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "hi",
    voiceNotice: "Voice recognition is currently in development for Santali. Please type in Ol Chiki or English/Hindi.",
    ttsNotice: "Voice playback is not yet available in Santali. Text summary is provided.",
  },
  {
    code: "ks",
    name: "Kashmiri",
    nativeName: "کٲشُر",
    bcp47: "ks-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "ur",
    voiceNotice: "Kashmiri voice input is currently limited. Please use text input or Urdu voice fallback.",
    ttsNotice: "Voice playback is not yet available in Kashmiri. Full text response is displayed.",
  },
  {
    code: "ne",
    name: "Nepali",
    nativeName: "नेपाली",
    bcp47: "ne-NP",
    tier: 2,
    voiceInputSupported: true,
    ttsAvailable: true,
    generationQuality: "native-fluent",
  },
  {
    code: "kok",
    name: "Konkani",
    nativeName: "कोंकणी",
    bcp47: "kok-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "mr",
    voiceNotice: "Konkani speech recognition is experimental. Type in Devanagari or use Marathi voice fallback.",
    ttsNotice: "Voice playback not yet available in Konkani. Text transcript provided.",
  },
  {
    code: "sd",
    name: "Sindhi",
    nativeName: "سنڌي / सिन्धी",
    bcp47: "sd-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "hi",
    voiceNotice: "Sindhi voice recognition is limited on mobile browsers. Please type your query.",
    ttsNotice: "Voice playback not yet available in Sindhi.",
  },
  {
    code: "doi",
    name: "Dogri",
    nativeName: "डोगरी",
    bcp47: "doi-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "hi",
    voiceNotice: "Dogri voice model is in training. Please type your query in Devanagari or use Hindi voice.",
    ttsNotice: "Voice playback not yet available in Dogri.",
  },
  {
    code: "mni",
    name: "Manipuri (Meitei)",
    nativeName: "মৈতৈলোন্ / ꯃꯤꯇꯩꯂꯣꯟ",
    bcp47: "mni-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "en",
    voiceNotice: "Meiteilon voice recognition is not supported in this browser. Please type your query.",
    ttsNotice: "Voice playback not yet available in Manipuri.",
  },
  {
    code: "brx",
    name: "Bodo",
    nativeName: "बर'",
    bcp47: "brx-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "as",
    voiceNotice: "Bodo voice recognition is currently in preview. Please use text input or Assamese voice.",
    ttsNotice: "Voice playback not yet available in Bodo.",
  },
  {
    code: "sa",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
    bcp47: "sa-IN",
    tier: 2,
    voiceInputSupported: false,
    ttsAvailable: false,
    generationQuality: "assisted",
    fallbackLanguage: "hi",
    voiceNotice: "Sanskrit speech input is not supported by standard browser speech engines. Please type your query.",
    ttsNotice: "Voice playback not yet available in Sanskrit.",
  },
];

export const LANGUAGES: LanguageConfig[] = SUPPORTED_LANGUAGES.map((l) => ({
  code: l.code,
  native_name: l.nativeName,
  english_name: l.name,
  speech_locale: l.bcp47,
  dir: l.code === "ur" || l.code === "ks" || l.code === "sd" ? "rtl" : "ltr",
  tier: l.tier,
  voice_input_supported: l.voiceInputSupported,
  tts_available: l.ttsAvailable,
}));

export const LANGUAGE_NAMES: Record<Language, string> = SUPPORTED_LANGUAGES.reduce(
  (acc, curr) => {
    acc[curr.code] = curr.nativeName;
    return acc;
  },
  {} as Record<Language, string>
);
