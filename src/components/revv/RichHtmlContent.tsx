import { useMemo } from "react";
import { resolveMediaUrl, sanitizeRichHtml } from "@/lib/api";

interface RichHtmlContentProps {
  html: string;
  variant?: "dark" | "light";
  className?: string;
}

export function RichHtmlContent({ html, variant = "light", className = "" }: RichHtmlContentProps) {
  const safeHtml = useMemo(() => {
    const trimmed = html.trim();
    if (!trimmed) return "";
    // Convert legacy plain-text articles safely into paragraph blocks.
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
    const prepared = looksLikeHtml
      ? trimmed
      : trimmed
          .split(/\n{2,}/)
          .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
          .join("");
    const sanitized = sanitizeRichHtml(prepared);
    // Resolve relative /uploads/... image paths against the API origin.
    return sanitized.replace(/src="(\/uploads\/[^"]+)"/gi, (_m, path: string) => {
      const resolved = resolveMediaUrl(path) ?? path;
      return `src="${resolved}"`;
    });
  }, [html]);

  const variantClasses =
    variant === "dark"
      ? "text-foreground/95 [&_h2]:text-foreground [&_h3]:text-foreground [&_blockquote]:border-primary [&_blockquote]:bg-secondary/40 [&_blockquote]:text-foreground/90 [&_figcaption]:text-muted-foreground [&_a]:text-primary"
      : "text-foreground/90 [&_h2]:text-foreground [&_h3]:text-foreground [&_blockquote]:border-primary [&_blockquote]:bg-secondary/30 [&_blockquote]:text-foreground [&_figcaption]:text-muted-foreground [&_a]:text-primary";

  return (
    <div
      className={[
        "revv-rich-html space-y-4",
        "[&_blockquote]:my-4 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic",
        "[&_figure]:my-5 [&_figure]:overflow-hidden [&_figure]:rounded-xl [&_figure]:border [&_figure]:border-border",
        "[&_figure_img]:w-full [&_figure_img]:max-h-[420px] [&_figure_img]:object-cover",
        "[&_figcaption]:bg-secondary/35 [&_figcaption]:px-3 [&_figcaption]:py-2 [&_figcaption]:text-xs [&_figcaption]:tracking-wide",
        "[&_a]:underline [&_a]:underline-offset-2",
        variantClasses,
        className,
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
