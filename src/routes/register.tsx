import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, ShieldCheck, Smartphone, Wrench } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Join REVV — Digital Cockpit & Community" },
      {
        name: "description",
        content:
          "Sign in with your rider account or download the REVV companion app to access turn-by-turn navigation, Digital Garage, and rider clubs.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 pb-20 pt-28">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl space-y-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
            REVV Rider Portal
          </p>
          <h1 className="display-heading text-3xl sm:text-5xl font-black uppercase text-foreground">
            Your motorcycle cockpit, unlocked.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Open beta registration is now unified directly through Rider Sign In. Log in with your
            email, Google account, or rider handle to manage your Digital Garage, track service
            reminders, and ride with your squad.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-2">
              <Wrench className="size-5 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase">Digital Garage</h3>
              <p className="text-xs text-muted-foreground">
                Track wear intervals, odometer milestones, and service logs with automated alerts.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-2">
              <Compass className="size-5 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase">Squad Ride Sessions</h3>
              <p className="text-xs text-muted-foreground">
                Live GPS map sharing, group voice intercom, and Road Captain priority mode.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-2">
              <ShieldCheck className="size-5 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase">Passwordless OTP</h3>
              <p className="text-xs text-muted-foreground">
                Fast verification straight to your inbox with no passwords to remember.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link to="/login" className="btn-primary">
              Sign In / Create Rider Account
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/leaderboard" className="btn-ghost">
              <Smartphone className="size-4" />
              View Rider Leaderboard
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
