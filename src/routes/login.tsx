import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronRight,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Radio,
  ShieldCheck,
  User,
} from "lucide-react";
import { Wordmark } from "@/components/revv/wordmark";
import {
  AuthApiError,
  checkUrlForAuthTokens,
  fetchMyProfile,
  getSavedSession,
  requestOtp,
  signInWithOtp,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Rider Sign In — REVV Web" },
      {
        name: "description",
        content: "Sign in with OTP or OAuth to access your REVV Digital Garage, Community Feed, and rider telemetry.",
      },
    ],
  }),
  component: LoginPage,
});

type Step = "identifier" | "otp" | "verifying";
const OTP_LENGTH = 6;

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccountNotFound, setIsAccountNotFound] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devOtpEcho, setDevOtpEcho] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Check if OAuth callback passed tokens via URL query parameters
  useEffect(() => {
    const oauthSession = checkUrlForAuthTokens();
    if (oauthSession?.token) {
      void (async () => {
        try {
          const prof = await fetchMyProfile();
          login(
            {
              access_token: oauthSession.token,
              refresh_token: oauthSession.refreshToken || undefined,
            },
            prof,
          );
          if (prof.username) {
            navigate({ to: "/id/$username", params: { username: prof.username } });
          } else {
            navigate({ to: "/feed" });
          }
        } catch {
          // If profile fetch fails, stay on screen
        }
      })();
    }
  }, [login, navigate]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const handleSendCode = async () => {
    if (!identifier.trim()) {
      setErrorMessage("Enter your email or phone number to receive a verification code.");
      setIsAccountNotFound(false);
      return;
    }

    setErrorMessage(null);
    setIsAccountNotFound(false);
    setIsLoading(true);

    try {
      const res = await requestOtp(identifier.trim());
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
      const res = await signInWithOtp(identifier.trim(), joined);
      // Fetch latest profile info
      let profile = null;
      try {
        profile = await fetchMyProfile();
      } catch {
        // Fallback to basic session
      }

      login(res.tokens, profile || undefined);

      // Navigate directly away from /login!
      const targetUsername = profile?.username || res.username || res.identifier;
      if (targetUsername && !targetUsername.includes("@") && !targetUsername.startsWith("+")) {
        navigate({ to: "/id/$username", params: { username: targetUsername } });
      } else {
        navigate({ to: "/feed" });
      }
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
      void handleVerify(next);
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-lg py-8 sm:py-12">
      {/* Brand Header */}
      <div className="text-center">
        <Wordmark className="justify-center" />
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-primary">
          Cockpit Access Terminal
        </p>
      </div>

      {authLoading ? (
        <div className="hud-card mt-8 flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : isAuthenticated && user ? (
        /* ALREADY AUTHENTICATED STATE */
        <div className="hud-card mt-8 space-y-6 p-7">
          <div className="flex items-center gap-3 border-b border-border/50 pb-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary font-black text-xl">
              {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username ? user.username.charAt(0).toUpperCase() : "R"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                Session Active · {user.role.toUpperCase()}
              </span>
              <h2 className="font-display text-lg font-black uppercase text-foreground truncate">
                {user.first_name} {user.last_name}
              </h2>
              <p className="font-mono text-xs text-muted-foreground truncate">
                @{user.username || "rider"} · {user.email || user.phone_number || "Verified"}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            You are currently authenticated in the REVV Web Cockpit. Select a destination below:
          </p>

          <div className="grid gap-2.5">
            {user.username && (
              <Link
                to="/id/$username"
                params={{ username: user.username }}
                className="btn-primary flex items-center justify-between py-3"
              >
                <span className="flex items-center gap-2">
                  <User className="size-4" />
                  View My Public Profile (@{user.username})
                </span>
                <ChevronRight className="size-4" />
              </Link>
            )}

            <Link
              to="/garage"
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Bike className="size-4 text-primary" />
                Digital Garage Fleet
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              to="/feed"
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Radio className="size-4 text-primary" />
                Rider Community Feed
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            {(user.role.toLowerCase() === "administrator" || user.role.toLowerCase() === "moderator") && (
              <Link
                to="/admin"
                className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  Administrator Console
                </span>
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>

          <div className="pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-2.5 font-mono text-xs uppercase text-destructive transition-colors hover:bg-destructive/20"
            >
              <LogOut className="size-4" />
              Sign Out of Terminal
            </button>
          </div>
        </div>
      ) : (
        /* LOGIN STEP 1: IDENTIFIER INPUT */
        <>
          {step === "identifier" && (
            <div className="hud-card mt-8 p-7">
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-foreground">
                Rider Authentication
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Sign in with your registered phone number or email address.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Phone or Email Address
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSendCode();
                    }}
                    placeholder="+62812... or rider@example.com"
                    autoFocus
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 font-sans text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    <Info className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{errorMessage}</p>
                      {isAccountNotFound && (
                        <p className="mt-1 text-muted-foreground">
                          <Link to="/register" className="text-primary underline">
                            Register for Closed Beta
                          </Link>{" "}
                          or join via the REVV mobile app.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  A 6-digit one-time verification passcode (OTP) will be dispatched directly to your device.
                </p>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSendCode}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3"
                >
                  {isLoading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  <span>{isLoading ? "Dispatching Code…" : "Send Verification Code"}</span>
                </button>
              </div>
            </div>
          )}

          {/* LOGIN STEP 2: OTP VERIFICATION */}
          {(step === "otp" || step === "verifying") && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setStep("identifier");
                  setErrorMessage(null);
                }}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Change identifier
              </button>

              <div className="hud-card mt-4 p-7">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-black uppercase tracking-tight text-foreground">
                    Verification Passcode
                  </h3>
                  <span className="font-mono text-[10px] uppercase text-primary font-bold">
                    6-DIGIT OTP
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Passcode dispatched to <strong className="text-foreground">{identifier}</strong>.
                </p>

                {devOtpEcho && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 font-mono text-xs text-primary">
                    <span className="font-bold">Dev/Echo OTP:</span> {devOtpEcho}
                  </div>
                )}

                <div className="mt-6 flex gap-2 sm:gap-3">
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

                {step === "verifying" && (
                  <div className="mt-4 flex items-center justify-center gap-2 font-mono text-xs text-primary">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying security credentials…</span>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-mono">
                  <span className="text-muted-foreground">
                    Didn't receive the passcode?
                  </span>
                  {resendIn > 0 ? (
                    <span className="text-muted-foreground">Resend in {resendIn}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="text-primary hover:underline font-bold uppercase"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer pre-registration link */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <span>Don't have a REVV account yet? </span>
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Register for Closed Beta
        </Link>
      </div>
    </div>
  );
}
