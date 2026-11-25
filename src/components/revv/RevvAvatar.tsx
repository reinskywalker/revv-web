import { useEffect, useMemo, useRef, useState } from "react";
import { Lottie, type LottieHandle } from "lottie-react";
import { Sparkles } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { useCosmeticsCatalog, useLottieAsset } from "@/lib/cosmetics-cache";
import { cn } from "@/lib/utils";

export interface RevvAvatarProps {
  src?: string | null | undefined;
  name?: string | null | undefined;
  frameCode?: string | null | undefined;
  size?: number | undefined;
  className?: string | undefined;
  showVerifiedBadge?: boolean | undefined;
}

const FRAME_PNG_MAP: Record<string, string> = {
  verified_patron: "/frames/frame_verified_patron.png",
  frame_verified_patron: "/frames/frame_verified_patron.png",
  patron_wave_2m: "/frames/frame_patron_wave_2m.png",
  frame_patron_wave_2m: "/frames/frame_patron_wave_2m.png",
  apex_gold_6m: "/frames/frame_apex_gold_6m.png",
  frame_apex_gold_6m: "/frames/frame_apex_gold_6m.png",
  carbon_track_shop: "/frames/frame_carbon_track_shop.png",
  frame_carbon_track_shop: "/frames/frame_carbon_track_shop.png",
};

const VERIFIED_FRAME_CODES = new Set([
  "verified_patron",
  "frame_verified_patron",
  "patron_wave_2m",
  "frame_patron_wave_2m",
  "apex_gold_6m",
  "frame_apex_gold_6m",
]);

export function hasVerifiedFrame(frameCode?: string | null): boolean {
  const norm = (frameCode ?? "").trim().toLowerCase();
  return VERIFIED_FRAME_CODES.has(norm);
}

type FrameVisualStyle = {
  gradient: string;
  glow: string;
  variant: "spin" | "pulse" | "scan" | "float";
  accentHex: string;
  secondaryHex: string;
};

function resolveFrameStyle(
  frameCode?: string | null,
  metadata?: Record<string, unknown>,
): FrameVisualStyle {
  const norm = (frameCode ?? "")
    .trim()
    .toLowerCase()
    .replace(/^frame_/, "");
  switch (norm) {
    case "apex_gold_6m":
      return {
        gradient: "conic-gradient(from 0deg, #fbbf24, #fde68a, #d97706, #fef3c7, #fbbf24)",
        glow: "0 0 18px rgba(251, 191, 36, 0.55)",
        variant: "spin",
        accentHex: "#fbbf24",
        secondaryHex: "#fef08a",
      };
    case "patron_wave_2m":
      return {
        gradient: "conic-gradient(from 45deg, #00f5d4, #10b981, #a855f7, #00f5d4)",
        glow: "0 0 16px rgba(0, 245, 212, 0.45)",
        variant: "spin",
        accentHex: "#00f5d4",
        secondaryHex: "#c084fc",
      };
    case "verified_patron":
      return {
        gradient: "conic-gradient(from 0deg, #0ea5e9, #22d3ee, #38bdf8, #0284c7, #0ea5e9)",
        glow: "0 0 14px rgba(14, 165, 233, 0.45)",
        variant: "pulse",
        accentHex: "#38bdf8",
        secondaryHex: "#22d3ee",
      };
    case "carbon_track_shop":
      return {
        gradient: "conic-gradient(from 90deg, #dc2626, #334155, #ef4444, #0f172a, #dc2626)",
        glow: "0 0 14px rgba(239, 68, 68, 0.42)",
        variant: "spin",
        accentHex: "#ef4444",
        secondaryHex: "#94a3b8",
      };
    case "retro_arcade_card":
      return {
        gradient: "linear-gradient(135deg, #ea580c, #fdba74, #f59e0b)",
        glow: "0 0 14px rgba(245, 158, 11, 0.42)",
        variant: "scan",
        accentHex: "#f59e0b",
        secondaryHex: "#fef08a",
      };
    case "cyber_grid_volt":
      return {
        gradient: "linear-gradient(135deg, #facc15, #22d3ee, #eab308)",
        glow: "0 0 15px rgba(250, 204, 21, 0.45)",
        variant: "scan",
        accentHex: "#facc15",
        secondaryHex: "#22d3ee",
      };
    case "crimson_pulse_edge":
      return {
        gradient: "conic-gradient(from 0deg, #0f172a, #ff1e42, #fca5a5, #0f172a)",
        glow: "0 0 15px rgba(255, 30, 66, 0.48)",
        variant: "spin",
        accentHex: "#ff1e42",
        secondaryHex: "#fca5a5",
      };
    case "manga_speed_burst":
      return {
        gradient: "conic-gradient(from 20deg, #38bdf8, #ffffff, #0ea5e9, #e0f2fe, #38bdf8)",
        glow: "0 0 14px rgba(56, 189, 248, 0.45)",
        variant: "spin",
        accentHex: "#38bdf8",
        secondaryHex: "#ffffff",
      };
    case "inferno_shard_oni":
      return {
        gradient: "conic-gradient(from 180deg, #991b1b, #ef4444, #f97316, #7f1d1d, #ef4444)",
        glow: "0 0 16px rgba(239, 68, 68, 0.52)",
        variant: "pulse",
        accentHex: "#ef4444",
        secondaryHex: "#f97316",
      };
    case "pastel_heart_drift":
      return {
        gradient: "linear-gradient(135deg, #f472b6, #fbcfe8, #c084fc)",
        glow: "0 0 14px rgba(244, 114, 182, 0.42)",
        variant: "float",
        accentHex: "#f472b6",
        secondaryHex: "#fbcfe8",
      };
    case "phantom_wisp_flame":
      return {
        gradient: "conic-gradient(from 0deg, #22d3ee, #8b5cf6, #38bdf8, #c084fc, #22d3ee)",
        glow: "0 0 16px rgba(139, 92, 246, 0.48)",
        variant: "spin",
        accentHex: "#22d3ee",
        secondaryHex: "#c084fc",
      };
    case "beta_pioneer":
    case "milestone_odometer_1k":
    case "milestone_century_100":
    case "event_night_rally":
      return {
        gradient:
          norm === "milestone_odometer_1k"
            ? "conic-gradient(from 0deg, #f59e0b, #ef4444, #fbbf24, #f59e0b)"
            : norm === "milestone_century_100"
              ? "conic-gradient(from 0deg, #06b6d4, #3b82f6, #67e8f9, #06b6d4)"
              : norm === "event_night_rally"
                ? "conic-gradient(from 0deg, #f97316, #ec4899, #6366f1, #f97316)"
                : "conic-gradient(from 0deg, #8b5cf6, #ec4899, #38bdf8, #a855f7, #8b5cf6)",
        glow: "0 0 15px rgba(139, 92, 246, 0.45)",
        variant: "spin",
        accentHex: "#a855f7",
        secondaryHex: "#38bdf8",
      };
    default: {
      const meta = metadata as { inner_colors?: string[]; outer_colors?: string[] } | undefined;
      const cols = meta?.outer_colors ?? meta?.inner_colors;
      if (cols && cols.length >= 2) {
        return {
          gradient: `conic-gradient(from 0deg, ${cols[0]}, ${cols[1]}, ${cols[0]})`,
          glow: `0 0 14px ${cols[0]}66`,
          variant: "spin",
          accentHex: cols[0] ?? "#38bdf8",
          secondaryHex: cols[1] ?? "#818cf8",
        };
      }
      return {
        gradient: "conic-gradient(from 0deg, #38bdf8, #818cf8, #e11d48, #38bdf8)",
        glow: "0 0 12px rgba(56, 189, 248, 0.35)",
        variant: "spin",
        accentHex: "#38bdf8",
        secondaryHex: "#818cf8",
      };
    }
  }
}

export function VerifiedCheckBadge({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [imgErr, setImgErr] = useState(false);

  if (imgErr) {
    return (
      <span
        aria-label="Verified REVV rider"
        title="Verified REVV Member"
        style={{ width: size, height: size }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm",
          className,
        )}
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-[64%] w-[64%]">
          <path
            d="M3.5 8.5L6.5 11.5L12.5 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <img
      src="/frames/badge_verified_blue.png"
      alt="Verified REVV Member"
      title="Verified REVV Member"
      width={size}
      height={size}
      onError={() => setImgErr(true)}
      style={{ width: size, height: size }}
      className={cn("inline-block shrink-0 select-none object-contain drop-shadow-sm", className)}
    />
  );
}

/**
 * Displays a DB-backed animated Lottie cosmetic badge (fallback-safe pill).
 */
export function RevvCosmeticBadge({
  title,
  assetHash,
  lottieUrl,
  size = 28,
}: {
  code: string;
  title: string;
  assetHash?: string | null | undefined;
  lottieUrl?: string | null | undefined;
  size?: number | undefined;
}) {
  const lottieData = useLottieAsset(assetHash, lottieUrl);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/75 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
      <span
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background/70"
      >
        {lottieData ? (
          <Lottie src={lottieData} loop autoplay className="h-full w-full" />
        ) : (
          <Sparkles className="size-3.5 text-primary" />
        )}
      </span>
      <span className="truncate max-w-[140px]">{title}</span>
    </span>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

/**
 * Universal REVV Web Squircle Avatar (`rounded-[22%]` frame / `rounded-[19%]` photo)
 * matching Mobile's `RevvAvatarFrame`, PNG frame rims, and Steam-style prestige animations.
 */
export function RevvAvatar({
  src,
  name,
  frameCode,
  size = 44,
  className,
  showVerifiedBadge,
}: RevvAvatarProps) {
  const catalog = useCosmeticsCatalog();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [framePngFailed, setFramePngFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src]);
  useEffect(() => {
    setImgFailed(false);
  }, [resolvedSrc]);

  const normFrame = (frameCode ?? "").trim().toLowerCase();
  const framePngUrl = normFrame ? FRAME_PNG_MAP[normFrame] : undefined;

  useEffect(() => {
    setFramePngFailed(false);
  }, [framePngUrl]);

  const frameMeta = useMemo(() => {
    if (!frameCode || !catalog?.frames) return null;
    return catalog.frames.find((f) => f.code === frameCode) ?? null;
  }, [frameCode, catalog]);

  const lottieData = useLottieAsset(
    !framePngUrl ? frameMeta?.asset_hash : null,
    !framePngUrl ? frameMeta?.lottie_url : null,
  );
  const lottieRef = useRef<LottieHandle | null>(null);

  const hasFrame = Boolean(normFrame.length > 0);
  const outerSize = hasFrame ? Math.round(size * 1.18) : size;
  const initials = (name || "R").trim().charAt(0).toUpperCase() || "R";
  const isVerified =
    showVerifiedBadge ?? (Boolean(frameMeta?.is_verified_badge) || hasVerifiedFrame(frameCode));

  const frameStyle = useMemo(
    () => resolveFrameStyle(frameCode, frameMeta?.metadata),
    [frameCode, frameMeta?.metadata],
  );

  const badgeSize = Math.max(14, Math.min(28, Math.round(size * 0.3)));

  return (
    <div
      ref={containerRef}
      style={{ width: outerSize, height: outerSize }}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
    >
      {/* Animated prestige squircle halo (behind photo, never obscuring image) */}
      {hasFrame && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22%]"
          style={{ boxShadow: frameStyle.glow }}
        >
          <div
            className={cn(
              "absolute -inset-1/2",
              !reducedMotion && frameStyle.variant === "spin" && "animate-revv-frame-spin",
              !reducedMotion && frameStyle.variant === "pulse" && "animate-revv-frame-pulse",
              !reducedMotion && frameStyle.variant === "scan" && "animate-revv-frame-scan",
              !reducedMotion && frameStyle.variant === "float" && "animate-revv-frame-float",
            )}
            style={{ background: frameStyle.gradient }}
          />
          <div className="absolute inset-[3px] rounded-[19%] bg-card" />
        </div>
      )}

      {/* Squircle Photo / Initials */}
      <div
        style={{ width: size, height: size }}
        className="relative z-10 flex items-center justify-center overflow-hidden rounded-[19%] border border-border/80 bg-secondary font-display font-bold text-foreground shadow-sm"
      >
        {resolvedSrc && !imgFailed ? (
          <img
            src={resolvedSrc}
            alt={name || "Rider"}
            className="size-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}>{initials}</span>
        )}
      </div>

      {/* Synced PNG frame rim overlay (verified_patron, patron_wave_2m, apex_gold_6m, carbon_track_shop) */}
      {hasFrame && framePngUrl && !framePngFailed && (
        <img
          src={framePngUrl}
          alt=""
          aria-hidden="true"
          onError={() => setFramePngFailed(true)}
          className="pointer-events-none absolute inset-0 z-20 size-full scale-[1.05] object-contain"
        />
      )}

      {/* Optional subtle animated DB Lottie accents if custom admin frame (clipped outside photo via CSS mask or small badge) */}
      {hasFrame && !framePngUrl && lottieData && !reducedMotion && (
        <div className="pointer-events-none absolute -top-1 -left-1 z-20 size-4 opacity-90">
          <Lottie lottieRef={lottieRef} src={lottieData} loop autoplay />
        </div>
      )}

      {/* Verified Blue Checkmark at TOP-RIGHT so bottom-right profile buttons never collide */}
      {isVerified && (
        <div className="absolute -top-1 -right-1 z-30 flex items-center justify-center rounded-full bg-card p-0.5 shadow-sm">
          <VerifiedCheckBadge size={badgeSize} />
        </div>
      )}
    </div>
  );
}
