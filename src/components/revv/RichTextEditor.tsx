import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Underline,
} from "lucide-react";
import { sanitizeRichHtml } from "@/lib/html-sanitizer";
import { resolveMediaUrl, uploadCompressedMedia } from "@/lib/api";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}

function escapeHtmlAttr(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function normalizePlainTextToHtml(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  const prepared = looksLikeHtml
    ? trimmed
    : trimmed
        .split(/\n{2,}/)
        .map((block) => `<p>${escapeHtmlText(block).replace(/\n/g, "<br/>")}</p>`)
        .join("");
  return sanitizeRichHtml(prepared).replace(/src="(\/uploads\/[^"]+)"/gi, (_m, path: string) => {
    const resolved = resolveMediaUrl(path) ?? path;
    return `src="${escapeHtmlAttr(resolved)}"`;
  });
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write formatted article content directly as it will appear to riders...",
  minHeightClass = "min-h-[320px]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });

  // Normalize & sync external value into contentEditable when focus is outside.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || sourceMode) return;
    const clean = normalizePlainTextToHtml(value || "");
    if (document.activeElement !== el && el.innerHTML !== clean) {
      el.innerHTML = clean;
    }
  }, [value, sourceMode]);

  const refreshActiveFormats = () => {
    if (sourceMode || typeof document === "undefined" || !document.queryCommandState) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // ignore unsupported command queries
    }
  };

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSavedSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const syncFromEditor = () => {
    if (editorRef.current) {
      onChange(sanitizeRichHtml(editorRef.current.innerHTML));
    }
    refreshActiveFormats();
  };

  const toggleSourceMode = () => {
    if (sourceMode) {
      onChange(normalizePlainTextToHtml(value || ""));
    }
    setSourceMode((prev) => !prev);
  };

  const execFormat = (command: string, arg?: string) => {
    if (sourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    syncFromEditor();
  };

  const handleInsertLink = () => {
    const cleanUrl = linkUrl.trim();
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
      setUploadError("Link URL must start with http:// or https://");
      return;
    }
    restoreSavedSelection();
    document.execCommand("createLink", false, cleanUrl);
    syncFromEditor();
    setLinkUrl("https://");
    setShowLinkInput(false);
    setUploadError(null);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);
    try {
      const uploaded = await uploadCompressedMedia(file);
      const caption = pendingCaption.trim();
      setPendingCaption("");
      setShowCaptionInput(false);
      const resolvedSrc = resolveMediaUrl(uploaded.url) ?? uploaded.url;
      const figcaptionHtml = caption ? `<figcaption>${escapeHtmlText(caption)}</figcaption>` : "";
      const figureHtml = `<figure><img src="${escapeHtmlAttr(resolvedSrc)}" alt="${escapeHtmlAttr(caption || "REVV article image")}" />${figcaptionHtml}</figure><p><br/></p>`;

      if (sourceMode) {
        onChange(sanitizeRichHtml(`${value}${figureHtml}`));
      } else {
        restoreSavedSelection();
        document.execCommand("insertHTML", false, figureHtml);
        syncFromEditor();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            icon={<Bold className="size-4" />}
            label="Bold"
            active={activeFormats.bold}
            disabled={sourceMode}
            onClick={() => execFormat("bold")}
          />
          <ToolbarBtn
            icon={<Italic className="size-4" />}
            label="Italic"
            active={activeFormats.italic}
            disabled={sourceMode}
            onClick={() => execFormat("italic")}
          />
          <ToolbarBtn
            icon={<Underline className="size-4" />}
            label="Underline"
            active={activeFormats.underline}
            disabled={sourceMode}
            onClick={() => execFormat("underline")}
          />
          <ToolbarBtn
            icon={<Heading2 className="size-4" />}
            label="Heading 2"
            disabled={sourceMode}
            onClick={() => execFormat("formatBlock", "H2")}
          />
          <ToolbarBtn
            icon={<Heading3 className="size-4" />}
            label="Heading 3"
            disabled={sourceMode}
            onClick={() => execFormat("formatBlock", "H3")}
          />
          <ToolbarBtn
            icon={<Quote className="size-4" />}
            label="Blockquote"
            disabled={sourceMode}
            onClick={() => execFormat("formatBlock", "BLOCKQUOTE")}
          />
          <ToolbarBtn
            icon={<List className="size-4" />}
            label="Bullet List"
            active={activeFormats.unorderedList}
            disabled={sourceMode}
            onClick={() => execFormat("insertUnorderedList")}
          />
          <ToolbarBtn
            icon={<ListOrdered className="size-4" />}
            label="Numbered List"
            active={activeFormats.orderedList}
            disabled={sourceMode}
            onClick={() => execFormat("insertOrderedList")}
          />
          <ToolbarBtn
            icon={<Link2 className="size-4" />}
            label="Insert Link"
            active={showLinkInput}
            disabled={sourceMode}
            onClick={() => {
              saveCurrentSelection();
              setShowLinkInput((prev) => !prev);
            }}
          />

          <div className="mx-1 h-5 w-px bg-border" />

          <button
            type="button"
            disabled={uploadingImage}
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
            }}
            onClick={() => {
              saveCurrentSelection();
              setShowCaptionInput((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {uploadingImage ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <ImagePlus className="size-3.5 text-primary" />
            )}
            Insert Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImagePick}
          />
        </div>

        <button
          type="button"
          onClick={toggleSourceMode}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
            sourceMode
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <Code2 className="size-3.5" />
          {sourceMode ? "WYSIWYG" : "HTML"}
        </button>
      </div>

      {showLinkInput && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/25 px-3 py-2 text-xs">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://revv.asteralabs.digital/..."
            className="min-w-[220px] flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleInsertLink}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            Apply Link
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {showCaptionInput && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/25 px-3 py-2 text-xs">
          <input
            type="text"
            value={pendingCaption}
            onChange={(e) => setPendingCaption(e.target.value)}
            placeholder="Optional photo caption..."
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            disabled={uploadingImage}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Choose Photo
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingCaption("");
              setShowCaptionInput(false);
            }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {uploadError && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {uploadError}
        </div>
      )}

      {sourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full resize-y bg-card p-5 font-mono text-xs leading-relaxed text-foreground outline-none ${minHeightClass}`}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onKeyUp={refreshActiveFormats}
          onMouseUp={() => {
            saveCurrentSelection();
            refreshActiveFormats();
          }}
          data-placeholder={placeholder}
          className={[
            "revv-rich-html w-full overflow-y-auto bg-card p-5 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
            "[&_figure]:my-4 [&_figure]:overflow-hidden [&_figure]:rounded-xl [&_figure]:border [&_figure]:border-border",
            "[&_figure_img]:max-h-[380px] [&_figure_img]:w-full [&_figure_img]:object-cover",
            "[&_figcaption]:bg-secondary/35 [&_figcaption]:px-3 [&_figcaption]:py-2 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground",
            minHeightClass,
          ].join(" ")}
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "rounded-lg p-1.5 transition-colors disabled:opacity-40",
        active ? "bg-primary/20 text-primary" : "text-foreground hover:bg-card hover:text-primary",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}
