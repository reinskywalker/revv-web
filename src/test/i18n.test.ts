import { describe, expect, it } from "vitest";
import { formatWebMessage, normalizeWebLocale, SUPPORTED_WEB_LOCALES } from "@/lib/i18n";
import { WEB_MESSAGES, type WebLocale, type WebMessageKey } from "@/lib/i18n/messages";

const extractPlaceholders = (text: string): string[] =>
  Array.from(text.matchAll(/\{(\w+)\}/g))
    .map((m) => m[1]!)
    .sort();

describe("revv-web 4-language i18n parity (en, id, ja, de)", () => {
  it("keeps 100% key and placeholder parity across every locale", () => {
    const enKeys = Object.keys(WEB_MESSAGES.en).sort();
    expect(enKeys.length).toBeGreaterThan(40);

    for (const { code } of SUPPORTED_WEB_LOCALES) {
      const dict = WEB_MESSAGES[code];
      const keys = Object.keys(dict).sort();
      expect(keys, `Key mismatch for locale ${code}`).toEqual(enKeys);

      for (const key of enKeys as WebMessageKey[]) {
        expect(dict[key].trim().length, `Empty value for ${code}.${key}`).toBeGreaterThan(0);
        expect(extractPlaceholders(dict[key]), `Placeholder mismatch for ${code}.${key}`).toEqual(
          extractPlaceholders(WEB_MESSAGES.en[key]),
        );
      }
    }
  });

  it("normalizes browser locale tags and interpolates parameters accurately", () => {
    expect(normalizeWebLocale("id-ID")).toBe("id");
    expect(normalizeWebLocale("ja-JP")).toBe("ja");
    expect(normalizeWebLocale("de-DE")).toBe("de");
    expect(normalizeWebLocale("fr-FR")).toBe("en");

    const idText = formatWebMessage("id" as WebLocale, "clubCap.membersCount", {
      count: 25,
      limit: 30,
    });
    expect(idText).toBe("25 / 30 Anggota");
  });
});
