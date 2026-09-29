import { ThemeTokens } from "../../theme";
import {
  Bot,
  User,
  Headphones,
  Sparkles,
  Sprout,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  FileText,
} from "lucide-react";

interface AdvisorySkeletonProps {
  theme: ThemeTokens;
  activeQuery?: string;
  selectedDistrict: string;
  selectedState: string;
  currentLangNative: string;
}

export default function AdvisorySkeleton({
  theme,
  activeQuery,
  selectedDistrict,
  selectedState,
  currentLangNative,
}: AdvisorySkeletonProps) {
  return (
    <div
      className="space-y-6"
      id="advisory-skeleton-container"
      role="status"
      aria-label="Loading agricultural advisory"
    >
      {/* 1. User Message Bubble Mirror */}
      {activeQuery && (
        <div className="flex justify-end" id="user-message-bubble-skeleton">
          <div className="bg-emerald-600 text-white p-4 rounded-2xl rounded-tr-none max-w-lg shadow-sm space-y-1">
            <div className="flex items-center space-x-1.5 text-[10px] opacity-90 uppercase font-bold tracking-wider">
              <User className="w-3 h-3" />
              <span>You</span>
            </div>
            <p className="text-sm font-medium">{activeQuery}</p>
          </div>
        </div>
      )}

      {/* 2. Main AI Response Card Skeleton */}
      <div className={`${theme.card} p-6 space-y-6 transition-all duration-200`} id="ai-response-skeleton">
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-300 dark:border-emerald-800/50">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-zinc-950 dark:text-white">
                AgriSahayak AI
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-semibold px-2 py-0.5 rounded-full">
                {currentLangNative}
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium hidden sm:inline-flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              Analyzing soil & meteorological models for {selectedDistrict}...
            </span>
          </div>

          <div className="h-7 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>

        {/* Listen to Advisory Audio Broadcast Suite Skeleton */}
        <div
          className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-4 sm:p-5 space-y-4"
          id="listen-advisory-skeleton"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/25 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs shrink-0">
                <Headphones className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-4 w-44 bg-emerald-200/80 dark:bg-emerald-900/60 rounded animate-pulse" />
                <div className="h-3 w-56 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-44 bg-emerald-600/25 dark:bg-emerald-600/30 rounded-lg animate-pulse" />
              <div className="h-8 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse hidden sm:block" />
            </div>
          </div>

          {/* Transcript simulation box */}
          <div className="bg-white/95 dark:bg-zinc-900/90 border border-emerald-200/70 dark:border-emerald-800/50 rounded-lg p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <div className="h-3 w-40 bg-emerald-200 dark:bg-emerald-900/60 rounded animate-pulse" />
              </div>
              <div className="h-3 w-20 bg-emerald-200/60 dark:bg-emerald-900/40 rounded animate-pulse" />
            </div>
            <div className="space-y-2 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 rounded-md border border-emerald-100/70 dark:border-emerald-900/40">
              <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-3.5 w-11/12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-3.5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Four Clearly Labeled Mini-Sections Skeleton */}
        <div className="space-y-6 text-left">
          {/* Section 1: Recommended Crops */}
          <div className="space-y-3.5" id="skeleton-recommended-crops">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-emerald-200 dark:bg-emerald-900/60 animate-pulse" />
                  <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="h-3 w-64 bg-zinc-200/70 dark:bg-zinc-800/70 rounded animate-pulse ml-6" />
              </div>
            </div>

            {/* 3 Crop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4.5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                      <div className="h-4 w-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-full animate-pulse" />
                    </div>
                    {/* Rationale lines */}
                    <div className="space-y-1.5 pt-1">
                      <div className="h-3 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
                      <div className="h-3 w-5/6 bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
                      <div className="h-3 w-4/6 bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70">
                    <div className="h-6 w-36 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-lg animate-pulse" />
                    <div className="h-6 w-40 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Soil & Regenerative Practices Card Skeleton */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-emerald-200 dark:bg-emerald-900/60 animate-pulse" />
              <div className="h-4 w-52 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-3.5 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-3.5 w-11/12 bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-3.5 w-4/5 bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
            </div>
          </div>

          {/* Section 3: Weather & Seasonal Risk Mitigation Card Skeleton */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4.5 space-y-2.5">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
              <div className="h-4 w-60 bg-amber-200/70 dark:bg-amber-900/60 rounded animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-3.5 w-full bg-amber-200/50 dark:bg-amber-900/30 rounded animate-pulse" />
              <div className="h-3.5 w-10/12 bg-amber-200/50 dark:bg-amber-900/30 rounded animate-pulse" />
            </div>
          </div>

          {/* Section 4: ICAR / KVK Grounding Footer Skeleton */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="h-3.5 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-28 bg-emerald-100 dark:bg-emerald-950/50 rounded-full animate-pulse self-start sm:self-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
