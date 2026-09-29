import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";
import bn from "./locales/bn.json";
import gu from "./locales/gu.json";
import kn from "./locales/kn.json";
import pa from "./locales/pa.json";
import ml from "./locales/ml.json";
import or from "./locales/or.json";
import as from "./locales/as.json";
import ur from "./locales/ur.json";

export const resources = {
  // Tier 1: Core Major Languages
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
  gu: { translation: gu },
  kn: { translation: kn },
  pa: { translation: pa },
  ml: { translation: ml },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur },

  // Tier 2: Linked fallback resources
  mai: { translation: hi },
  sat: { translation: hi },
  ks: { translation: ur },
  ne: { translation: hi },
  kok: { translation: mr },
  sd: { translation: hi },
  doi: { translation: hi },
  mni: { translation: en },
  brx: { translation: as },
  sa: { translation: hi },
} as const;

// Read cached language preference or default to Hindi (the lingua franca for northern/central agrarian belt)
const savedLanguage =
  typeof window !== "undefined"
    ? localStorage.getItem("agrisahayak_language") || "hi"
    : "hi";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export const setAppLanguage = (langCode: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("agrisahayak_language", langCode);
  }
  i18n.changeLanguage(langCode);
};

export default i18n;
