import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  AtSign,
  Check,
  Info,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Wordmark } from "@/components/revv/wordmark";
import { cn } from "@/lib/utils";
import {
  AuthApiError,
  clearSavedSession,
  getSavedSession,
  requestOtp,
  signInWithOtp,
} from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Rider Sign In — REVV- Web" },
      {
        name: "description",
        content:
          "Sign in to REVV- Web with your Rider ID and passwordless one-time verification code. Web portal is sign-in only; registrations are managed through the REVV mobile app.",
      },
      { property: "og:title", content: "Rider Sign In — REVV- Web" },
      {
        property: "og:description",
        content:
          "Sign in to the friendly neighborhood riding companion. Web portal login only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" }, // Auth pages shouldn't be indexed
    ],
    links: [{ rel: "canonical", href: "https://revv.asteralabs.digital/login" }],
  }),
  component: LoginPage,
});

type Step = "identifier" | "otp" | "verifying" | "success";
const OTP_LENGTH = 6;

function LoginPage() {
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccountNotFound, setIsAccountNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [devOtpEcho, setDevOtpEcho] = useState<string | null>(null);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendIn, setResendIn] = useState(0);
  const [googleNote, setGoogleNote] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    token: string | null;
    riderId: string | null;
  }>({ token: null, riderId: null });

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const session = getSavedSession();
    if (session.token && session.riderId) {
      setActiveSession(session);
      setIdentifier(session.riderId);
      setStep("success");
    }
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const handleSendCode = async () => {
    if (!identifier.trim()) {
      setErrorMessage("Enter your email, username, or phone to get a code.");
      setIsAccountNotFound(false);
      return;
    }

    setErrorMessage(null);
    setIsAccountNotFound(false);
    setIsLoading(true);

    try {
      const res = await requestOtp(identifier);
      setIsLoading(false);
      setDigits(Array(OTP_LENGTH).fill(""));
      setResendIn(45);
      if (res.otpEcho) {
        setDevOtpEcho(res.otpEcho);
      }
      setStep("otp");
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    } catch (err) {
      setIsLoading(false);
      if (err instanceof AuthApiError) {
        setErrorMessage(err.message);
        setIsAccountNotFound(err.isNotFound);
      } else {
        setErrorMessage("Unexpected authentication error. Please try again.");
      }
    }
  };

  const handleVerify = async (code: string[]) => {
    const joined = code.join("");
    if (joined.length < OTP_LENGTH) {
      setErrorMessage("Enter the complete 6-digit code to continue.");
      return;
    }

    setErrorMessage(null);
    setStep("verifying");

    try {
      const res = await signInWithOtp(identifier, joined);
      setActiveSession({ token: res.tokens.access_token, riderId: res.identifier });
      setStep("success");
    } catch (err) {
      setStep("otp");
      if (err instanceof AuthApiError) {
        setErrorMessage(err.message);
        setIsAccountNotFound(err.isNotFound);
      } else {
        setErrorMessage("Verification failed. Please check the code and try again.");
      }
    }
  };

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < OTP_LENGTH; i++) {
      next[index + i] = clean.charAt(i);
    }
    setDigits(next);
    const focusIndex = Math.min(index + clean.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
    if (next.every((d) => d !== "")) {
      handleVerify(next);
    }
  };

  const handleSignOut = () => {
    clearSavedSession();
    setActiveSession({ token: null, riderId: null });
    setIdentifier("");
    setDigits(Array(OTP_LENGTH).fill(""));
    setErrorMessage(null);
    setIsAccountNotFound(false);
    setDevOtpEcho(null);
    setStep("identifier");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Cockpit top bar */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <Link
            to="/"
            aria-label="REVV- Web home"
            className="transition-opacity hover:opacity-80"
          >
            <Wordmark className="text-2xl" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
              <ShieldCheck className="size-4 text-primary" />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                Rider ID
              </span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-12 md:py-16">
        <div className="w-full max-w-md">
          {/* Header Title */}
          <div className="text-center sm:text-left">
            <p className="eyebrow">REVV- Web / Rider Portal</p>
            <h1 className="display-heading mt-2 text-4xl sm:text-5xl">
              {step === "success" ? "You're signed in" : "Rider Sign In"}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {step === "success"
                ? "Your rider session is active. Full riding, turn-by-turn HUD, and telemetry features run on the REVV mobile companion."
                : "Sign in with a one-time verification code. Passwordless, fast, and secure."}
            </p>
          </div>

          {/* Strict Policy Notice: Login Only, No Registration */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Sign-In Only Web Portal:</span>{" "}
              New rider registrations are disabled on this web app. If you don't have an account
              yet, please download the <strong className="text-foreground">REVV mobile app</strong> to register your machine and crew.
            </div>
          </div>

          {step === "identifier" && (
            <div className="mt-6">
              {/* Login Card */}
              <div className="hud-card p-7">
                <label
                  htmlFor="revv-identifier"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Email, username, or phone
                </label>
                <div className="relative mt-3">
                  <AtSign className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="revv-identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    disabled={isLoading}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrorMessage(null);
                      setIsAccountNotFound(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    placeholder="name@example.com or @username"
                    aria-invalid={Boolean(errorMessage)}
                    className={cn(
                      "w-full rounded-lg border bg-secondary/40 py-4 pl-12 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70",
                      errorMessage
                        ? "border-destructive focus:border-destructive"
                        : "border-input focus:border-primary",
                    )}
                  />
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div
                    className={cn(
                      "mt-4 flex items-start gap-2.5 rounded-lg border p-3.5 text-xs leading-relaxed",
                      isAccountNotFound
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        : "border-destructive/40 bg-destructive/10 text-destructive-foreground",
                    )}
                  >
                    {isAccountNotFound ? (
                      <ShieldAlert className="size-4 shrink-0 text-amber-400" />
                    ) : (
                      <Info className="size-4 shrink-0 text-destructive" />
                    )}
                    <div>
                      <p className="font-semibold">{errorMessage}</p>
                      {isAccountNotFound && (
                        <p className="mt-1 text-muted-foreground">
                          Registration is mobile-only. Install the REVV application to create an account.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  A 6-digit one-time passcode (OTP) will be verified against the REVV auth service.
                </p>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSendCode}
                  className="btn-primary mt-6 flex w-full items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="size-5 animate-spin" />}
                  <span>{isLoading ? "Sending Code…" : "Send Verification Code"}</span>
                </button>
              </div>

              {/* Alternative OAuth Divider */}
              <div className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  or
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={() => setGoogleNote(true)}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-foreground py-4 font-display text-base font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
              >
                Continue with Google
              </button>
              {googleNote && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Google SSO is synced with the REVV mobile app. For web sign-in, use your verification code.
                </p>
              )}
            </div>
          )}

          {step === "otp" && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setStep("identifier");
                  setErrorMessage(null);
                }}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Change identifier
              </button>

              <div className="hud-card mt-4 p-7">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                  Verification Code
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Code sent for <span className="font-semibold text-foreground">{identifier}</span>.
                </p>

                {devOtpEcho && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
                    <span className="font-semibold">Dev/Echo OTP:</span> {devOtpEcho}
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => setDigit(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digits[index] && index > 0) {
                          otpRefs.current[index - 1]?.focus();
                        }
                      }}
                      aria-label={`Digit ${index + 1}`}
                      className={cn(
                        "h-14 w-full rounded-lg border bg-secondary/40 text-center font-display text-2xl font-bold text-foreground outline-none transition-colors",
                        errorMessage
                          ? "border-destructive focus:border-destructive"
                          : "border-input focus:border-primary",
                      )}
                    />
                  ))}
                </div>

                {errorMessage && (
                  <p className="mt-3 text-xs text-destructive">{errorMessage}</p>
                )}

                <button
                  type="button"
                  onClick={() => handleVerify(digits)}
                  className="btn-primary mt-6 w-full"
                >
                  Verify & Sign In
                </button>

                <button
                  type="button"
                  disabled={resendIn > 0 || isLoading}
                  onClick={handleSendCode}
                  className="mt-4 w-full text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {resendIn > 0
                    ? `Resend code in 0:${String(resendIn).padStart(2, "0")}`
                    : "Resend verification code"}
                </button>
              </div>
            </div>
          )}

          {step === "verifying" && (
            <div className="hud-card mt-6 flex items-center justify-center gap-3 p-8 text-center">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-base text-muted-foreground">Verifying code with REVV Backend…</p>
            </div>
          )}

          {step === "success" && (
            <div className="hud-card mt-6 p-8 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
                <Check className="size-8 text-success" strokeWidth={2.5} />
              </div>
              <p className="mt-5 font-mono text-xs uppercase tracking-[0.25em] text-primary">
                Rider Authenticated
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Welcome to the Cockpit</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Signed in as <span className="font-semibold text-foreground">{identifier || activeSession.riderId}</span>.
              </p>

              <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4 text-left">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Mobile Companion Sync
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your rides, garage machinery, and club channels sync directly to your mobile app.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3">
                <Link to="/" className="btn-primary w-full">
                  Return to Home
                </Link>
                <Link
                  to="/news"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary/60 py-3 font-display text-sm font-bold uppercase tracking-wide text-foreground transition-colors hover:bg-secondary"
                >
                  Read Motorcycle News
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-destructive"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}

          <p className="mt-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/75">
            REVV- Web · asteralabs.digital
          </p>
        </div>
      </main>
    </div>
  );
}
