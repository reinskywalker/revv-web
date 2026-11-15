const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "blockquote",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "figure",
  "img",
  "figcaption",
  "a",
  "div",
]);

const STRIP_WITH_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
  "template",
  "textarea",
  "title",
  "form",
]);

const VOID_TAGS = new Set(["br", "img"]);

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_m, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);?/g, (_m, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&colon;/gi, ":")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function stripControlAndWhitespace(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) continue;
    out += value.charAt(i);
  }
  return out;
}

function isSafeHttpUrl(rawUrl: string, allowRelativeUpload: boolean): string | null {
  const decoded = stripControlAndWhitespace(decodeHtmlEntities(rawUrl));
  if (!decoded) return null;
  if (allowRelativeUpload && decoded.startsWith("/uploads/") && !decoded.startsWith("//")) {
    return rawUrl.trim();
  }
  if (/^https?:\/\//i.test(decoded)) {
    return rawUrl.trim();
  }
  return null;
}

function parseAttributes(rawAttrs: string): Array<{ name: string; value: string }> {
  const attrs: Array<{ name: string; value: string }> = [];
  const attrRegex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const name = (match[1] || "").toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name) attrs.push({ name, value });
  }
  return attrs;
}

/**
 * Deterministic tag/attribute whitelist sanitizer that enforces identical rules
 * in both browser DOMParser and Node/SSR runtimes.
 */
function sanitizeWithWhitelistSerializer(rawHtml: string): string {
  const strippedBlocks = rawHtml.replace(
    /<\s*(script|style|iframe|object|embed|svg|math|noscript|template|textarea|title|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  const withoutComments = strippedBlocks.replace(/<!--[\s\S]*?-->/g, "");

  const tokenRegex = /<\/?\s*([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/g;
  let cursor = 0;
  let out = "";
  let skipDepthTag: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(withoutComments)) !== null) {
    if (match.index > cursor && !skipDepthTag) {
      out += withoutComments.slice(cursor, match.index);
    }
    cursor = match.index + match[0].length;

    const fullToken = match[0];
    const isClosing = fullToken.startsWith("</");
    const tag = (match[1] || "").toLowerCase();
    const rawAttrs = match[2] || "";

    if (STRIP_WITH_CONTENT_TAGS.has(tag)) {
      if (!isClosing && !fullToken.endsWith("/>")) {
        skipDepthTag = tag;
      } else if (isClosing && skipDepthTag === tag) {
        skipDepthTag = null;
      }
      continue;
    }

    if (skipDepthTag || !ALLOWED_TAGS.has(tag)) {
      continue;
    }

    if (isClosing) {
      if (!VOID_TAGS.has(tag)) {
        out += `</${tag}>`;
      }
      continue;
    }

    const attrs = parseAttributes(rawAttrs);
    const serializedAttrs: string[] = [];

    if (tag === "a") {
      const hrefAttr = attrs.find((a) => a.name === "href");
      const safeHref = hrefAttr ? isSafeHttpUrl(hrefAttr.value, false) : null;
      if (safeHref) {
        serializedAttrs.push(`href="${escapeText(safeHref)}"`);
      }
      serializedAttrs.push('rel="noopener noreferrer"', 'target="_blank"');
    } else if (tag === "img") {
      const srcAttr = attrs.find((a) => a.name === "src");
      const altAttr = attrs.find((a) => a.name === "alt");
      const safeSrc = srcAttr ? isSafeHttpUrl(srcAttr.value, true) : null;
      if (safeSrc) {
        serializedAttrs.push(`src="${escapeText(safeSrc)}"`);
      }
      if (altAttr && altAttr.value.trim()) {
        serializedAttrs.push(`alt="${escapeText(altAttr.value.trim())}"`);
      }
      serializedAttrs.push('loading="lazy"');
    }

    const attrSuffix = serializedAttrs.length > 0 ? ` ${serializedAttrs.join(" ")}` : "";
    out += VOID_TAGS.has(tag) ? `<${tag}${attrSuffix}>` : `<${tag}${attrSuffix}>`;
  }

  if (cursor < withoutComments.length && !skipDepthTag) {
    out += withoutComments.slice(cursor);
  }

  return out;
}

export function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return sanitizeWithWhitelistSerializer(rawHtml);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  const cleanNode = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          if (STRIP_WITH_CONTENT_TAGS.has(tag)) {
            el.remove();
            continue;
          }
          const frag = doc.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          cleanNode(frag);
          el.replaceWith(frag);
          continue;
        }

        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim();
          const safeHref = tag === "a" && name === "href" ? isSafeHttpUrl(val, false) : null;
          const safeSrc = tag === "img" && name === "src" ? isSafeHttpUrl(val, true) : null;
          const keepAlt = tag === "img" && name === "alt";
          if (!safeHref && !safeSrc && !keepAlt) {
            el.removeAttribute(attr.name);
          } else if (safeHref && name === "href") {
            el.setAttribute("href", safeHref);
          } else if (safeSrc && name === "src") {
            el.setAttribute("src", safeSrc);
          }
        }
        if (tag === "a") {
          el.setAttribute("rel", "noopener noreferrer");
          el.setAttribute("target", "_blank");
        }
        if (tag === "img") {
          el.setAttribute("loading", "lazy");
        }
        cleanNode(el);
      }
    }
  };

  cleanNode(root);
  return root.innerHTML;
}
