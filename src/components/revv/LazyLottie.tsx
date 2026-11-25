import { Suspense, lazy } from "react";
import type { ComponentProps } from "react";
import type { Lottie } from "lottie-react";

const LazyLottieInner = lazy(() => import("lottie-react").then((mod) => ({ default: mod.Lottie })));

export type LazyLottieProps = ComponentProps<typeof Lottie>;

export function LazyLottie(props: LazyLottieProps) {
  return (
    <Suspense fallback={null}>
      <LazyLottieInner {...props} />
    </Suspense>
  );
}
