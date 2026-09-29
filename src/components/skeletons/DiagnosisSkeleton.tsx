import { ThemeTokens } from "../../theme";
import {
  Volume2,
  ShieldAlert,
  HeartHandshake,
  AlertCircle,
  ScanLine,
} from "lucide-react";

interface DiagnosisSkeletonProps {
  theme: ThemeTokens;
  selectedDistrict: string;
}

export default function DiagnosisSkeleton({
  theme,
  selectedDistrict,
}: DiagnosisSkeletonProps) {
  return (
    <div
      className={`${theme.card} p-6 md:p-8 space-y-6 transition-all duration-200`}
      id="diagnosis-result-skeleton"
      role="status"
      aria-label="Diagnosing crop leaf image"
    >
      {/* Top Processing State Indicator */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <ScanLine className="w-4 h-4 animate-pulse" />
          <span className="animate-pulse">Multimodal Leaf Pathology Analysis</span>
        </div>
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium animate-pulse">
          Scanning symptoms for {selectedDistrict}...
        </span>
      </div>

      {/* 1. Voice TTS Player Bar Skeleton */}
      <div
        className={`${theme.successBg} border ${theme.successBorder} p-4.5 rounded-2xl flex items-center justify-between`}
        id="diagnosis-audio-skeleton"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50 shadow-sm">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-emerald-200/80 dark:bg-emerald-900/60 rounded animate-pulse" />
            <div className="h-3 w-48 bg-emerald-200/60 dark:bg-emerald-900/40 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-28 bg-emerald-600/25 dark:bg-emerald-600/30 rounded-xl animate-pulse" />
      </div>

      {/* 2. Disease Metadata Section Skeleton */}
      <div className="space-y-2.5 border-b pb-5 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold">
          <ShieldAlert className="w-4 h-4 animate-pulse" />
          <div className="h-3.5 w-32 bg-rose-200/80 dark:bg-rose-900/50 rounded animate-pulse" />
        </div>
        {/* Large Disease Name Headline */}
        <div className="h-7 sm:h-8 w-3/5 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        {/* Confidence Badge */}
        <div className="h-6 w-36 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md animate-pulse mt-1" />
      </div>

      {/* 3. Treatment Remedies Grid Skeleton */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organic Treatment Card */}
          <div
            className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 p-5 rounded-2xl space-y-3"
            id="skeleton-organic-remedy"
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🌱</span>
              <div className="h-3.5 w-44 bg-emerald-200 dark:bg-emerald-900/60 rounded animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="h-3 w-full bg-emerald-200/60 dark:bg-emerald-900/40 rounded animate-pulse" />
              <div className="h-3 w-11/12 bg-emerald-200/60 dark:bg-emerald-900/40 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-emerald-200/60 dark:bg-emerald-900/40 rounded animate-pulse" />
            </div>
          </div>

          {/* Chemical Fallback Card */}
          <div
            className={`${theme.cardSecondary} p-5 space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800`}
            id="skeleton-chemical-remedy"
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🧪</span>
              <div className="h-3.5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="h-3 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-3 w-10/12 bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-zinc-200/80 dark:bg-zinc-800/80 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* 4. Prevention Panel Skeleton */}
        <div
          className="bg-zinc-50 dark:bg-[#1B1B1F] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-3"
          id="skeleton-prevention-panel"
        >
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <div className="h-3.5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <div className="h-3 w-full bg-zinc-200/75 dark:bg-zinc-800/75 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-zinc-200/75 dark:bg-zinc-800/75 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* 5. Community Outbreak Alert Footer Skeleton */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex items-center justify-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
        <div className="h-3 w-72 bg-zinc-200/60 dark:bg-zinc-800/60 rounded animate-pulse" />
      </div>
    </div>
  );
}
