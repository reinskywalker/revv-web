import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  MessageSquare,
  Navigation,
  Newspaper,
  Radar,
  Radio,
  Users,
  Wrench,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { FeedPhone, NavPhone, ProfilePhone } from "@/components/revv/phone-mockups";
import { Wordmark } from "@/components/revv/wordmark";
import heroNightRide from "@/assets/hero-night-ride.jpg";
import bikeDetail from "@/assets/bike-detail.jpg";
import routeMapDark from "@/assets/route-map-dark.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        name: "description",
        content:
          "REVV- Web is the motorcycle portal for neighborhood crews: turn-by-turn HUD navigation, rider feed, clubs, group voice intercom, and digital garage telemetry.",
      },
      { property: "og:site_name", content: "REVV- Web" },
      { property: "og:title", content: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        property: "og:description",
        content:
          "The riding companion for neighborhood crews: turn-by-turn navigation, rider feed, communities, group voice, and a digital garage. Start rides, share routes, and stay connected.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://revv.asteralabs.digital" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        name: "twitter:description",
        content:
          "Turn-by-turn navigation, crew feeds, communities, group voice, and a digital garage. Every road has a story.",
      },
      {
        name: "keywords",
        content:
          "REVV- Web, REVV, riding companion, motorcycle navigation, turn by turn HUD, motorcycle garage, rider community, intercom, asteralabs digital",
      },
    ],
    links: [{ rel: "canonical", href: "https://revv.asteralabs.digital" }],
  }),
  component: HomePage,
});

const pillars = [
  {
    number: "01",
    title: "Ride Together",
    body: "Start rides, drop routes, and keep the whole crew in one channel — from the first meet-up point to the last stop.",
  },
  {
    number: "02",
    title: "Navigate",
    body: "Turn-by-turn guidance built for two wheels. Pause when you stop for coffee, resume without splitting your stats into multiple trips.",
  },
  {
    number: "03",
    title: "Belong",
    body: "Find real motorcycle clubs, join riding events, and talk shop in threads and channels with riders near you.",
  },
];

const features = [
  {
    icon: Newspaper,
    title: "Rider Feed",
    body: "Post your machine, your route, your stories. Cheer the crew in the comments and catch every new post.",
  },
  {
    icon: Users,
    title: "Communities & Events",
    body: "Join or start real motorcycle clubs, discuss in threads, chat in channels, and coordinate riding events.",
  },
  {
    icon: MessageSquare,
    title: "Group Chat",
    body: "One place for the crew — plan the ride, share the road, settle where to eat.",
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero — dark cockpit identity */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <img
          src={heroNightRide}
          alt="A rider on a sport motorcycle crossing a rain-slick city street at night"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/40" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-6 pb-14 pt-28">
          <div className="flex flex-col items-center pt-[12vh]">
            <p className="eyebrow">Friendly Neighborhood Riding Companion</p>
            <Wordmark className="mt-6 text-[clamp(4rem,16vw,11rem)] leading-none" />
          </div>
          <div className="mt-16 max-w-2xl">
            <div className="flex gap-2" aria-hidden>
              <span className="h-1 flex-1 rounded-full bg-primary" />
              <span className="h-1 flex-1 rounded-full bg-border" />
              <span className="h-1 flex-1 rounded-full bg-border" />
            </div>
            <p className="eyebrow mt-5 text-primary">01 / 03 · Ride Together</p>
            <h1 className="display-heading mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
              Every road has a story.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/85">
              Start rides, share routes, and stay connected with crews around Jakarta — and
              wherever the road takes you next.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="btn-primary">
                Start riding
                <ArrowRight className="size-5" />
              </Link>
              <Link to="/news" className="btn-ghost">
                Read the news
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars — light readability panel */}
      <section className="panel border-t border-panel-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="eyebrow-panel">What REVV does</p>
          <h2 className="display-heading-panel mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]">
            Built for the ride, not the screen.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.number} className="panel-card p-7">
                <p className="font-mono text-base font-semibold tracking-[0.3em] text-primary">
                  {pillar.number}
                </p>
                <h3 className="font-display mt-4 text-2xl font-black uppercase tracking-tight text-panel-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-panel-muted">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — light readability panel */}
      <section className="panel border-t border-panel-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="eyebrow-panel">One app, whole crew</p>
          <h2 className="display-heading-panel mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]">
            Everything a rider needs.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="panel-card p-7">
                <div className="flex size-11 items-center justify-center rounded-lg bg-panel">
                  <feature.icon className="size-6 text-primary" strokeWidth={2} />
                </div>
                <h3 className="font-display mt-4 text-xl font-black uppercase tracking-tight text-panel-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-lg leading-relaxed text-panel-muted">{feature.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {/* Navigation — image card with light overlay for readable text */}
            <div className="relative col-span-1 overflow-hidden rounded-xl border border-panel-border md:col-span-2">
              <img
                src={routeMapDark}
                alt="A dark city map with a glowing red route"
                loading="lazy"
                width={1024}
                height={1024}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/90 to-panel/10" />
              <div className="relative flex h-full flex-col justify-end gap-3 p-7 sm:p-9">
                <span className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/50 bg-panel-card px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Navigation className="size-4" />
                  Route history & resume
                </span>
                <h3 className="display-heading-panel text-2xl sm:text-3xl">
                  Navigation that keeps up
                </h3>
                <p className="max-w-md text-lg leading-relaxed text-panel-muted">
                  Turn-by-turn HUD guidance with live route status — remaining distance, completed
                  distance, and the next turn, always in view.
                </p>
              </div>
            </div>

            <div className="panel-card flex flex-col justify-between p-7">
              <div className="flex size-11 items-center justify-center rounded-lg bg-panel">
                <Radio className="size-6 text-primary" strokeWidth={2} />
              </div>
              <div className="mt-8">
                <h3 className="font-display text-xl font-black uppercase tracking-tight text-panel-foreground">
                  Group Voice Intercom
                </h3>
                <p className="mt-2 text-lg leading-relaxed text-panel-muted">
                  Live voice for the pack. Talk to your riders while you ride — no pulling over, no
                  shouting over wind.
                </p>
              </div>
            </div>

            <div className="panel-card p-7">
              <div className="flex size-11 items-center justify-center rounded-lg bg-panel">
                <Radar className="size-6 text-primary" strokeWidth={2} />
              </div>
              <h3 className="font-display mt-4 text-xl font-black uppercase tracking-tight text-panel-foreground">
                Spotter
              </h3>
              <p className="mt-2 text-lg leading-relaxed text-panel-muted">
                See riders near you on the map and know who's close before you roll out.
              </p>
            </div>

            {/* Photo & Route Story — image card with light overlay */}
            <div className="relative col-span-1 overflow-hidden rounded-xl border border-panel-border md:col-span-2">
              <img
                src={bikeDetail}
                alt="Close-up of a motorcycle headlight glowing at night"
                loading="lazy"
                width={1024}
                height={1024}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/90 to-panel/10" />
              <div className="relative flex h-full flex-col justify-end gap-3 p-7 sm:p-9">
                <span className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/50 bg-panel-card px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Camera className="size-4" />
                  Photo mode · Route story
                </span>
                <h3 className="display-heading-panel text-2xl sm:text-3xl">
                  Make the ride look as good as it felt
                </h3>
                <p className="max-w-md text-lg leading-relaxed text-panel-muted">
                  Motorcycle overlays for your photos and aesthetic route recaps with telemetry —
                  built to be shared.
                </p>
              </div>
            </div>

            {/* Digital Garage — full-width strip */}
            <div className="panel-card col-span-1 flex flex-col justify-between gap-4 p-7 md:col-span-3 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-panel">
                  <Wrench className="size-6 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-black uppercase tracking-tight text-panel-foreground">
                    Digital Garage
                  </h3>
                  <p className="mt-1 max-w-xl text-lg leading-relaxed text-panel-muted">
                    Your machines and their service log, all in one place. Every bike, every oil
                    change, every upgrade — on record.
                  </p>
                </div>
              </div>
              <p className="eyebrow-panel shrink-0">Your machines / Service log</p>
            </div>
          </div>
        </div>
      </section>

      {/* Phones — light panel, dark device screens */}
      <section className="panel border-t border-panel-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="eyebrow-panel">Inside the app</p>
          <h2 className="display-heading-panel mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]">
            The cockpit, up close.
          </h2>
          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <FeedPhone />
            <NavPhone />
            <ProfilePhone />
          </div>
        </div>
      </section>

      {/* News teaser */}
      <section className="panel border-t border-panel-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="panel-card flex flex-col gap-6 p-9 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow-panel">Motorcycle news</p>
              <h2 className="display-heading-panel mt-3 text-2xl sm:text-3xl">
                Stories from the garage desk.
              </h2>
              <p className="mt-2 text-lg text-panel-muted">
                Maintenance, safety, and riding craft — written for riders.
              </p>
            </div>
            <Link
              to="/news"
              className="btn-ghost-panel w-fit shrink-0"
              aria-label="Go to motorcycle news"
            >
              Go to news
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA — red band */}
      <section className="bg-primary">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h2 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-none tracking-tight text-primary-foreground">
            Ready to ride?
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-primary-foreground/90">
            Grab your rider ID and join the neighborhood. Passwordless, no nonsense — just the
            road.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-9 py-4 font-display text-base font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
          >
            Get your rider ID
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
