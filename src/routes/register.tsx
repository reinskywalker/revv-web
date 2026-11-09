import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { AuthApiError, submitBetaRegistration } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Closed Beta Registration — REVV- Web" },
      {
        name: "description",
        content:
          "Apply for REVV Closed Beta access on Android Play Store. Register your rider profile, city, and primary motorcycle to join the neighborhood crew.",
      },
      { property: "og:title", content: "Closed Beta Registration — REVV- Web" },
      {
        property: "og:description",
        content:
          "Apply for REVV Closed Beta access. Turn-by-turn navigation, crew feeds, communities, and Digital Garage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://revv.asteralabs.digital/register" }],
  }),
  component: RegisterPage,
});

const RIDING_STYLES = [
  "Daily Commuter",
  "Weekend Sunmori",
  "Long-Distance Touring",
  "Track / Sport",
  "Club / Pack Riding",
];

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [playstoreEmail, setPlaystoreEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [motorcycleBrand, setMotorcycleBrand] = useState("");
  const [motorcycleSeries, setMotorcycleSeries] = useState("");
  const [ridingStyle, setRidingStyle] = useState(RIDING_STYLES[1]);
  const [referralSource, setReferralSource] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    id: string;
    status: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (fullName.trim().length < 2) {
      setErrorMsg("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!email.trim().includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBetaRegistration({
        full_name: fullName.trim(),
        email: email.trim(),
        playstore_email: (playstoreEmail.trim() || email.trim()),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        motorcycle_brand: motorcycleBrand.trim() || undefined,
        motorcycle_series: motorcycleSeries.trim() || undefined,
        riding_style: ridingStyle || undefined,
        referral_source: referralSource.trim() || undefined,
        notes: notes.trim() || undefined,
        website: website || undefined,
      });
      setSubmittedData(res);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Unable to submit your registration right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-20 pt-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="size-4" />
            Closed Beta Roster
          </span>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl">
            Join the Closed Beta
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Register your rider profile and Google Play email for early access to the REVV Android
            companion, turn-by-turn HUD navigation, group intercom, and Digital Garage.
          </p>
        </div>

        {submittedData ? (
          <div className="hud-card mt-10 p-8 sm:p-10">
            <div className="flex size-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
              <Check className="size-8 text-success" strokeWidth={2.5} />
            </div>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.25em] text-primary">
              Registration Recorded · Status: {submittedData.status.toUpperCase()}
            </p>
            <h2 className="display-heading mt-2 text-3xl">
              You're on the REVV Beta Roster
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              We've logged your application under{" "}
              <span className="font-semibold text-foreground">{email.trim()}</span>. Once the
              Administrator approves your Play Store invite or your account is activated, you can
              sign in directly on mobile and web using a passwordless OTP code.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="btn-primary">
                Go to Rider Sign In
                <ArrowRight className="size-5" />
              </Link>
              <Link to="/" className="btn-ghost">
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="hud-card mt-10 space-y-6 p-7 sm:p-10">
            {/* Honeypot field hidden from human users */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="revv-website-hp">Website</label>
              <input
                id="revv-website-hp"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="reg-full-name"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Full Name *
                </label>
                <input
                  id="reg-full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Raka Wijaya"
                  className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Primary Email *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@gmail.com"
                  className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-playstore-email"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Google Play Store Email
                </label>
                <div className="relative mt-2">
                  <Smartphone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="reg-playstore-email"
                    type="email"
                    value={playstoreEmail}
                    onChange={(e) => setPlaystoreEmail(e.target.value)}
                    placeholder="Same as primary if blank"
                    className="w-full rounded-lg border border-input bg-secondary/40 py-3.5 pl-10 pr-4 text-base text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-phone"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  WhatsApp / Phone Number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812..."
                  className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-city"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  City / Riding Base
                </label>
                <div className="relative mt-2">
                  <MapPin className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="reg-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta Selatan, Bandung, Surabaya..."
                    className="w-full rounded-lg border border-input bg-secondary/40 py-3.5 pl-10 pr-4 text-base text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-style"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Primary Riding Style
                </label>
                <select
                  id="reg-style"
                  value={ridingStyle}
                  onChange={(e) => setRidingStyle(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
                >
                  {RIDING_STYLES.map((style) => (
                    <option key={style} value={style} className="bg-background text-foreground">
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reg-brand"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Motorcycle Brand
                </label>
                <div className="relative mt-2">
                  <Wrench className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="reg-brand"
                    type="text"
                    value={motorcycleBrand}
                    onChange={(e) => setMotorcycleBrand(e.target.value)}
                    placeholder="Yamaha, Honda, Kawasaki, Ducati..."
                    className="w-full rounded-lg border border-input bg-secondary/40 py-3.5 pl-10 pr-4 text-base text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-series"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
                >
                  Motorcycle Model / Series
                </label>
                <input
                  id="reg-series"
                  type="text"
                  value={motorcycleSeries}
                  onChange={(e) => setMotorcycleSeries(e.target.value)}
                  placeholder="XMAX 250, ZX-25R, CB650R..."
                  className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-referral"
                className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
              >
                Club / Crew or Referral Source
              </label>
              <input
                id="reg-referral"
                type="text"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                placeholder="Community name, friend's @username, or Instagram"
                className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="reg-notes"
                className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground"
              >
                Riding Notes (Optional)
              </label>
              <textarea
                id="reg-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us what routes you ride or what features you want to test first..."
                className="mt-2 w-full rounded-lg border border-input bg-secondary/40 px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            {errorMsg && (
              <div
                className={cn(
                  "rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive",
                )}
              >
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Already have an active REVV Rider ID?{" "}
                <Link to="/login" className="font-semibold text-primary underline">
                  Sign in here
                </Link>
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="size-5 animate-spin" />}
                <span>{isSubmitting ? "Submitting…" : "Join Closed Beta"}</span>
              </button>
            </div>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
