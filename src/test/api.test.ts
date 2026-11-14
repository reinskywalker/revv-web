import { describe, expect, it, beforeEach } from "vitest";
import {
  fetchNewsArticles,
  fetchNewsArticleBySlug,
  requestOtp,
  signInWithOtp,
  getSavedSession,
  clearSavedSession,
  AuthApiError,
  SEED_NEWS_ARTICLES,
  sanitizeRichHtml,
} from "../lib/api";

describe("REVV- Web API Client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("News Articles", () => {
    it("returns seed news articles when backend is unreachable", async () => {
      const result = await fetchNewsArticles();
      expect(result.articles).toBeDefined();
      expect(result.articles.length).toBeGreaterThan(0);
      expect(result.articles[0].title).toBe(SEED_NEWS_ARTICLES[0].title);
    });

    it("can retrieve a single article by slug", async () => {
      const slug = "pre-touring-checklist-preparing-brakes-tires-chain-for-cross-java-routes";
      const article = await fetchNewsArticleBySlug(slug);
      expect(article).not.toBeNull();
      expect(article?.category).toBe("MAINTENANCE");
    });
  });

  describe("Authentication & OTP Validation", () => {
    it("rejects empty identifier when requesting OTP", async () => {
      await expect(requestOtp("   ")).rejects.toThrow(AuthApiError);
    });

    it("validates 6-digit OTP requirement on sign-in", async () => {
      await expect(signInWithOtp("rider@test.com", "123")).rejects.toThrow(
        "Please enter a valid 6-digit verification code.",
      );
    });

    it("manages session tokens in localStorage", () => {
      expect(getSavedSession().token).toBeNull();
      localStorage.setItem("revv_access_token", "sample-token-jwt");
      localStorage.setItem("revv_rider_id", "rider_one");
      expect(getSavedSession().token).toBe("sample-token-jwt");
      expect(getSavedSession().riderId).toBe("rider_one");

      clearSavedSession();
      expect(getSavedSession().token).toBeNull();
      expect(getSavedSession().riderId).toBeNull();
    });
  });

  describe("HTML Sanitizer", () => {
    it("preserves safe formatting, quotes, and captioned figures while stripping scripts", () => {
      const clean = sanitizeRichHtml(
        '<p><b>Bold</b> <i>Italic</i> <u>Line</u></p><blockquote>Ride safe</blockquote><figure><img src="/uploads/media/a.webp" onerror="alert(1)" alt="Moto"/><figcaption>Image : Chain prep</figcaption></figure><script>alert(2)</script>',
      );
      expect(clean).toContain("<b>Bold</b>");
      expect(clean).toContain("<blockquote>Ride safe</blockquote>");
      expect(clean).toContain("<figcaption>Image : Chain prep</figcaption>");
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("onerror");
    });
  });
});
