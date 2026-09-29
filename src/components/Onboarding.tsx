import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { ALL_INDIA_STATES } from "../data/indiaData";
import { Language, SUPPORTED_LANGUAGES } from "../types";
import { setAppLanguage } from "../i18n";
import {
  MapPin,
  Globe,
  CheckCircle,
  Sparkles,
  ChevronRight,
  LayoutGrid,
  ShieldAlert,
  ArrowDown,
  Activity,
  Search,
  Bot,
  Zap,
} from "lucide-react";
import { lightTheme, darkTheme } from "../theme";

interface OnboardingProps {
  selectedLanguage: Language;
  setSelectedLanguage: (lang: Language) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  onComplete: () => void;
  isDarkMode?: boolean;
}

export default function Onboarding({
  selectedLanguage,
  setSelectedLanguage,
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  onComplete,
  isDarkMode = false,
}: OnboardingProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Active state object
  const activeStateObj = useMemo(() => {
    return (
      ALL_INDIA_STATES.find(
        (s) => s.name.toLowerCase() === selectedState.toLowerCase()
      ) || ALL_INDIA_STATES[0]
    );
  }, [selectedState]);

  // Filtered states based on search query
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return ALL_INDIA_STATES;
    const query = stateSearch.toLowerCase().trim();
    return ALL_INDIA_STATES.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.state_code.toLowerCase().includes(query)
    );
  }, [stateSearch]);

  // Districts for current active state
  const districts = useMemo(() => {
    return activeStateObj ? activeStateObj.districts : [];
  }, [activeStateObj]);

  // Filtered districts based on search query
  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return districts;
    const query = districtSearch.toLowerCase().trim();
    return districts.filter((d) => d.name.toLowerCase().includes(query));
  }, [districts, districtSearch]);

  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    const stateObj = ALL_INDIA_STATES.find((s) => s.name === stateName);
    if (stateObj && stateObj.districts.length > 0) {
      setSelectedDistrict(stateObj.districts[0].name);
    } else {
      setSelectedDistrict("");
    }
    setDistrictSearch("");
  };

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLanguage(lang);
    setAppLanguage(lang);
  };

  const activeDistrictObj = useMemo(() => {
    return (
      districts.find(
        (d) => d.name.toLowerCase() === selectedDistrict.toLowerCase()
      ) || districts[0]
    );
  }, [districts, selectedDistrict]);

  return (
    <div className="space-y-10 sm:space-y-16 py-2 sm:py-6 w-full min-w-0" id="onboarding-page-root">
      {/* 1. Community Hero High-Contrast Display Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-4 sm:space-y-6 max-w-4xl mx-auto pt-2 sm:pt-6 px-1"
        id="hero-section"
      >
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800/60 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 fill-current text-purple-600 dark:text-purple-400" />
          <span>{t("hero.badge")}</span>
        </div>

        <h1 className="civic-hero-title text-[#18181b] dark:text-white text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
          Empowering Indian Agriculture with{" "}
          <span className="gradient-headline block sm:inline">Autonomous Intelligence</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-[#71717a] dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal px-2">
          {t("hero.subheadline")}
        </p>

        <div className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-lg mx-auto">
          <motion.button
            id="hero-cta-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const el = document.getElementById("onboarding-card");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`${theme.primaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] xl:min-h-[60px] w-full xs:w-auto text-xs sm:text-sm md:text-base px-5 sm:px-6 md:px-8 lg:px-9 py-2.5 sm:py-3 md:py-3.5 lg:py-4 gap-2 sm:gap-2.5 font-bold`}
          >
            <span>{t("hero.configureFarm")}</span>
            <ArrowDown className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onComplete()}
            className={`${theme.secondaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] xl:min-h-[60px] w-full xs:w-auto text-xs sm:text-sm md:text-base px-5 sm:px-6 md:px-8 lg:px-9 py-2.5 sm:py-3 md:py-3.5 lg:py-4 font-bold`}
          >
            <span>{t("hero.exploreDemo")}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Product Live Telemetry Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl mx-auto px-0 sm:px-2 w-full min-w-0"
        id="hero-preview-frame"
      >
        <div className="glass-panel p-3.5 sm:p-5 rounded-2xl shadow-[0_12px_36px_-10px_rgba(16,24,40,0.1)]">
          <div className="bg-[#f8f9fa] dark:bg-[#141418] border border-[#e7e7ea] dark:border-zinc-800 rounded-xl p-3.5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#e7e7ea] dark:border-zinc-800 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                <span className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-200 pl-1 truncate max-w-[220px] sm:max-w-none">
                  {t("hero.previewTitle")} • {selectedDistrict}, {selectedState}
                </span>
              </div>
              <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t("hero.telemetryActive")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white dark:bg-[#18181c] p-3.5 rounded-xl border border-[#e7e7ea] dark:border-zinc-800 text-left">
                <span className="text-[11px] text-[#71717a] dark:text-zinc-400 uppercase font-bold block mb-1">
                  {t("hero.vegetationHealth")}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
                  {activeDistrictObj?.ndviValue || 0.72} (Optimal)
                </span>
              </div>
              <div className="bg-white dark:bg-[#18181c] p-3.5 rounded-xl border border-[#e7e7ea] dark:border-zinc-800 text-left">
                <span className="text-[11px] text-[#71717a] dark:text-zinc-400 uppercase font-bold block mb-1">
                  {t("hero.soilCondition")}
                </span>
                <span className="text-[#18181b] dark:text-white font-bold text-sm sm:text-base">
                  pH {activeDistrictObj?.ph || 7.2} • {activeDistrictObj?.soilType || "Alluvial"}
                </span>
              </div>
              <div className="bg-white dark:bg-[#18181c] p-3.5 rounded-xl border border-[#e7e7ea] dark:border-zinc-800 text-left">
                <span className="text-[11px] text-[#71717a] dark:text-zinc-400 uppercase font-bold block mb-1">
                  {t("hero.languageOutput")}
                </span>
                <span className="text-[#18181b] dark:text-white font-bold text-sm sm:text-base">
                  {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.nativeName} • Voice TTS
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Onboarding Selector Card (Stacked on mobile, side-by-side card on tablet/desktop) */}
      <div className="max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full min-w-0" id="onboarding-card">
        <div className={`${theme.card} p-4 sm:p-6 md:p-8 space-y-6 shadow-md`}>
          <div className="flex justify-between items-center border-b pb-4 border-[#e7e7ea] dark:border-zinc-800">
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#18181b] dark:text-white">
                {step === 1 ? t("onboarding.step1Title") : t("onboarding.step2Title")}
              </h2>
              <p className="text-xs text-[#71717a] dark:text-zinc-400 font-medium">
                {t("onboarding.stepOf", { current: step, total: 2 })}
              </p>
            </div>
            <div className="flex space-x-1.5">
              <span
                className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                  step === 1 ? "bg-[#2563eb]" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              ></span>
              <span
                className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                  step === 2 ? "bg-[#2563eb]" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              ></span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
                id="step-language"
              >
                {/* Responsive Language Selection Grid: 2 cols on mobile, 3 cols on tablet/desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 xs:gap-2.5 sm:gap-3" id="language-grid">
                  {SUPPORTED_LANGUAGES.map((langConfig) => {
                    const isSelected = selectedLanguage === langConfig.code;
                    return (
                      <button
                        key={langConfig.code}
                        id={`lang-btn-${langConfig.code}`}
                        onClick={() => handleLanguageSelect(langConfig.code as Language)}
                        className={`min-h-[48px] xs:min-h-[52px] sm:min-h-[56px] p-2 xs:p-2.5 sm:p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-center ${
                          isSelected
                            ? "border-[#2563eb] bg-[#eff4ff] dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-300 font-bold ring-2 ring-blue-500/20 shadow-2xs"
                            : "border-[#e7e7ea] dark:border-zinc-800 bg-white dark:bg-[#141418] hover:border-[#d4d4d8] dark:hover:border-zinc-700 text-[#18181b] dark:text-zinc-200 font-medium"
                        }`}
                      >
                        <div className="text-xs xs:text-sm font-bold text-[#18181b] dark:text-white leading-tight truncate">
                          {langConfig.nativeName}
                        </div>
                        <div className="text-[10px] xs:text-xs text-[#71717a] dark:text-zinc-400 font-semibold mt-0.5 truncate">
                          {langConfig.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  id="lang-continue-btn"
                  onClick={() => {
                    setStep(2);
                    const el = document.getElementById("onboarding-card");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`${theme.primaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] w-full text-xs sm:text-sm md:text-base font-bold gap-2 py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6`}
                >
                  <span>{t("onboarding.continue")}</span>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
                id="step-location"
              >
                {/* Coverage summary banner */}
                <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#eff4ff] dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs font-semibold text-[#18181b] dark:text-zinc-200 gap-1.5">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {t("onboarding.allStatesCount")}
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                    ICAR Grounded
                  </span>
                </div>

                {/* Selectors: Stacked vertically on mobile, side-by-side on tablet/desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* State selector with live filter search */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="state-select"
                      className="block text-xs font-bold text-[#18181b] dark:text-zinc-200 uppercase tracking-wider"
                    >
                      {t("onboarding.stateLabel")} ({ALL_INDIA_STATES.length})
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t("onboarding.statePlaceholder")}
                        value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                        className={`${theme.input} min-h-[44px] text-xs py-2.5 pl-8 pr-2`}
                        aria-label="Filter state list"
                      />
                      <Search className="w-3.5 h-3.5 text-[#a1a1aa] absolute left-2.5 top-3.5" />
                    </div>

                    <select
                      id="state-select"
                      value={selectedState}
                      onChange={(e) => handleStateChange(e.target.value)}
                      size={5}
                      className={`${theme.input} cursor-pointer text-xs h-36 overflow-y-auto w-full`}
                      aria-label="Select state"
                    >
                      {filteredStates.map((s) => (
                        <option key={s.id} value={s.name} className="py-1.5 px-2">
                          {s.name} ({s.districts.length} {t("onboarding.districtLabel")})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District selector with live filter search */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="district-select"
                      className="block text-xs font-bold text-[#18181b] dark:text-zinc-200 uppercase tracking-wider"
                    >
                      {t("onboarding.districtLabel")} ({districts.length})
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t("onboarding.districtPlaceholder")}
                        value={districtSearch}
                        onChange={(e) => setDistrictSearch(e.target.value)}
                        className={`${theme.input} min-h-[44px] text-xs py-2.5 pl-8 pr-2`}
                        aria-label="Filter district list"
                      />
                      <Search className="w-3.5 h-3.5 text-[#a1a1aa] absolute left-2.5 top-3.5" />
                    </div>

                    <select
                      id="district-select"
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      size={5}
                      className={`${theme.input} cursor-pointer text-xs h-36 overflow-y-auto w-full`}
                      disabled={districts.length === 0}
                      aria-label="Select district"
                    >
                      {filteredDistricts.map((d) => (
                        <option key={d.id} value={d.name} className="py-1.5 px-2">
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected district ICAR telemetry preview */}
                {activeStateObj && activeDistrictObj && (
                  <div
                    className={`${theme.cardSecondary} p-3.5 sm:p-4 space-y-2.5 transition-colors duration-200`}
                    id="district-preview"
                  >
                    <span className="text-[11px] font-bold text-[#18181b] dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">
                        {t("onboarding.verifiedIcarZone")} • {activeDistrictObj.name}, {activeStateObj.name}
                      </span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-semibold">
                          {t("onboarding.agroClimaticZone")}:
                        </span>
                        <span className="font-bold text-[#18181b] dark:text-white truncate block">
                          {activeDistrictObj.agroClimaticZone || "General Plains"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-semibold">
                          {t("onboarding.soilClassification")}:
                        </span>
                        <span className="font-bold text-[#18181b] dark:text-white truncate block">
                          {activeDistrictObj.soilType || "Alluvial Soil"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-semibold">
                          {t("onboarding.phOrganicCarbon")}:
                        </span>
                        <span className="font-bold text-[#18181b] dark:text-white block">
                          pH {activeDistrictObj.ph || 7.0} • {activeDistrictObj.organicCarbon || 0.5}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#71717a] dark:text-zinc-400 font-semibold">
                          {t("onboarding.ndviVegetationHealth")}:
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                          {activeDistrictObj.ndviValue || 0.65}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col xs:flex-row space-y-2.5 xs:space-y-0 xs:space-x-3 sm:space-x-4 pt-3">
                  <button
                    id="location-back-btn"
                    onClick={() => {
                      setStep(1);
                      const el = document.getElementById("onboarding-card");
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`${theme.secondaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] flex-1 text-xs sm:text-sm md:text-base font-bold py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6`}
                  >
                    {t("onboarding.back")}
                  </button>
                  <button
                    id="onboarding-complete-btn"
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                      onComplete();
                    }}
                    className={`${theme.primaryButton} min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] flex-1 text-xs sm:text-sm md:text-base font-bold gap-2 py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6`}
                  >
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>{t("onboarding.enterPortal")}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Secondary Feature Grid (1 col on mobile, 2 on tablet, 4 on desktop) */}
      <div
        className="max-w-6xl mx-auto pt-8 border-t border-[#e7e7ea] dark:border-zinc-800"
        id="secondary-feature-grid"
      >
        <div className="text-center space-y-2 mb-8 sm:mb-10 px-2">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#18181b] dark:text-white">
            {t("onboarding.featureTitle")}
          </h3>
          <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 font-medium max-w-md mx-auto">
            {t("onboarding.featureSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className={`${theme.card} p-5 sm:p-6 space-y-3`}>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50 shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-[#18181b] dark:text-white">
              {t("onboarding.feature1Title")}
            </h4>
            <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 leading-relaxed font-normal">
              {t("onboarding.feature1Desc")}
            </p>
          </div>

          <div className={`${theme.card} p-5 sm:p-6 space-y-3`}>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800/50 shadow-2xs">
              <Globe className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-[#18181b] dark:text-white">
              {t("onboarding.feature2Title")}
            </h4>
            <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 leading-relaxed font-normal">
              {t("onboarding.feature2Desc")}
            </p>
          </div>

          <div className={`${theme.card} p-5 sm:p-6 space-y-3`}>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/50 shadow-2xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-[#18181b] dark:text-white">
              {t("onboarding.feature3Title")}
            </h4>
            <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 leading-relaxed font-normal">
              {t("onboarding.feature3Desc")}
            </p>
          </div>

          <div className={`${theme.card} p-5 sm:p-6 space-y-3`}>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50 shadow-2xs">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-[#18181b] dark:text-white">
              {t("onboarding.feature4Title")}
            </h4>
            <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-300 leading-relaxed font-normal">
              {t("onboarding.feature4Desc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
