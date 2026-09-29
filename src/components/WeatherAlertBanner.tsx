import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Language, SevereWeatherAlert } from "../types";
import { fetchDistrictRealtimeWeatherAlert } from "../data/weatherAlertService";
import {
  CloudRain,
  CloudLightning,
  Sun,
  Flame,
  Wind,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Droplets,
  Thermometer,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MapPin,
  Radio,
  Volume2,
  Square,
  Sparkles,
  Info,
  Calendar,
  Layers,
} from "lucide-react";

interface WeatherAlertBannerProps {
  district: string;
  state: string;
  language: Language;
  isDarkMode?: boolean;
}

export default function WeatherAlertBanner({
  district,
  state,
  language,
  isDarkMode = false,
}: WeatherAlertBannerProps) {
  const { t } = useTranslation();
  const [alertData, setAlertData] = useState<SevereWeatherAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<"actions" | "forecast">("actions");

  const loadWeatherAlert = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const data = await fetchDistrictRealtimeWeatherAlert(district, state, language);
      setAlertData(data);
      // Auto-expand if critical or warning
      if (data.severity === "critical" || data.severity === "warning") {
        setIsExpanded(true);
      }
    } catch (err) {
      console.warn("Weather alert fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherAlert();
  }, [district, state, language]);

  // Audio readout using speech synthesis
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    if (!alertData || typeof window === "undefined" || !window.speechSynthesis) return;

    const speechText = `${alertData.title}. ${alertData.headline}. ${alertData.agronomicAdvisory}. ${alertData.actions?.join(". ") || ""}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : language === "ta" ? "ta-IN" : language === "pa" ? "pa-IN" : "en-IN";
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  if (!alertData && loading) {
    return (
      <div className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 animate-pulse flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-300 dark:bg-zinc-700" />
          <div className="space-y-1.5">
            <div className="w-48 h-4 rounded bg-zinc-300 dark:bg-zinc-700" />
            <div className="w-32 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="w-24 h-8 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
      </div>
    );
  }

  if (!alertData) return null;

  const isCritical = alertData.severity === "critical";
  const isWarning = alertData.severity === "warning";
  const isAdvisory = alertData.severity === "advisory";
  const isNormal = alertData.severity === "normal";

  // Color theming based on severity
  let bannerBg = "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60";
  let badgeColor = "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700";
  let titleColor = "text-emerald-950 dark:text-emerald-100";
  let iconBg = "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300";

  if (isCritical) {
    bannerBg = "bg-gradient-to-r from-rose-50 via-rose-100/50 to-orange-50 dark:from-rose-950/50 dark:via-rose-900/30 dark:to-orange-950/40 border-rose-300 dark:border-rose-800/80 shadow-md shadow-rose-500/5";
    badgeColor = "bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 animate-pulse";
    titleColor = "text-rose-950 dark:text-rose-100";
    iconBg = "bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300";
  } else if (isWarning) {
    bannerBg = "bg-gradient-to-r from-amber-50 via-amber-100/40 to-orange-50 dark:from-amber-950/50 dark:via-amber-900/30 dark:to-orange-950/40 border-amber-300 dark:border-amber-800/80 shadow-xs";
    badgeColor = "bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700";
    titleColor = "text-amber-950 dark:text-amber-100";
    iconBg = "bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300";
  } else if (isAdvisory) {
    bannerBg = "bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/60";
    badgeColor = "bg-blue-100 dark:bg-blue-900/80 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700";
    titleColor = "text-blue-950 dark:text-blue-100";
    iconBg = "bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300";
  }

  const renderWeatherIcon = () => {
    switch (alertData.alertType) {
      case "heatwave":
        return <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400 animate-bounce" />;
      case "heavy_rain":
        return <CloudRain className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />;
      case "thunderstorm":
      case "hailstorm":
        return <CloudLightning className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 animate-pulse" />;
      case "high_winds":
        return <Wind className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />;
      case "cold_wave":
      case "frost":
        return <Snowflake className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600 dark:text-sky-400" />;
      default:
        return <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      id="realtime-weather-alert-banner"
      className={`w-full rounded-2xl border transition-all duration-200 overflow-hidden ${bannerBg}`}
      aria-label="Real-time Severe Weather Alert"
    >
      {/* Banner Header Strip */}
      <div className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Icon + Title & Location */}
        <div className="flex items-start sm:items-center space-x-3 sm:space-x-3.5 min-w-0">
          <div
            className={`p-2 sm:p-2.5 rounded-xl shrink-0 flex items-center justify-center shadow-2xs ${iconBg}`}
          >
            {renderWeatherIcon()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                {isCritical
                  ? "🚨 SEVERE WEATHER ALERT"
                  : isWarning
                  ? "⚠️ WEATHER WARNING"
                  : isAdvisory
                  ? "ℹ️ WEATHER ADVISORY"
                  : "🌱 OPEN-METEO LIVE OUTLOOK"}
              </span>

              <span className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200/80 dark:border-zinc-700">
                <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {alertData.district}, {alertData.state}
                </span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse shrink-0" />
                Live Feed ({alertData.updatedAt})
              </span>
            </div>

            <h3 className={`text-sm sm:text-base lg:text-lg font-black tracking-tight leading-tight ${titleColor}`}>
              {alertData.title}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5 line-clamp-2">
              {alertData.headline}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          {/* Audio Broadcast Button */}
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border shadow-2xs ${
              isPlayingAudio
                ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                : "bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
            }`}
            title="Listen to Weather Broadcast"
            aria-label="Listen to weather alert broadcast"
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden xs:inline">Listen</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadWeatherAlert(true)}
            disabled={loading}
            className="min-h-[38px] p-2 sm:px-2.5 rounded-xl bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
            title="Refresh Live Weather from Open-Meteo"
            aria-label="Refresh live weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Accordion Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="min-h-[38px] p-2 sm:px-3 rounded-xl bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse weather advisory details" : "Expand weather advisory details"}
          >
            <span className="text-xs font-bold hidden xs:inline">
              {isExpanded ? "Hide Details" : "View Advisory"}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Telemetry Sensor Bar (Always Visible) */}
      <div className="px-3.5 sm:px-5 pb-3.5 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
        <div className="bg-white/70 dark:bg-zinc-900/60 p-2 sm:p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center space-x-2">
          <Thermometer className="w-4 h-4 text-rose-500 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">
              Temperature
            </span>
            <span className="font-extrabold text-zinc-900 dark:text-white">
              {alertData.metrics.currentTemp}°C
              <span className="text-[10px] font-normal text-zinc-500 ml-1">
                ({alertData.metrics.minTemp}°-{alertData.metrics.maxTemp}°)
              </span>
            </span>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-zinc-900/60 p-2 sm:p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center space-x-2">
          <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">
              24h Rain
            </span>
            <span className="font-extrabold text-zinc-900 dark:text-white">
              {alertData.metrics.precipitationSum} mm
            </span>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-zinc-900/60 p-2 sm:p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center space-x-2">
          <Wind className="w-4 h-4 text-teal-500 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">
              Wind Gusts
            </span>
            <span className="font-extrabold text-zinc-900 dark:text-white">
              {alertData.metrics.windGusts} km/h
            </span>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-zinc-900/60 p-2 sm:p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center space-x-2">
          <Droplets className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">
              Humidity
            </span>
            <span className="font-extrabold text-zinc-900 dark:text-white">
              {alertData.metrics.humidity}%
            </span>
          </div>
        </div>

        <div className="col-span-2 xs:col-span-1 bg-white/70 dark:bg-zinc-900/60 p-2 sm:p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center space-x-2">
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">
              Condition
            </span>
            <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
              {alertData.metrics.weatherCondition || "Clear"}
            </span>
          </div>
        </div>
      </div>

      {/* Collapsible Actionable Agronomic Plan & 7-Day Outlook */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 p-3.5 sm:p-5 space-y-4"
          >
            {/* Tab switch between ICAR agronomic actions & 7-day forecast */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5 p-1 bg-white/90 dark:bg-zinc-800/90 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setActiveTab("actions")}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === "actions"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Immediate Action Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("forecast")}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === "forecast"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>7-Day Severe Outlook</span>
                </button>
              </div>

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>ICAR Agrometeorological Protocol</span>
              </div>
            </div>

            {/* Tab 1: Emergency Field Actions */}
            {activeTab === "actions" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                  <span className="font-black text-blue-600 dark:text-blue-400 block mb-1">
                    🌾 Agronomic Impact Advisory:
                  </span>
                  {alertData.agronomicAdvisory}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {alertData.actions?.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-start space-x-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="leading-snug">{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: 7-Day Meteorological Outlook */}
            {activeTab === "forecast" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {alertData.dailyForecast?.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      day.isSevere
                        ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800"
                        : "bg-white/80 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase block">
                      {idx === 0 ? "Today" : day.dayName}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mb-1">
                      {day.date.slice(5)}
                    </span>

                    <div className="my-1">
                      <span className="text-sm font-black text-zinc-900 dark:text-white">
                        {day.maxTemp}°
                      </span>
                      <span className="text-xs text-zinc-500 ml-1">
                        {day.minTemp}°
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold truncate mb-1">
                      {day.conditionText}
                    </div>

                    {day.precipitationSum > 0 && (
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5" />
                        <span>{day.precipitationSum}mm</span>
                      </div>
                    )}

                    {day.isSevere && (
                      <span className="mt-1 inline-block text-[9px] font-extrabold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded-full">
                        {day.severeReason || "Severe Alert"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Source citation */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <span>Data source: Open-Meteo High-Resolution NWP & Satellite Model</span>
              <span>Updated automatically every 15 minutes</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
