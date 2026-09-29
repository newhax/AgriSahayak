// Community Hero Civic Tech Design System Tokens & Helper Classes
// Precision glassmorphism, high-contrast typography, electric blue & royal violet accents.

export interface ThemeTokens {
  bg: string;
  headerBg: string;
  footerBg: string;
  card: string;
  cardSecondary: string;
  text: string;
  textHeading: string;
  textMuted: string;
  textSubMuted: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  divider: string;
  
  // Custom interactive components
  primaryButton: string;
  secondaryButton: string;
  ghostButton: string;
  input: string;
  select: string;
  accentText: string;
  accentBg: string;
  accentBadge: string;
  aiBadge: string;
  
  // States
  successBg: string;
  successText: string;
  successBorder: string;
  dangerBg: string;
  dangerText: string;
  dangerBorder: string;
  warningBg: string;
  warningText: string;
  warningBorder: string;
}

export const lightTheme: ThemeTokens = {
  bg: "ambient-canvas",
  headerBg: "glass-island-nav",
  footerBg: "bg-white/90 backdrop-blur-md border-t border-[#e7e7ea]",
  card: "glass-panel glass-panel-hover rounded-2xl",
  cardSecondary: "bg-[#fafafa]/90 border border-[#e7e7ea] rounded-2xl",
  text: "text-[#18181b] font-sans leading-relaxed",
  textHeading: "text-[#18181b] font-extrabold tracking-tight",
  textMuted: "text-[#71717a] font-medium",
  textSubMuted: "text-[#a1a1aa] font-normal",
  border: "border-[#e7e7ea]",
  borderSubtle: "border-[#ececef]",
  borderStrong: "border-[#d4d4d8]",
  divider: "border-[#e7e7ea]",
  
  primaryButton: "civic-btn-primary",
  secondaryButton: "civic-btn-secondary",
  ghostButton: "min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] hover:bg-zinc-100 text-[#18181b] hover:text-black font-semibold px-4 sm:px-5 md:px-6 rounded-full transition-all cursor-pointer inline-flex items-center justify-center",
  input: "w-full px-4 py-3 rounded-[0.7rem] border border-[#e7e7ea] hover:border-[#d4d4d8] bg-white text-[#18181b] font-medium focus:ring-4 focus:ring-blue-500/15 focus:border-[#2563eb] outline-none transition-all placeholder:text-[#a1a1aa] text-sm shadow-xs",
  select: "w-full px-4 py-2.5 rounded-[0.7rem] border border-[#e7e7ea] hover:border-[#d4d4d8] bg-white text-[#18181b] font-medium focus:ring-4 focus:ring-blue-500/15 focus:border-[#2563eb] outline-none transition-all text-xs shadow-xs cursor-pointer",
  accentText: "text-[#2563eb] font-bold",
  accentBg: "bg-[#eff4ff]",
  accentBadge: "bg-[#eff4ff] text-[#2563eb] border border-blue-200 font-semibold text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs",
  aiBadge: "bg-purple-50 text-[#7c3aed] border border-purple-200 font-semibold text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs",
  
  successBg: "bg-emerald-50/90",
  successText: "text-[#16a34a]",
  successBorder: "border-emerald-200",
  dangerBg: "bg-rose-50/90",
  dangerText: "text-[#dc2626]",
  dangerBorder: "border-rose-200",
  warningBg: "bg-amber-50/90",
  warningText: "text-[#d97706]",
  warningBorder: "border-amber-200",
};

export const darkTheme: ThemeTokens = {
  bg: "ambient-canvas dark",
  headerBg: "glass-island-nav",
  footerBg: "bg-[#101014]/90 backdrop-blur-md border-t border-zinc-800",
  card: "glass-panel glass-panel-hover rounded-2xl",
  cardSecondary: "bg-[#141418]/90 border border-zinc-800 rounded-2xl",
  text: "text-zinc-100 font-sans leading-relaxed",
  textHeading: "text-white font-extrabold tracking-tight",
  textMuted: "text-zinc-400 font-medium",
  textSubMuted: "text-zinc-500 font-normal",
  border: "border-zinc-800",
  borderSubtle: "border-zinc-850",
  borderStrong: "border-zinc-700",
  divider: "border-zinc-800",
  
  primaryButton: "civic-btn-primary !bg-blue-600 hover:!bg-blue-500 text-white",
  secondaryButton: "civic-btn-secondary !bg-[#18181c] !text-zinc-100 !border-zinc-700 hover:!border-zinc-500 hover:!bg-[#222228]",
  ghostButton: "min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px] hover:bg-zinc-800/80 text-zinc-300 hover:text-white font-semibold px-4 sm:px-5 md:px-6 rounded-full transition-all cursor-pointer inline-flex items-center justify-center",
  input: "w-full px-4 py-3 rounded-[0.7rem] border border-zinc-700 hover:border-zinc-600 bg-[#121216] text-white font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-500 text-sm shadow-xs",
  select: "w-full px-4 py-2.5 rounded-[0.7rem] border border-zinc-700 hover:border-zinc-600 bg-[#121216] text-white font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs shadow-xs cursor-pointer",
  accentText: "text-blue-400 font-bold",
  accentBg: "bg-blue-950/40",
  accentBadge: "bg-blue-950/60 text-blue-300 border border-blue-800/60 font-semibold text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5",
  aiBadge: "bg-purple-950/60 text-purple-300 border border-purple-800/60 font-semibold text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5",
  
  successBg: "bg-emerald-950/40",
  successText: "text-emerald-300",
  successBorder: "border-emerald-800/60",
  dangerBg: "bg-rose-950/40",
  dangerText: "text-rose-300",
  dangerBorder: "border-rose-800/60",
  warningBg: "bg-amber-950/40",
  warningText: "text-amber-300",
  warningBorder: "border-amber-800/60",
};
