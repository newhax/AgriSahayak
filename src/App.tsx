import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import Onboarding from "./components/Onboarding";
import Advisory from "./components/Advisory";
import DiseaseDiagnosis from "./components/DiseaseDiagnosis";
import Dashboard from "./components/Dashboard";
import FloatingCopilot from "./components/FloatingCopilot";
import FarmerFriendChat from "./components/FarmerFriendChat";
import { Language, SUPPORTED_LANGUAGES } from "./types";
import { setAppLanguage } from "./i18n";
import { getFriendLocalization } from "./data/friendLocalization";
import {
  MapPin,
  RefreshCw,
  Sun,
  Moon,
  ArrowRight,
  Sprout,
  Globe,
  Menu,
  X,
  Sparkles,
  Layers,
  Activity,
  Stethoscope,
  MessageSquare,
  Smile,
} from "lucide-react";
import { lightTheme, darkTheme } from "./theme";

export default function App() {
  const { t, i18n } = useTranslation();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("agrisahayak_language_chosen") === "true";
    }
    return false;
  });
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    (i18n.language as Language) || "hi"
  );
  const [selectedState, setSelectedState] = useState("Punjab");
  const [selectedDistrict, setSelectedDistrict] = useState("Ludhiana");
  const [activeTab, setActiveTab] = useState<"advisory" | "diagnosis" | "dashboard" | "friend">("advisory");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync i18n language changes with local state
  useEffect(() => {
    if (i18n.language && i18n.language !== selectedLanguage) {
      setSelectedLanguage(i18n.language as Language);
    }
  }, [i18n.language]);

  // Sync theme with document element class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    setSelectedLanguage(newLang);
    setAppLanguage(newLang);
    setHasSelectedLanguage(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("agrisahayak_language_chosen", "true");
    }
  };

  const handleSelectTab = (tab: "advisory" | "diagnosis" | "dashboard" | "friend") => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Navigate to home / advisory tab and scroll to top
  const handleGoHome = () => {
    setActiveTab("advisory");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset onboarding
  const handleResetProfile = () => {
    setIsOnboarded(false);
    setIsMobileMenuOpen(false);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col font-sans transition-colors duration-200 antialiased relative w-full overflow-x-hidden`}
      id="app-root"
    >
      {/* Top Floating Island Navigation Bar */}
      <header
        className="sticky top-0 z-50 px-2.5 sm:px-4 md:px-8 py-2 sm:py-3 transition-colors duration-200 w-full"
        id="main-header"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between glass-island-nav px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-2xl shadow-xs gap-2 lg:gap-3">
          {/* Brand Wordmark - Click takes user back to home/advisory view */}
          <button
            type="button"
            className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group shrink-0 text-left bg-transparent border-0 p-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            onClick={handleGoHome}
            title={t("nav.title")}
            aria-label={`${t("nav.title")} - Home`}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:shadow-md transition-all shrink-0">
              <Sprout className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="hidden md:flex items-baseline space-x-1.5 sm:space-x-2">
              <span className="text-sm lg:text-base font-black tracking-tight text-[#18181b] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
                {t("nav.title")}
              </span>
              <span className="hidden xl:inline-block text-[10px] text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                {t("nav.dpg")}
              </span>
            </div>
          </button>

          {/* Desktop Navigation Tabs (Visible on md breakpoint and above with responsive padding) */}
          {isOnboarded ? (
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5" id="desktop-nav-tabs">
              <button
                id="nav-tab-advisory"
                onClick={() => handleSelectTab("advisory")}
                className={`min-h-[40px] lg:min-h-[44px] px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  activeTab === "advisory"
                    ? "bg-[#2563eb] text-white shadow-2xs"
                    : "text-[#71717a] dark:text-zinc-300 hover:text-[#18181b] dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>{t("nav.advisory")}</span>
              </button>
              <button
                id="nav-tab-diagnosis"
                onClick={() => handleSelectTab("diagnosis")}
                className={`min-h-[40px] lg:min-h-[44px] px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  activeTab === "diagnosis"
                    ? "bg-[#2563eb] text-white shadow-2xs"
                    : "text-[#71717a] dark:text-zinc-300 hover:text-[#18181b] dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>{t("nav.diagnosis")}</span>
              </button>
              <button
                id="nav-tab-dashboard"
                onClick={() => handleSelectTab("dashboard")}
                className={`min-h-[40px] lg:min-h-[44px] px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  activeTab === "dashboard"
                    ? "bg-[#2563eb] text-white shadow-2xs"
                    : "text-[#71717a] dark:text-zinc-300 hover:text-[#18181b] dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>{t("nav.outbreaks")}</span>
              </button>
              <button
                id="nav-tab-friend"
                onClick={() => handleSelectTab("friend")}
                className={`min-h-[40px] lg:min-h-[44px] px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  activeTab === "friend"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-[#71717a] dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
                title={getFriendLocalization(selectedLanguage).friendName}
              >
                <span className="text-sm">👨‍🌾</span>
                <span className="whitespace-nowrap">
                  {getFriendLocalization(selectedLanguage).friendName}
                </span>
                <span className="hidden xl:inline-block text-[9px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                  {getFriendLocalization(selectedLanguage).friendBadge}
                </span>
              </button>
            </nav>
          ) : (
            <div className="hidden lg:flex items-center space-x-6 text-xs text-[#71717a] dark:text-zinc-300 font-semibold">
              <span>{t("nav.autonomousAdvisory")}</span>
              <span>{t("nav.multimodalDiagnosis")}</span>
              <span>{t("nav.icarGrounding")}</span>
            </div>
          )}

          {/* Header Controls: Language Switcher, Theme & Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-2.5 shrink-0">
            {/* Global Language Selector Dropdown (Hidden once a language is selected) */}
            {!hasSelectedLanguage && !isOnboarded && (
              <div className="relative flex items-center">
                <label
                  htmlFor="global-lang-selector"
                  className="min-h-[40px] lg:min-h-[44px] flex items-center space-x-1.5 sm:space-x-2 bg-white dark:bg-zinc-800/95 px-2.5 sm:px-3 py-1.5 rounded-full border border-[#e7e7ea] dark:border-zinc-700 text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-200 shadow-2xs cursor-pointer hover:border-[#d4d4d8] dark:hover:border-zinc-600 transition-colors shrink-0"
                >
                  <Globe className="w-4 h-4 text-[#2563eb] dark:text-blue-400 shrink-0" />
                  <select
                    id="global-lang-selector"
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value as Language)}
                    className="bg-transparent text-xs sm:text-sm font-bold focus:outline-none cursor-pointer text-[#18181b] dark:text-white max-w-[64px] xs:max-w-[78px] sm:max-w-none pr-1"
                    title="Switch Language / भाषा बदलें"
                    aria-label="Select language"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option
                        key={l.code}
                        value={l.code}
                        className="bg-white dark:bg-zinc-900 text-[#18181b] dark:text-white py-1"
                      >
                        {l.nativeName} ({l.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              id="theme-toggle-btn"
              className="min-h-[40px] min-w-[40px] lg:min-h-[44px] lg:min-w-[44px] p-2 lg:p-2.5 rounded-full border border-[#e7e7ea] dark:border-zinc-700 bg-white dark:bg-zinc-800/95 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-[#18181b] dark:text-zinc-200 transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-900 shrink-0" />
              )}
            </button>

            {/* Farm Profile / Get Started Actions */}
            {isOnboarded ? (
              <div className="flex items-center space-x-1 sm:space-x-1.5" id="header-profile">
                {/* Active location tag (Visible on lg and above) */}
                <div className="hidden lg:flex items-center space-x-1.5 text-xs bg-[#eff4ff] dark:bg-blue-950/60 px-2.5 lg:px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800/60 font-bold text-[#2563eb] dark:text-blue-300 shadow-2xs min-h-[40px] shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400 shrink-0" />
                  <span className="truncate max-w-[80px] xl:max-w-[120px]">
                    {selectedDistrict}
                  </span>
                </div>

                {/* Reset Farm Profile Button */}
                <button
                  id="reset-profile-btn"
                  onClick={handleResetProfile}
                  className={`${theme.secondaryButton} min-h-[40px] text-xs px-2.5 lg:px-3 py-1.5 gap-1.5 shrink-0`}
                  title={t("nav.changeFarm")}
                  aria-label="Change farm location"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#71717a] dark:text-zinc-300 shrink-0" />
                  <span className="hidden xl:inline">{t("nav.changeFarm")}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const el = document.getElementById("onboarding-card");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`${theme.primaryButton} min-h-[40px] lg:min-h-[44px] text-xs sm:text-sm px-3.5 sm:px-5 py-1.5 sm:py-2 gap-1.5 shrink-0`}
              >
                <span>{t("nav.getStarted")}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}

            {/* Mobile Navigation Hamburger Toggle (Visible below md) */}
            {isOnboarded && (
              <button
                id="mobile-menu-toggle-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden min-h-[44px] min-w-[44px] sm:min-h-[46px] sm:min-w-[46px] p-2.5 rounded-full border border-[#e7e7ea] dark:border-zinc-700 bg-white dark:bg-zinc-800/95 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-[#18181b] dark:text-zinc-200 transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open navigation menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-rose-500" />
                ) : (
                  <Menu className="w-5 h-5 text-[#18181b] dark:text-white" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Mobile Navigation Drawer / Menu */}
        <AnimatePresence>
          {isOnboarded && isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden max-w-7xl mx-auto mt-2 overflow-hidden"
              id="mobile-drawer-menu"
            >
              <div className="glass-panel p-3.5 rounded-2xl space-y-2 shadow-lg border border-[#e7e7ea] dark:border-zinc-800">
                {/* Current Location Badge on Mobile Drawer */}
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs font-bold text-[#2563eb] dark:text-blue-300">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {selectedDistrict}, {selectedState}
                  </span>
                  <button
                    onClick={handleResetProfile}
                    className="text-[11px] underline text-blue-600 dark:text-blue-400 font-semibold shrink-0 cursor-pointer min-h-[32px] px-2 flex items-center"
                  >
                    {t("nav.changeFarm")}
                  </button>
                </div>

                {/* Mobile Tab Links (All min-h-[44px] touch targets) */}
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  <button
                    onClick={() => handleSelectTab("friend")}
                    className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      activeTab === "friend"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-[#18181b] dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">👨‍🌾</span>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        {getFriendLocalization(selectedLanguage).friendName}
                      </span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      {getFriendLocalization(selectedLanguage).friendBadge}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectTab("advisory")}
                    className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      activeTab === "advisory"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "text-[#18181b] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {t("nav.advisory")}
                    </span>
                    <span className="text-[10px] opacity-75 font-semibold">Autonomous Advisory</span>
                  </button>

                  <button
                    onClick={() => handleSelectTab("diagnosis")}
                    className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      activeTab === "diagnosis"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "text-[#18181b] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      {t("nav.diagnosis")}
                    </span>
                    <span className="text-[10px] opacity-75 font-semibold">Multimodal AI Vision</span>
                  </button>

                  <button
                    onClick={() => handleSelectTab("dashboard")}
                    className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      activeTab === "dashboard"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "text-[#18181b] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {t("nav.outbreaks")}
                    </span>
                    <span className="text-[10px] opacity-75 font-semibold">Early Warning System</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Horizontal Tab Bar for Mobile & Tablet (Always 1-tap accessible & fluid on phones with 44px min target) */}
        {isOnboarded && !isMobileMenuOpen && (
          <div
            className="md:hidden flex max-w-7xl mx-auto mt-2 p-1.5 glass-island-nav rounded-xl overflow-x-auto no-scrollbar justify-between gap-1.5"
            id="mobile-quick-tabs"
          >
            <button
              onClick={() => handleSelectTab("friend")}
              className={`min-h-[44px] sm:min-h-[48px] flex-1 py-2 px-1.5 xs:px-2.5 text-xs font-bold text-center whitespace-nowrap rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === "friend"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <span className="text-sm">👨‍🌾</span>
              <span>{getFriendLocalization(selectedLanguage).friendBadge}</span>
            </button>
            <button
              onClick={() => handleSelectTab("advisory")}
              className={`min-h-[44px] sm:min-h-[48px] flex-1 py-2 px-1.5 xs:px-2.5 text-xs font-bold text-center whitespace-nowrap rounded-lg cursor-pointer transition-all shrink-0 ${
                activeTab === "advisory"
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-[#71717a] dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
              }`}
            >
              {t("nav.advisory")}
            </button>
            <button
              onClick={() => handleSelectTab("diagnosis")}
              className={`min-h-[44px] sm:min-h-[48px] flex-1 py-2 px-1.5 xs:px-2.5 text-xs font-bold text-center whitespace-nowrap rounded-lg cursor-pointer transition-all shrink-0 ${
                activeTab === "diagnosis"
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-[#71717a] dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
              }`}
            >
              {t("nav.diagnosis")}
            </button>
            <button
              onClick={() => handleSelectTab("dashboard")}
              className={`min-h-[44px] sm:min-h-[48px] flex-1 py-2 px-1.5 xs:px-2.5 text-xs font-bold text-center whitespace-nowrap rounded-lg cursor-pointer transition-all shrink-0 ${
                activeTab === "dashboard"
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-[#71717a] dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
              }`}
            >
              {t("nav.outbreaks")}
            </button>
          </div>
        )}
      </header>

      {/* Main App Container */}
      <main
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-10 min-w-0"
        id="main-content"
      >
        {!isOnboarded ? (
          <Onboarding
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={handleLanguageChange}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            onComplete={() => {
              setIsOnboarded(true);
              setHasSelectedLanguage(true);
              if (typeof window !== "undefined") {
                localStorage.setItem("agrisahayak_language_chosen", "true");
              }
            }}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div className="space-y-6 sm:space-y-8 w-full min-w-0" id="portal-wrapper">
            {activeTab === "friend" && (
              <FarmerFriendChat
                selectedLanguage={selectedLanguage}
                selectedState={selectedState}
                selectedDistrict={selectedDistrict}
                isDarkMode={isDarkMode}
                onNavigateTab={(tab) => handleSelectTab(tab)}
              />
            )}
            {activeTab === "advisory" && (
              <Advisory
                selectedLanguage={selectedLanguage}
                selectedState={selectedState}
                selectedDistrict={selectedDistrict}
                isDarkMode={isDarkMode}
              />
            )}
            {activeTab === "diagnosis" && (
              <DiseaseDiagnosis
                selectedLanguage={selectedLanguage}
                selectedState={selectedState}
                selectedDistrict={selectedDistrict}
                isDarkMode={isDarkMode}
              />
            )}
            {activeTab === "dashboard" && (
              <Dashboard
                selectedLanguage={selectedLanguage}
                selectedState={selectedState}
                selectedDistrict={selectedDistrict}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Copilot AI Assistant (Only shown when not on the full-screen Farmer's Friend tab to prevent overlapping UI controls) */}
      {activeTab !== "friend" && (
        <FloatingCopilot
          selectedLanguage={selectedLanguage}
          selectedState={selectedState}
          selectedDistrict={selectedDistrict}
          isDarkMode={isDarkMode}
          onNavigateTab={(tab) => handleSelectTab(tab)}
        />
      )}

      {/* Outline-inspired multi-column Footer */}
      <footer
        className={`${theme.footerBg} py-8 sm:py-12 md:py-14 transition-colors duration-200 mt-auto border-t border-[#e7e7ea] dark:border-zinc-800 w-full`}
        id="app-footer"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-8 sm:mb-12">
            {/* Col 1: Wordmark & DPG summary */}
            <div className="sm:col-span-2 space-y-3">
              <button
                type="button"
                className="flex items-center space-x-2.5 cursor-pointer group text-left bg-transparent border-0 p-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                onClick={handleGoHome}
                title={`${t("nav.title")} - Home`}
                aria-label={`${t("nav.title")} - Home`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:shadow-md transition-all shrink-0">
                  <Sprout className="w-3.5 h-3.5" />
                </div>
                <span className="font-black text-sm text-[#18181b] dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t("nav.title")}
                </span>
              </button>
              <p className="text-xs sm:text-sm text-[#71717a] dark:text-zinc-400 max-w-sm leading-relaxed font-normal">
                {t("footer.dpgStatement")}
              </p>
            </div>

            {/* Col 2: Product Navigation */}
            <div className="space-y-3 text-xs sm:text-sm">
              <span className="font-bold text-[#18181b] dark:text-white uppercase text-[11px] tracking-wider block">
                {t("nav.title")}
              </span>
              <ul className="space-y-2 text-[#71717a] dark:text-zinc-400 font-medium">
                <li>
                  <button
                    onClick={() => {
                      setIsOnboarded(true);
                      handleSelectTab("advisory");
                    }}
                    className="hover:text-[#2563eb] dark:hover:text-white transition-colors cursor-pointer min-h-[36px] flex items-center"
                  >
                    {t("nav.advisory")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setIsOnboarded(true);
                      handleSelectTab("diagnosis");
                    }}
                    className="hover:text-[#2563eb] dark:hover:text-white transition-colors cursor-pointer min-h-[36px] flex items-center"
                  >
                    {t("nav.diagnosis")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setIsOnboarded(true);
                      handleSelectTab("dashboard");
                    }}
                    className="hover:text-[#2563eb] dark:hover:text-white transition-colors cursor-pointer min-h-[36px] flex items-center"
                  >
                    {t("nav.outbreaks")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setIsOnboarded(true);
                      handleSelectTab("friend");
                    }}
                    className="hover:text-[#2563eb] dark:hover:text-white transition-colors cursor-pointer min-h-[36px] flex items-center"
                  >
                    {getFriendLocalization(selectedLanguage).friendName}
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Standards */}
            <div className="space-y-3 text-xs sm:text-sm">
              <span className="font-bold text-[#18181b] dark:text-white uppercase text-[11px] tracking-wider block">
                Standards
              </span>
              <ul className="space-y-2 text-[#71717a] dark:text-zinc-400 font-medium">
                <li>ICAR Soil Mapping (780 Districts)</li>
                <li>Open-Meteo Satellite Telemetry</li>
                <li>Multilingual Audio TTS (9 Languages)</li>
                <li>Digital Public Goods Alliance</li>
              </ul>
            </div>

            {/* Col 4: National Coverage */}
            <div className="space-y-3 text-xs sm:text-sm">
              <span className="font-bold text-[#18181b] dark:text-white uppercase text-[11px] tracking-wider block">
                Coverage
              </span>
              <ul className="space-y-2 text-[#71717a] dark:text-zinc-400 font-medium">
                <li>{t("footer.nationalCoverage")}</li>
                <li>28 States & 8 UTs</li>
                <li>Dynamic Language Parity</li>
                <li>Privacy-Preserving Anonymization</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 sm:pt-8 border-t border-[#e7e7ea] dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-[#71717a] dark:text-zinc-400 font-medium text-center sm:text-left">
            <p>© 2026 AgriSahayak. {t("footer.allRights")}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <span>Privacy & Anonymized Outbreak Logs</span>
              <span>Open Source Specification</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
