import { useEffect, useMemo, useRef, useState } from "react";
import { Lottie, type LottieHandle } from "lottie-react";
import { BadgeCheck } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { useCosmeticsCatalog, useLottieAsset } from "@/lib/cosmetics-cache";
import { cn } from "@/lib/utils";

export interface RevvAvatarProps {
  src?: string | null;
  name?: string | null;
  frameCode?: string | null;
  size?: number;
  className?: string;
  showVerifiedBadge?: boolean;
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
 * Universal REVV Web Avatar with DB-driven Lottie Animated Frame.
 *
 * - Fetches frame Lottie JSON once by SHA-256 hash via `CacheStorage` (`useLottieAsset`).
 * - Automatically pauses offscreen Lottie animations using `IntersectionObserver`.
 * - Respects `prefers-reduced-motion` with a crisp static gradient halo fallback.
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
  const lottieRef = useRef<LottieHandle | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src]);
  useEffect(() => {
    setImgFailed(false);
  }, [resolvedSrc]);

  const frameMeta = useMemo(() => {
    if (!frameCode || !catalog?.frames) return null;
    return catalog.frames.find((f) => f.code === frameCode) ?? null;
  }, [frameCode, catalog]);

  const lottieData = useLottieAsset(frameMeta?.asset_hash, frameMeta?.lottie_url);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "80px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!lottieRef.current) return;
    if (reducedMotion || !isVisible) {
      lottieRef.current.pause();
    } else {
      lottieRef.current.play();
    }
  }, [isVisible, reducedMotion, lottieData]);

  const hasFrame = Boolean(frameCode && frameCode.trim().length > 0);
  const outerSize = hasFrame ? Math.round(size * 1.24) : size;
  const initials = (name || "R").trim().charAt(0).toUpperCase() || "R";
  const isVerified = showVerifiedBadge ?? Boolean(frameMeta?.is_verified_badge);

  const fallbackColors = useMemo(() => {
    const meta = frameMeta?.metadata as
      { inner_colors?: string[]; outer_colors?: string[] } | undefined;
    const cols = meta?.outer_colors ?? meta?.inner_colors;
    if (Array.isArray(cols) && cols.length >= 2) {
      return `linear-gradient(135deg, ${cols[0]}, ${cols[1]})`;
    }
    return "linear-gradient(135deg, var(--color-primary), var(--color-warning))";
  }, [frameMeta]);

  return (
    <div
      ref={containerRef}
      style={{ width: outerSize, height: outerSize }}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      title={frameMeta ? `${name ?? "Rider"} · ${frameMeta.title}` : (name ?? undefined)}
    >
      {hasFrame && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {lottieData && !reducedMotion ? (
            <Lottie
              lottieRef={lottieRef}
              src={lottieData}
              loop
              autoplay={isVisible}
              style={{ width: outerSize, height: outerSize }}
            />
          ) : (
            <div className="size-full rounded-full p-[3px]" style={{ background: fallbackColors }}>
              <div className="size-full rounded-full bg-background" />
            </div>
          )}
        </div>
      )}

      <div
        style={{ width: size, height: size }}
        className="relative z-10 flex items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary font-display font-bold text-foreground shadow-sm"
      >
        {resolvedSrc && !imgFailed ? (
          <img
            src={resolvedSrc}
            alt={name ?? "Rider avatar"}
            className="size-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}>{initials}</span>
        )}
      </div>

      {isVerified && (
        <span
          aria-label="Verified REVV Patron"
          className="absolute -bottom-0.5 -right-0.5 z-20 flex items-center justify-center rounded-full bg-background p-0.5 shadow"
        >
          <BadgeCheck
            className="text-sky-400"
            style={{
              width: Math.max(13, Math.round(size * 0.32)),
              height: Math.max(13, Math.round(size * 0.32)),
            }}
          />
        </span>
      )}
    </div>
  );
}
