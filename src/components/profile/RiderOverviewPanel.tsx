import { Gauge, Lock, MapPin, Navigation, ShieldCheck } from "lucide-react";
import type { PublicProfileResponse } from "@/lib/api";

interface RiderOverviewPanelProps {
  profile: PublicProfileResponse;
}

export function RiderOverviewPanel({ profile }: RiderOverviewPanelProps) {
  if (profile.is_private) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card/60 p-6 flex items-center gap-4">
        <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Lock className="size-5" />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Rider Overview (Hidden)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            This account is private. Add as a friend to view rider overview statistics and garage details.
          </p>
        </div>
      </section>
    );
  }

  const primaryBike =
    profile.garage?.find((b) => b.is_primary) ??
    (profile.garage && profile.garage.length === 1 ? profile.garage[0] : undefined);
  const primaryBikeLabel = primaryBike
    ? [primaryBike.brand_name, primaryBike.series_name].filter(Boolean).join(" ")
    : profile.garage === null
      ? "Hidden"
      : "No primary bike";

  const isCustomHiddenCity =
    profile.account_visibility === "CUSTOM" &&
    (profile.show_city === false || profile.city == null);
  const isCustomHiddenCountry =
    profile.account_visibility === "CUSTOM" &&
    (profile.show_country === false || profile.country == null);

  const items = [
    {
      label: "City",
      value: isCustomHiddenCity ? "Hidden" : profile.city?.trim() || "Not set",
      icon: MapPin,
    },
    {
      label: "Home Base",
      value: isCustomHiddenCountry
        ? "Hidden"
        : profile.country?.trim() || "Not set",
      icon: ShieldCheck,
    },
    {
      label: "Total Distance",
      value:
        typeof profile.total_distance_km === "number"
          ? `${profile.total_distance_km.toFixed(1)} km`
          : "0.0 km",
      icon: Navigation,
    },
    {
      label: "Max Speed",
      value:
        typeof profile.max_speed_kmh === "number" && profile.max_speed_kmh > 0
          ? `${profile.max_speed_kmh.toFixed(0)} km/h`
          : "—",
      icon: Gauge,
    },
    {
      label: "Primary Bike",
      value: primaryBikeLabel,
      icon: Gauge,
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Rider Overview
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
                <Icon className="size-3 text-primary" />
                <span>{item.label}</span>
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-foreground">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
