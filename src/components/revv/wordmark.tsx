import { cn } from "@/lib/utils";

/** The REVV wordmark: heavy uppercase type with the signature red square period. */
export function Wordmark({
  className,
  squareClassName,
}: {
  className?: string;
  squareClassName?: string;
}) {
  return (
    <span
      className={cn(
        "font-display inline-flex items-baseline font-black tracking-tight",
        className,
      )}
    >
      <span className="uppercase">REVV</span>
      <span
        aria-hidden
        className={cn(
          "ms-[0.08em] inline-block translate-y-[-0.05em] bg-primary",
          "size-[0.18em]",
          squareClassName,
        )}
      />
    </span>
  );
}
