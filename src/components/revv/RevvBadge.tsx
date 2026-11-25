import { useEffect, useMemo, useRef, useState } from "react";
import type { LottieHandle } from "lottie-react";
import { Sparkles } from "lucide-react";
import { LazyLottie } from "@/components/revv/LazyLottie";
import { useCosmeticsCatalog, useLottieAsset } from "@/lib/cosmetics-cache";
import { cn } from "@/lib/utils";

export interface RevvBadgeProps {
  badgeCode?: string | null | undefined;
  assetHash?: string | null | undefined;
  lottieUrl?: string | null | undefined;
  title?: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
}

/**
 * Renders a DB-stored Lottie Animated Cosmetic Badge with automatic viewport pause/play.
 */
export function RevvBadge({
  badgeCode,
  assetHash,
  lottieUrl,
  title,
  size = 28,
  className,
}: RevvBadgeProps) {
  const catalog = useCosmeticsCatalog();
  const ref = useRef<HTMLDivElement | null>(null);
  const lottieRef = useRef<LottieHandle | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const badgeMeta = useMemo(() => {
    if (!badgeCode || !catalog?.badges) return null;
    return catalog.badges.find((b) => b.code === badgeCode) ?? null;
  }, [badgeCode, catalog]);

  const effectiveHash = assetHash ?? badgeMeta?.asset_hash;
  const effectiveUrl = lottieUrl ?? badgeMeta?.lottie_url;
  const lottieData = useLottieAsset(effectiveHash, effectiveUrl);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "60px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!lottieRef.current) return;
    if (isVisible) lottieRef.current.play();
    else lottieRef.current.pause();
  }, [isVisible, lottieData]);

  return (
    <div
      ref={ref}
      style={{ width: size, height: size }}
      title={title ?? badgeMeta?.title ?? badgeCode ?? "Animated Badge"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary/50 p-0.5",
        className,
      )}
    >
      {lottieData ? (
        <LazyLottie
          lottieRef={lottieRef}
          src={lottieData}
          loop
          autoplay={isVisible}
          style={{ width: size - 4, height: size - 4 }}
        />
      ) : (
        <Sparkles className="size-3.5 text-warning" />
      )}
    </div>
  );
}
