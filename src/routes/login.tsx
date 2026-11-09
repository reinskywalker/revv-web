import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  AtSign,
  Check,
  Database,
  FileText,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Wordmark } from "@/components/revv/wordmark";
import { cn } from "@/lib/utils";
import {
  addGarageMotorcycle,
  type AdminDashboardStats,
  type AdminUserItem,
  AuthApiError,
  type BetaRegistrationRow,
  clearSavedSession,
  createAdminBrand,
  createAdminComponent,
  createAdminMotorcycle,
  createAdminNewsArticle,
  createStatusPost,
  deleteAdminBrand,
  deleteAdminComponent,
  deleteAdminMotorcycle,
  deleteAdminNewsArticle,
  deleteAdminUser,
  deleteBetaRegistration,
  deleteFeedPost,
  deleteGarageMotorcycle,
  fetchAdminBrands,
  fetchAdminComponents,
  fetchAdminDashboard,
  fetchAdminMotorcycles,
  fetchAdminUsers,
  fetchBetaRegistrations,
  fetchFeedPosts,
  fetchMasterMotorcycles,
  fetchMyGarage,
  fetchMyProfile,
  fetchNewsArticles,
  type FeedPostItem,
  type GarageMotorcycle,
  getSavedSession,
  type MasterBrandItem,
  type MasterComponentItem,
  type MasterMotorcycleItem,
  type NewsArticle,
  requestOtp,
  type RiderProfile,
  signInWithOtp,
  updateAdminUser,
  updateBetaRegistration,
  updateGarageMotorcycle,
  updateMyProfile,
} from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Rider Sign In & Portal — REVV- Web" },
      {
        name: "description",
        content:
          "Sign in to REVV- Web with your Rider ID and passwordless one-time verification code to access your Rider Portal, Digital Garage, Feed, or Administrator Console.",
      },
      { property: "og:title", content: "Rider Sign In & Portal — REVV- Web" },
      {
        property: "og:description",
        content:
          "Sign in to the friendly neighborhood riding companion. Access your Digital Garage, Rider Feed, and account settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://revv.asteralabs.digital/login" }],
  }),
  component: LoginPage,
});

type Step = "identifier" | "otp" | "verifying" | "success";
type RiderTab = "profile" | "garage" | "feed" | "admin";
type AdminSubTab = "overview" | "registrations" | "users" | "master" | "news";

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
  const [activeSession, setActiveSession] = useState<{
    token: string | null;
    riderId: string | null;
  }>({ token: null, riderId: null });

  // Portal state
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [garage, setGarage] = useState<GarageMotorcycle[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<MasterMotorcycleItem[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPostItem[]>([]);
  const [activeTab, setActiveTab] = useState<RiderTab>("profile");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  // Profile form state
  const [editUsername, setEditUsername] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVisibility, setEditVisibility] = useState("PUBLIC");

  // Garage form state
  const [selectedMasterBikeId, setSelectedMasterBikeId] = useState<string>("");
  const [bikeBrandManual, setBikeBrandManual] = useState("");
  const [bikeSeriesManual, setBikeSeriesManual] = useState("");
  const [bikeNickname, setBikeNickname] = useState("");
  const [bikeMileage, setBikeMileage] = useState("0");
  const [bikePlate, setBikePlate] = useState("");
  const [bikeTransmission, setBikeTransmission] = useState("matic");
  const [bikeCategory, setBikeCategory] = useState("scooter");
  const [bikePrimary, setBikePrimary] = useState(false);

  // Feed status post state
  const [statusCaption, setStatusCaption] = useState("");
  const [statusBikeLabel, setStatusBikeLabel] = useState("");
  const [statusVisibility, setStatusVisibility] = useState("PUBLIC");

  // Admin Console state
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>("overview");
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [betaRegistrations, setBetaRegistrations] = useState<BetaRegistrationRow[]>([]);
  const [adminBrands, setAdminBrands] = useState<MasterBrandItem[]>([]);
  const [adminMotorcycles, setAdminMotorcycles] = useState<MasterMotorcycleItem[]>([]);
  const [adminComponents, setAdminComponents] = useState<MasterComponentItem[]>([]);
  const [adminNews, setAdminNews] = useState<NewsArticle[]>([]);

  // Admin creation inputs
  const [newBrandName, setNewBrandName] = useState("");
  const [newMotoBrandId, setNewMotoBrandId] = useState<string>("");
  const [newMotoSeries, setNewMotoSeries] = useState("");
  const [newMotoTransmission, setNewMotoTransmission] = useState("manual");
  const [newMotoCategory, setNewMotoCategory] = useState("sport");
  const [newMotoCc, setNewMotoCc] = useState("250");
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompKm, setNewCompKm] = useState("4000");
  const [newCompMonths, setNewCompMonths] = useState("6");
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsCategory, setNewNewsCategory] = useState("PRODUCT");
  const [newNewsSummary, setNewNewsSummary] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isAdministrator = profile?.role?.toLowerCase() === "administrator";
  const canModerate =
    isAdministrator || profile?.role?.toLowerCase() === "moderator";

  const loadPortalData = useCallback(async () => {
    setPortalLoading(true);
    try {
      const [prof, gar, catalog, posts] = await Promise.all([
        fetchMyProfile(),
        fetchMyGarage().catch(() => []),
        fetchMasterMotorcycles().catch(() => []),
        fetchFeedPosts().catch(() => []),
      ]);
      setProfile(prof);
      setGarage(gar);
      setMasterCatalog(catalog);
      setFeedPosts(posts);

      setEditUsername(prof.username || "");
      setEditFirstName(prof.first_name || "");
      setEditLastName(prof.last_name || "");
      setEditCity(prof.city || "");
      setEditJob(prof.job || "");
      setEditBio(prof.bio || "");
      setEditVisibility(prof.account_visibility || "PUBLIC");

      if (prof.role?.toLowerCase() === "administrator") {
        const [stats, users, regs, brands, motos, comps, newsRes] = await Promise.all([
          fetchAdminDashboard().catch(() => null),
          fetchAdminUsers().catch(() => []),
          fetchBetaRegistrations().catch(() => []),
          fetchAdminBrands().catch(() => []),
          fetchAdminMotorcycles().catch(() => []),
          fetchAdminComponents().catch(() => []),
          fetchNewsArticles({ limit: 50 }).catch(() => ({ articles: [], fromFallback: false })),
        ]);
        setAdminStats(stats);
        setAdminUsers(users);
        setBetaRegistrations(regs);
        setAdminBrands(brands);
        setAdminMotorcycles(motos);
        setAdminComponents(comps);
        setAdminNews(newsRes.articles);
        if (brands.length > 0 && !newMotoBrandId) {
          setNewMotoBrandId(String(brands[0].id));
        }
      }
    } catch (err) {
      if (err instanceof AuthApiError && err.statusCode === 401) {
        clearSavedSession();
        setActiveSession({ token: null, riderId: null });
        setStep("identifier");
      }
    } finally {
      setPortalLoading(false);
    }
  }, [newMotoBrandId]);

  useEffect(() => {
    const session = getSavedSession();
    if (session.token && session.riderId) {
      setActiveSession({ token: session.token, riderId: session.riderId });
      setIdentifier(session.riderId);
      setStep("success");
    }
  }, []);

  useEffect(() => {
    if (step === "success" && activeSession.token) {
      void loadPortalData();
    }
  }, [step, activeSession.token, loadPortalData]);

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
      void handleVerify(next);
    }
  };

  const handleSignOut = () => {
    clearSavedSession();
    setActiveSession({ token: null, riderId: null });
    setProfile(null);
    setIdentifier("");
    setDigits(Array(OTP_LENGTH).fill(""));
    setErrorMessage(null);
    setIsAccountNotFound(false);
    setDevOtpEcho(null);
    setStep("identifier");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalNotice(null);
    try {
      const updated = await updateMyProfile({
        username: editUsername.trim() || undefined,
        first_name: editFirstName.trim() || undefined,
        last_name: editLastName.trim() || undefined,
        city: editCity.trim() || undefined,
        job: editJob.trim() || undefined,
        bio: editBio.trim() || undefined,
        account_visibility: editVisibility,
      });
      setProfile(updated);
      setPortalNotice("Profile updated and synced with mobile.");
    } catch (err) {
      setPortalNotice(err instanceof Error ? err.message : "Failed to update profile.");
    }
  };

  const handleAddMotorcycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalNotice(null);
    try {
      const masterId = selectedMasterBikeId ? Number(selectedMasterBikeId) : null;
      await addGarageMotorcycle({
        master_motorcycle_id: masterId,
        brand_manual: masterId ? undefined : bikeBrandManual.trim(),
        series_manual: masterId ? undefined : bikeSeriesManual.trim(),
        nickname: bikeNickname.trim() || undefined,
        current_mileage: Number(bikeMileage) || 0,
        plate_number: bikePlate.trim() || undefined,
        transmission: bikeTransmission,
        category: bikeCategory,
        is_primary: bikePrimary,
      });
      setBikeBrandManual("");
      setBikeSeriesManual("");
      setBikeNickname("");
      setBikePlate("");
      setBikeMileage("0");
      const gar = await fetchMyGarage();
      setGarage(gar);
      setPortalNotice("Machine added to your Digital Garage.");
    } catch (err) {
      setPortalNotice(err instanceof Error ? err.message : "Failed to add motorcycle.");
    }
  };

  const handlePostStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusCaption.trim()) return;
    setPortalNotice(null);
    try {
      await createStatusPost({
        caption: statusCaption.trim(),
        visibility: statusVisibility,
        motorcycle_label: statusBikeLabel.trim() || undefined,
      });
      setStatusCaption("");
      const posts = await fetchFeedPosts();
      setFeedPosts(posts);
      setPortalNotice("Status posted to Rider Feed.");
    } catch (err) {
      setPortalNotice(err instanceof Error ? err.message : "Failed to post status.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Cockpit top bar */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link
            to="/"
            aria-label="REVV- Web home"
            className="transition-opacity hover:opacity-80"
          >
            <Wordmark className="text-2xl" />
          </Link>
          <div className="flex items-center gap-3">
            {step === "success" && profile && (
              <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                {profile.role.toUpperCase()}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
              <ShieldCheck className="size-4 text-primary" />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                Rider ID
              </span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:py-14">
        {step !== "success" ? (
          <div className="mx-auto w-full max-w-md">
            <div className="text-center sm:text-left">
              <p className="eyebrow">REVV- Web / Rider Portal</p>
              <h1 className="display-heading mt-2 text-4xl sm:text-5xl">
                Rider Sign In
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Sign in with a one-time verification code to access your Profile, Digital Garage,
                Rider Feed, or Administrator Console.
              </p>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="text-xs leading-relaxed text-muted-foreground">
                Don't have a Rider ID yet?{" "}
                <Link to="/register" className="font-semibold text-primary underline">
                  Apply for Closed Beta access
                </Link>{" "}
                or register via the REVV mobile app.
              </div>
            </div>

            {step === "identifier" && (
              <div className="mt-6">
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
                            <Link to="/register" className="text-primary underline">
                              Register for Closed Beta
                            </Link>{" "}
                            or create your account on the REVV mobile app.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    A 6-digit one-time passcode (OTP) will be sent to your verified email or phone.
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
          </div>
        ) : (
          /* Authenticated Rider Portal & Administrator Console */
          <div className="space-y-8">
            <div className="hud-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  {isAdministrator
                    ? "Administrator Superuser Cockpit"
                    : canModerate
                      ? "Moderator & Rider Cockpit"
                      : "Authenticated Rider Cockpit"}
                </p>
                <h1 className="display-heading mt-1 text-3xl sm:text-4xl">
                  {profile?.name || profile?.username || identifier || activeSession.riderId}
                </h1>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {profile?.noreg ? `${profile.noreg} · ` : ""}
                  {profile?.email || identifier} · Role:{" "}
                  <strong className="uppercase text-foreground">
                    {profile?.role || "user"}
                  </strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadPortalData()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-secondary"
                >
                  <RefreshCw className={cn("size-4", portalLoading && "animate-spin")} />
                  Sync
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive hover:bg-destructive/20"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>

            {portalNotice && (
              <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-5 py-3.5 text-sm text-foreground">
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  {portalNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setPortalNotice(null)}
                  className="font-mono text-xs uppercase text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Primary Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-4">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition-colors",
                  activeTab === "profile"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <UserCheck className="size-4" />
                Profile & Status
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("garage")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition-colors",
                  activeTab === "garage"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <Wrench className="size-4" />
                Digital Garage ({garage.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("feed")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition-colors",
                  activeTab === "feed"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <MessageSquare className="size-4" />
                Rider Feed ({feedPosts.length})
              </button>
              {isAdministrator && (
                <button
                  type="button"
                  onClick={() => setActiveTab("admin")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition-colors",
                    activeTab === "admin"
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
                  )}
                >
                  <LayoutDashboard className="size-4" />
                  Administrator Console
                </button>
              )}
            </div>

            {/* TAB 1: PROFILE & STATUS */}
            {activeTab === "profile" && (
              <div className="grid gap-6 md:grid-cols-2">
                <form onSubmit={handleSaveProfile} className="hud-card space-y-4 p-6">
                  <h2 className="font-display text-xl font-black uppercase tracking-tight">
                    Rider Identity & Sync
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Visibility
                      </label>
                      <select
                        value={editVisibility}
                        onChange={(e) => setEditVisibility(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      >
                        <option value="PUBLIC" className="bg-background">
                          PUBLIC
                        </option>
                        <option value="PRIVATE" className="bg-background">
                          PRIVATE
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        City
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Occupation / Crew Role
                      </label>
                      <input
                        type="text"
                        value={editJob}
                        onChange={(e) => setEditJob(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-xs uppercase text-muted-foreground">
                      Bio / Status Tagline
                    </label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    Save Rider Profile
                  </button>
                </form>

                <form onSubmit={handlePostStatus} className="hud-card space-y-4 p-6">
                  <h2 className="font-display text-xl font-black uppercase tracking-tight">
                    Broadcast Rider Status
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Post an update to the Rider Feed — synced with the REVV mobile app.
                  </p>
                  <div>
                    <label className="font-mono text-xs uppercase text-muted-foreground">
                      Status Message
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={statusCaption}
                      onChange={(e) => setStatusCaption(e.target.value)}
                      placeholder="Sunday morning run to Sentul — roads are dry and clear!"
                      className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Machine Tag (Optional)
                      </label>
                      <input
                        type="text"
                        value={statusBikeLabel}
                        onChange={(e) => setStatusBikeLabel(e.target.value)}
                        placeholder="Yamaha XMAX 250"
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Visibility
                      </label>
                      <select
                        value={statusVisibility}
                        onChange={(e) => setStatusVisibility(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                      >
                        <option value="PUBLIC" className="bg-background">
                          PUBLIC
                        </option>
                        <option value="FRIENDS_ONLY" className="bg-background">
                          FRIENDS ONLY
                        </option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    Post Status Update
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: DIGITAL GARAGE */}
            {activeTab === "garage" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <form onSubmit={handleAddMotorcycle} className="hud-card space-y-4 p-6">
                  <h2 className="font-display text-xl font-black uppercase tracking-tight">
                    Add Machine to Garage
                  </h2>
                  <div>
                    <label className="font-mono text-xs uppercase text-muted-foreground">
                      Select From Master Catalog
                    </label>
                    <select
                      value={selectedMasterBikeId}
                      onChange={(e) => setSelectedMasterBikeId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground"
                    >
                      <option value="" className="bg-background">
                        -- Custom / Manual Entry --
                      </option>
                      {masterCatalog.map((m) => (
                        <option key={m.id} value={String(m.id)} className="bg-background">
                          {m.brand_name} {m.series_name} ({m.transmission})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedMasterBikeId && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="font-mono text-xs uppercase text-muted-foreground">
                          Brand *
                        </label>
                        <input
                          type="text"
                          required={!selectedMasterBikeId}
                          value={bikeBrandManual}
                          onChange={(e) => setBikeBrandManual(e.target.value)}
                          placeholder="Kawasaki"
                          className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs uppercase text-muted-foreground">
                          Series / Model *
                        </label>
                        <input
                          type="text"
                          required={!selectedMasterBikeId}
                          value={bikeSeriesManual}
                          onChange={(e) => setBikeSeriesManual(e.target.value)}
                          placeholder="Ninja ZX-25R"
                          className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={bikeNickname}
                        onChange={(e) => setBikeNickname(e.target.value)}
                        placeholder="Night Fury"
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Odometer (km)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={bikeMileage}
                        onChange={(e) => setBikeMileage(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Transmission
                      </label>
                      <select
                        value={bikeTransmission}
                        onChange={(e) => setBikeTransmission(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      >
                        <option value="matic" className="bg-background">
                          Matic / CVT
                        </option>
                        <option value="manual" className="bg-background">
                          Manual / Clutch
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="font-mono text-xs uppercase text-muted-foreground">
                        Category
                      </label>
                      <select
                        value={bikeCategory}
                        onChange={(e) => setBikeCategory(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      >
                        <option value="scooter" className="bg-background">
                          Scooter
                        </option>
                        <option value="sport" className="bg-background">
                          Sport
                        </option>
                        <option value="naked" className="bg-background">
                          Naked
                        </option>
                        <option value="touring" className="bg-background">
                          Touring / Adventure
                        </option>
                        <option value="cruiser" className="bg-background">
                          Cruiser
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-xs uppercase text-muted-foreground">
                      Plate Number
                    </label>
                    <input
                      type="text"
                      value={bikePlate}
                      onChange={(e) => setBikePlate(e.target.value)}
                      placeholder="B 1234 REV"
                      className="mt-1 w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={bikePrimary}
                      onChange={(e) => setBikePrimary(e.target.checked)}
                    />
                    Set as primary riding machine
                  </label>

                  <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
                    <Plus className="size-4" />
                    Add to Digital Garage
                  </button>
                </form>

                <div className="space-y-4 lg:col-span-2">
                  {garage.length === 0 ? (
                    <div className="hud-card p-8 text-center text-muted-foreground">
                      No motorcycles in your Digital Garage yet. Add your first machine on the left.
                    </div>
                  ) : (
                    garage.map((bike) => (
                      <div
                        key={bike.id}
                        className="hud-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs uppercase tracking-wider text-primary">
                              {bike.brand_name || "Motorcycle"} · {bike.category}
                            </span>
                            {bike.is_primary && (
                              <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <h3 className="font-display mt-1 text-2xl font-bold uppercase">
                            {bike.nickname || bike.series_name || bike.name}
                          </h3>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            Model: {bike.series_name || bike.name} · Odometer:{" "}
                            {bike.current_mileage.toLocaleString()} km · Transmission:{" "}
                            {bike.transmission}
                            {bike.plate_number ? ` · Plate: ${bike.plate_number}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextKm = window.prompt(
                                "Update odometer mileage (km):",
                                String(bike.current_mileage),
                              );
                              if (!nextKm) return;
                              const parsed = Number(nextKm);
                              if (Number.isNaN(parsed) || parsed < 0) return;
                              await updateGarageMotorcycle(bike.id, { current_mileage: parsed });
                              setGarage(await fetchMyGarage());
                            }}
                            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-xs uppercase hover:bg-secondary"
                          >
                            Update KM
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteGarageMotorcycle(bike.id);
                              setGarage(await fetchMyGarage());
                            }}
                            className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                            aria-label="Delete motorcycle"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: RIDER FEED & MODERATION */}
            {activeTab === "feed" && (
              <div className="space-y-4">
                {feedPosts.length === 0 ? (
                  <div className="hud-card p-8 text-center text-muted-foreground">
                    No feed posts yet. Broadcast a status update from your Profile tab!
                  </div>
                ) : (
                  feedPosts.map((post) => (
                    <div
                      key={post.id}
                      className="hud-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-start"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">
                            {post.author_display_name}
                          </span>
                          <span className="font-mono text-xs text-primary">
                            @{post.author_username}
                          </span>
                          {post.motorcycle_label && (
                            <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                              {post.motorcycle_label}
                            </span>
                          )}
                          <span className="font-mono text-xs text-muted-foreground">
                            · {new Date(post.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-line text-base text-foreground/90">
                          {post.caption}
                        </p>
                        <p className="mt-3 font-mono text-xs text-muted-foreground">
                          Likes: {post.like_count} · Comments: {post.comment_count} · Visibility:{" "}
                          {post.visibility}
                        </p>
                      </div>
                      {(canModerate || post.author_id === profile?.id) && (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteFeedPost(post.id);
                            setFeedPosts(await fetchFeedPosts());
                            setPortalNotice("Feed post removed.");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs uppercase text-destructive hover:bg-destructive/20"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: ADMINISTRATOR CONSOLE (Role::Administrator only) */}
            {activeTab === "admin" && isAdministrator && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["overview", "Dashboard", LayoutDashboard],
                      ["registrations", `Beta Roster (${betaRegistrations.length})`, UserCheck],
                      ["users", `Users & RBAC (${adminUsers.length})`, Users],
                      ["master", "Master Data CRUD", Database],
                      ["news", `News CMS (${adminNews.length})`, FileText],
                    ] as const
                  ).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAdminSubTab(key)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
                        adminSubTab === key
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Admin Subtab: Overview */}
                {adminSubTab === "overview" && adminStats && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Active Users", adminStats.active_users],
                      ["Suspended / Deleted", `${adminStats.suspended_users} / ${adminStats.deleted_users}`],
                      ["Pending Beta Roster", adminStats.pending_registrations],
                      ["Approved Beta Roster", adminStats.approved_registrations],
                      ["Digital Garages", adminStats.total_garages],
                      ["Feed Posts", adminStats.total_feed_posts],
                      ["Master Motorcycles", adminStats.total_master_motorcycles],
                      ["Master Components", adminStats.total_master_components],
                    ].map(([title, value]) => (
                      <div key={String(title)} className="hud-card p-5">
                        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                          {title}
                        </p>
                        <p className="display-heading mt-2 text-3xl text-primary">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Subtab: Beta Registrations */}
                {adminSubTab === "registrations" && (
                  <div className="space-y-3">
                    {betaRegistrations.length === 0 ? (
                      <div className="hud-card p-8 text-center text-muted-foreground">
                        No beta pre-registrations submitted yet.
                      </div>
                    ) : (
                      betaRegistrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="hud-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-foreground">{reg.full_name}</span>
                              <span className="font-mono text-xs text-primary">{reg.email}</span>
                              <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                                {reg.status}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              Play Store: {reg.playstore_email || reg.email} · Phone:{" "}
                              {reg.phone || "-"} · City: {reg.city || "-"} · Bike:{" "}
                              {reg.motorcycle_brand || "-"} {reg.motorcycle_series || ""}
                            </p>
                            {reg.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Notes: "{reg.notes}"
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {(["approved", "invited", "rejected"] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={async () => {
                                  await updateBetaRegistration(reg.id, { status: st });
                                  setBetaRegistrations(await fetchBetaRegistrations());
                                }}
                                className="rounded border border-border bg-secondary/60 px-2.5 py-1.5 font-mono text-[11px] uppercase hover:border-primary hover:text-primary"
                              >
                                {st}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteBetaRegistration(reg.id);
                                setBetaRegistrations(await fetchBetaRegistrations());
                              }}
                              className="rounded border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Admin Subtab: Users & RBAC */}
                {adminSubTab === "users" && (
                  <div className="space-y-3">
                    {adminUsers.map((u) => (
                      <div
                        key={u.id}
                        className="hud-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground">
                              {u.username ? `@${u.username}` : u.email || u.phone || u.id}
                            </span>
                            {u.noreg && (
                              <span className="font-mono text-xs text-primary">{u.noreg}</span>
                            )}
                            <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] uppercase">
                              Role: {u.role}
                            </span>
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 font-mono text-[10px] uppercase",
                                u.status === "Active"
                                  ? "bg-success/20 text-success"
                                  : "bg-destructive/20 text-destructive",
                              )}
                            >
                              {u.status}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            Email: {u.email || "-"} · Phone: {u.phone || "-"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={u.role.toLowerCase()}
                            onChange={async (e) => {
                              await updateAdminUser(u.id, { role: e.target.value });
                              setAdminUsers(await fetchAdminUsers());
                              setPortalNotice(`Updated role for ${u.email || u.username}`);
                            }}
                            className="rounded border border-input bg-secondary/60 px-2.5 py-1.5 font-mono text-xs uppercase text-foreground"
                          >
                            <option value="user" className="bg-background">
                              user
                            </option>
                            <option value="moderator" className="bg-background">
                              moderator
                            </option>
                            <option value="administrator" className="bg-background">
                              administrator
                            </option>
                          </select>

                          <select
                            value={u.status}
                            onChange={async (e) => {
                              await updateAdminUser(u.id, { status: e.target.value });
                              setAdminUsers(await fetchAdminUsers());
                              setPortalNotice(`Updated status for ${u.email || u.username}`);
                            }}
                            className="rounded border border-input bg-secondary/60 px-2.5 py-1.5 font-mono text-xs uppercase text-foreground"
                          >
                            <option value="Active" className="bg-background">
                              Active
                            </option>
                            <option value="Suspended" className="bg-background">
                              Suspended
                            </option>
                            <option value="Banned" className="bg-background">
                              Banned
                            </option>
                            <option value="Deleted" className="bg-background">
                              Deleted
                            </option>
                          </select>

                          {u.id !== profile?.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAdminUser(u.id);
                                setAdminUsers(await fetchAdminUsers());
                                setPortalNotice("User soft-deleted and tokens revoked.");
                              }}
                              className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 font-mono text-xs uppercase text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="size-3.5" />
                              Soft Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Subtab: Master Data CRUD */}
                {adminSubTab === "master" && (
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Brands CRUD */}
                    <div className="hud-card space-y-4 p-5">
                      <h3 className="font-display text-lg font-bold uppercase">
                        Master Brands ({adminBrands.length})
                      </h3>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newBrandName.trim()) return;
                          await createAdminBrand({ name: newBrandName.trim(), is_active: true });
                          setNewBrandName("");
                          setAdminBrands(await fetchAdminBrands());
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          placeholder="New brand name..."
                          className="flex-1 rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                        />
                        <button
                          type="submit"
                          className="rounded bg-primary px-3 py-2 font-mono text-xs font-bold uppercase text-primary-foreground"
                        >
                          Add
                        </button>
                      </form>
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {adminBrands.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs"
                          >
                            <span>
                              {b.name}{" "}
                              {!b.is_active && (
                                <span className="text-muted-foreground">(Archived)</span>
                              )}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateAdminBrand(b.id, { is_active: !b.is_active });
                                  setAdminBrands(await fetchAdminBrands());
                                }}
                                className="font-mono text-[10px] uppercase text-primary underline"
                              >
                                {b.is_active ? "Archive" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteAdminBrand(b.id);
                                  setAdminBrands(await fetchAdminBrands());
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Motorcycles CRUD */}
                    <div className="hud-card space-y-4 p-5">
                      <h3 className="font-display text-lg font-bold uppercase">
                        Master Motorcycles ({adminMotorcycles.length})
                      </h3>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newMotoBrandId || !newMotoSeries.trim()) return;
                          await createAdminMotorcycle({
                            brand_id: Number(newMotoBrandId),
                            series_name: newMotoSeries.trim(),
                            transmission: newMotoTransmission,
                            category: newMotoCategory,
                            engine_cc: Number(newMotoCc) || 150,
                            is_active: true,
                          });
                          setNewMotoSeries("");
                          setAdminMotorcycles(await fetchAdminMotorcycles());
                        }}
                        className="space-y-2"
                      >
                        <select
                          value={newMotoBrandId}
                          onChange={(e) => setNewMotoBrandId(e.target.value)}
                          className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                        >
                          {adminBrands.map((b) => (
                            <option key={b.id} value={String(b.id)} className="bg-background">
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newMotoSeries}
                          onChange={(e) => setNewMotoSeries(e.target.value)}
                          placeholder="Series name (e.g. XMAX Connected)"
                          className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={newMotoTransmission}
                            onChange={(e) => setNewMotoTransmission(e.target.value)}
                            className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground"
                          >
                            <option value="matic" className="bg-background">
                              matic
                            </option>
                            <option value="manual" className="bg-background">
                              manual
                            </option>
                          </select>
                          <select
                            value={newMotoCategory}
                            onChange={(e) => setNewMotoCategory(e.target.value)}
                            className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground"
                          >
                            <option value="scooter" className="bg-background">
                              scooter
                            </option>
                            <option value="sport" className="bg-background">
                              sport
                            </option>
                            <option value="naked" className="bg-background">
                              naked
                            </option>
                            <option value="touring" className="bg-background">
                              touring
                            </option>
                          </select>
                          <input
                            type="number"
                            value={newMotoCc}
                            onChange={(e) => setNewMotoCc(e.target.value)}
                            placeholder="CC"
                            className="rounded border border-input bg-secondary/40 px-2 py-1.5 text-xs text-foreground"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded bg-primary py-2 font-mono text-xs font-bold uppercase text-primary-foreground"
                        >
                          Add Motorcycle
                        </button>
                      </form>
                      <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                        {adminMotorcycles.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs"
                          >
                            <span>
                              {m.brand_name} {m.series_name} ({m.engine_cc || "-"}cc)
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAdminMotorcycle(m.id);
                                setAdminMotorcycles(await fetchAdminMotorcycles());
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Components CRUD */}
                    <div className="hud-card space-y-4 p-5">
                      <h3 className="font-display text-lg font-bold uppercase">
                        Master Components ({adminComponents.length})
                      </h3>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newCompCode.trim() || !newCompName.trim()) return;
                          await createAdminComponent({
                            code: newCompCode.trim(),
                            name: newCompName.trim(),
                            default_interval_km: Number(newCompKm) || 4000,
                            default_interval_months: Number(newCompMonths) || 6,
                            applicable_transmission: ["matic", "manual"],
                            is_active: true,
                          });
                          setNewCompCode("");
                          setNewCompName("");
                          setAdminComponents(await fetchAdminComponents());
                        }}
                        className="space-y-2"
                      >
                        <input
                          type="text"
                          value={newCompCode}
                          onChange={(e) => setNewCompCode(e.target.value)}
                          placeholder="Code (e.g. ENGINE_OIL)"
                          className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                        />
                        <input
                          type="text"
                          value={newCompName}
                          onChange={(e) => setNewCompName(e.target.value)}
                          placeholder="Component Name"
                          className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={newCompKm}
                            onChange={(e) => setNewCompKm(e.target.value)}
                            placeholder="Interval KM"
                            className="rounded border border-input bg-secondary/40 px-3 py-1.5 text-xs text-foreground"
                          />
                          <input
                            type="number"
                            value={newCompMonths}
                            onChange={(e) => setNewCompMonths(e.target.value)}
                            placeholder="Interval Months"
                            className="rounded border border-input bg-secondary/40 px-3 py-1.5 text-xs text-foreground"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded bg-primary py-2 font-mono text-xs font-bold uppercase text-primary-foreground"
                        >
                          Add Component
                        </button>
                      </form>
                      <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                        {adminComponents.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs"
                          >
                            <span>
                              {c.name} ({c.default_interval_km || "-"} km)
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAdminComponent(c.id);
                                setAdminComponents(await fetchAdminComponents());
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Subtab: News CMS */}
                {adminSubTab === "news" && (
                  <div className="grid gap-6 lg:grid-cols-3">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newNewsTitle.trim() || !newNewsContent.trim()) return;
                        await createAdminNewsArticle({
                          title: newNewsTitle.trim(),
                          category: newNewsCategory,
                          summary: newNewsSummary.trim() || newNewsTitle.trim(),
                          content: newNewsContent.trim(),
                          is_highlight: false,
                        });
                        setNewNewsTitle("");
                        setNewNewsSummary("");
                        setNewNewsContent("");
                        const res = await fetchNewsArticles({ limit: 50 });
                        setAdminNews(res.articles);
                        setPortalNotice("News article published.");
                      }}
                      className="hud-card space-y-3 p-5"
                    >
                      <h3 className="font-display text-lg font-bold uppercase">
                        Publish News Article
                      </h3>
                      <input
                        type="text"
                        required
                        value={newNewsTitle}
                        onChange={(e) => setNewNewsTitle(e.target.value)}
                        placeholder="Article headline"
                        className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                      />
                      <input
                        type="text"
                        value={newNewsCategory}
                        onChange={(e) => setNewNewsCategory(e.target.value)}
                        placeholder="Category (MAINTENANCE, SAFETY, PRODUCT)"
                        className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                      />
                      <textarea
                        rows={2}
                        value={newNewsSummary}
                        onChange={(e) => setNewNewsSummary(e.target.value)}
                        placeholder="Short summary"
                        className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                      />
                      <textarea
                        rows={5}
                        required
                        value={newNewsContent}
                        onChange={(e) => setNewNewsContent(e.target.value)}
                        placeholder="Full article body..."
                        className="w-full rounded border border-input bg-secondary/40 px-3 py-2 text-xs text-foreground"
                      />
                      <button type="submit" className="btn-primary w-full">
                        Publish Article
                      </button>
                    </form>

                    <div className="space-y-3 lg:col-span-2">
                      {adminNews.map((art) => (
                        <div
                          key={art.id}
                          className="hud-card flex items-center justify-between gap-4 p-5"
                        >
                          <div>
                            <span className="font-mono text-[10px] uppercase text-primary">
                              {art.category} · {art.author_name}
                            </span>
                            <h4 className="font-display text-lg font-bold">{art.title}</h4>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {art.summary}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteAdminNewsArticle(art.id);
                              const res = await fetchNewsArticles({ limit: 50 });
                              setAdminNews(res.articles);
                            }}
                            className="rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-12 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/75">
          REVV- Web · asteralabs.digital
        </p>
      </main>
    </div>
  );
}
