import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading2,
  ImagePlus,
  Italic,
  List,
  Loader2,
  Quote,
  Underline,
} from "lucide-react";
import { uploadCompressedMedia } from "@/lib/api";

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

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write formatted dispatch or policy content...",
  minHeightClass = "min-h-[260px]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync external value into contentEditable only when focus is outside so cursor position is preserved.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || sourceMode) return;
    if (document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value, sourceMode]);

  const syncFromEditor = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execFormat = (command: string, arg?: string) => {
    if (sourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    syncFromEditor();
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const rawCaption = window.prompt("Optional image caption (e.g. Tire inspection setup):", "");
    if (rawCaption === null) return;

    setUploadingImage(true);
    setUploadError(null);
    try {
      const uploaded = await uploadCompressedMedia(file);
      const caption = rawCaption.trim();
      const figcaptionHtml = caption
        ? `<figcaption>Image : ${escapeHtmlAttr(caption)}</figcaption>`
        : "";
      const figureHtml = `<figure><img src="${escapeHtmlAttr(uploaded.url)}" alt="${escapeHtmlAttr(caption || "REVV dispatch image")}" />${figcaptionHtml}</figure><p><br/></p>`;

      if (sourceMode) {
        onChange(`${value}${figureHtml}`);
      } else {
        editorRef.current?.focus();
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
    <div className="overflow-hidden rounded-xl border border-panel-border bg-panel-card text-panel-fg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-border bg-panel px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn
            icon={<Bold className="size-4" />}
            label="Bold"
            disabled={sourceMode}
            onClick={() => execFormat("bold")}
          />
          <ToolbarBtn
            icon={<Italic className="size-4" />}
            label="Italic"
            disabled={sourceMode}
            onClick={() => execFormat("italic")}
          />
          <ToolbarBtn
            icon={<Underline className="size-4" />}
            label="Underline"
            disabled={sourceMode}
            onClick={() => execFormat("underline")}
          />
          <ToolbarBtn
            icon={<Heading2 className="size-4" />}
            label="Heading"
            disabled={sourceMode}
            onClick={() => execFormat("formatBlock", "H2")}
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
            disabled={sourceMode}
            onClick={() => execFormat("insertUnorderedList")}
          />

          <div className="mx-1 h-5 w-px bg-panel-border" />

          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel-card px-2.5 py-1.5 text-xs font-semibold text-panel-fg transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {uploadingImage ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <ImagePlus className="size-3.5 text-primary" />
            )}
            Embed Image
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
          onClick={() => setSourceMode((prev) => !prev)}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
            sourceMode
              ? "border-primary bg-primary text-primary-foreground"
              : "border-panel-border bg-panel-card text-panel-muted hover:text-panel-fg",
          ].join(" ")}
        >
          <Code2 className="size-3.5" />
          {sourceMode ? "Visual" : "HTML"}
        </button>
      </div>

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
          className={`w-full resize-y bg-panel-card p-4 font-mono text-xs leading-relaxed text-panel-fg outline-none ${minHeightClass}`}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          data-placeholder={placeholder}
          className={[
            "w-full overflow-y-auto p-4 text-sm leading-relaxed text-panel-fg outline-none empty:before:text-panel-muted empty:before:content-[attr(data-placeholder)]",
            "[&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:uppercase",
            "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-panel [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:italic",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_figure]:my-3 [&_figure]:rounded-lg [&_figure]:border [&_figure]:border-panel-border [&_figure]:p-2",
            "[&_figcaption]:mt-1 [&_figcaption]:font-mono [&_figcaption]:text-xs [&_figcaption]:text-panel-muted",
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
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg p-1.5 text-panel-fg transition-colors hover:bg-panel-card hover:text-primary disabled:opacity-40"
    >
      {icon}
    </button>
  );
}
