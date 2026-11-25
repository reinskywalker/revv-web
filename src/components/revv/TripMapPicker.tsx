import { useCallback, useMemo, useRef, useState } from "react";
import { Crosshair, Flag, MapPin, Minus, Plus, Search } from "lucide-react";
import { authRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface MapPoint {
  name: string;
  lat: number;
  lng: number;
}

export type MapPickTarget = "meeting" | "destination" | "waypoint";

interface GeoSearchPlace {
  name: string;
  display_name?: string;
  latitude?: number;
  longitude?: number;
  lat?: string;
  lon?: string;
}

interface TripMapPickerProps {
  meeting: MapPoint | null;
  destination: MapPoint | null;
  waypoints: MapPoint[];
  onPickMeeting: (pt: MapPoint) => void;
  onPickDestination: (pt: MapPoint) => void;
  onAddWaypoint: (pt: MapPoint) => void;
}

const TILE_SIZE = 256;

function latLngToWorldPx(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.min(0.9999, Math.max(-0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldPxToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number((((lng + 540) % 360) - 180).toFixed(6)),
  };
}

export function TripMapPicker({
  meeting,
  destination,
  waypoints,
  onPickMeeting,
  onPickDestination,
  onAddWaypoint,
}: TripMapPickerProps) {
  const initialCenter = meeting ?? destination ?? { name: "Jakarta", lat: -6.2088, lng: 106.8456 };
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: initialCenter.lat,
    lng: initialCenter.lng,
  });
  const [zoom, setZoom] = useState(12);
  const [target, setTarget] = useState<MapPickTarget>(meeting ? "destination" : "meeting");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoSearchPlace[]>([]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startLat: number;
    startLng: number;
    moved: boolean;
  } | null>(null);

  const [viewportSize, setViewportSize] = useState({ w: 640, h: 300 });
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    if (!node) return;
    setViewportSize({ w: node.clientWidth || 640, h: node.clientHeight || 300 });
  }, []);

  const centerWorld = useMemo(
    () => latLngToWorldPx(center.lat, center.lng, zoom),
    [center.lat, center.lng, zoom],
  );

  const visibleTiles = useMemo(() => {
    const maxTile = 2 ** zoom;
    const minX = Math.floor((centerWorld.x - viewportSize.w / 2) / TILE_SIZE);
    const maxX = Math.floor((centerWorld.x + viewportSize.w / 2) / TILE_SIZE);
    const minY = Math.floor((centerWorld.y - viewportSize.h / 2) / TILE_SIZE);
    const maxY = Math.floor((centerWorld.y + viewportSize.h / 2) / TILE_SIZE);

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    for (let ty = minY; ty <= maxY; ty++) {
      if (ty < 0 || ty >= maxTile) continue;
      for (let tx = minX; tx <= maxX; tx++) {
        const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
          left: tx * TILE_SIZE - (centerWorld.x - viewportSize.w / 2),
          top: ty * TILE_SIZE - (centerWorld.y - viewportSize.h / 2),
        });
      }
    }
    return tiles;
  }, [centerWorld.x, centerWorld.y, viewportSize.h, viewportSize.w, zoom]);

  const toScreen = useCallback(
    (lat: number, lng: number) => {
      const world = latLngToWorldPx(lat, lng, zoom);
      return {
        x: world.x - (centerWorld.x - viewportSize.w / 2),
        y: world.y - (centerWorld.y - viewportSize.h / 2),
      };
    },
    [centerWorld.x, centerWorld.y, viewportSize.h, viewportSize.w, zoom],
  );

  const dispatchPickedPoint = useCallback(
    (pt: MapPoint) => {
      if (target === "meeting") onPickMeeting(pt);
      else if (target === "destination") onPickDestination(pt);
      else onAddWaypoint(pt);
    },
    [onAddWaypoint, onPickDestination, onPickMeeting, target],
  );

  const reverseAndApply = useCallback(
    async (lat: number, lng: number) => {
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      dispatchPickedPoint({ name: fallback, lat, lng });
      try {
        const place = await authRequest<GeoSearchPlace>(
          `/geo/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
        );
        const label = place?.name?.trim() || place?.display_name?.split(",")[0]?.trim() || fallback;
        dispatchPickedPoint({ name: label, lat, lng });
      } catch {
        // Keep coordinate fallback if reverse geocode is unavailable.
      }
    },
    [dispatchPickedPoint],
  );

  const handleSearch = async () => {
    const clean = query.trim();
    if (clean.length < 2) return;
    setSearching(true);
    try {
      const items = await authRequest<GeoSearchPlace[]>(
        `/geo/search?q=${encodeURIComponent(clean)}&lat=${center.lat}&lon=${center.lng}`,
      );
      setResults(Array.isArray(items) ? items : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const routeScreenPoints = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    if (meeting) pts.push(toScreen(meeting.lat, meeting.lng));
    for (const wp of waypoints) pts.push(toScreen(wp.lat, wp.lng));
    if (destination) pts.push(toScreen(destination.lat, destination.lng));
    return pts;
  }, [destination, meeting, toScreen, waypoints]);

  return (
    <div className="rounded-xl border border-border bg-background/70 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["meeting", "Pick Meeting Point", "bg-emerald-600 text-white"],
              ["waypoint", "Add Stop Waypoint", "bg-amber-500 text-slate-950"],
              ["destination", "Pick Destination", "bg-primary text-primary-foreground"],
            ] as const
          ).map(([mode, label, activeCls]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTarget(mode)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
                target === mode ? activeCls : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="Search place or city..."
            className="w-44 sm:w-56 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground"
          />
          <button
            type="button"
            disabled={searching}
            onClick={() => void handleSearch()}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-bold text-foreground"
          >
            <Search className="size-3.5" />
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border/50">
          {results.slice(0, 6).map((item, idx) => {
            const lat = item.latitude ?? Number(item.lat ?? 0);
            const lng = item.longitude ?? Number(item.lon ?? 0);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => {
                  const pt = { name: item.name || item.display_name || "Pinned Location", lat, lng };
                  setCenter({ lat, lng });
                  setZoom((z) => Math.max(z, 13));
                  dispatchPickedPoint(pt);
                  setResults([]);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/60"
              >
                <span className="font-bold text-foreground">{item.name}</span>
                {item.display_name && (
                  <span className="ml-2 text-muted-foreground">{item.display_name}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={measuredRef}
        onPointerDown={(e) => {
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            startLat: center.lat,
            startLng: center.lng,
            moved: false,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag?.active) return;
          const dx = e.clientX - drag.startX;
          const dy = e.clientY - drag.startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            drag.moved = true;
          }
          const startWorld = latLngToWorldPx(drag.startLat, drag.startLng, zoom);
          const next = worldPxToLatLng(startWorld.x - dx, startWorld.y - dy, zoom);
          setCenter(next);
        }}
        onPointerUp={(e) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.moved || !viewportRef.current) return;
          const rect = viewportRef.current.getBoundingClientRect();
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;
          const worldX = centerWorld.x - viewportSize.w / 2 + localX;
          const worldY = centerWorld.y - viewportSize.h / 2 + localY;
          const coords = worldPxToLatLng(worldX, worldY, zoom);
          void reverseAndApply(coords.lat, coords.lng);
        }}
        className="relative h-[280px] w-full select-none overflow-hidden rounded-xl border border-border bg-slate-900 cursor-crosshair touch-none"
      >
        {visibleTiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            style={{ left: t.left, top: t.top, width: TILE_SIZE, height: TILE_SIZE }}
            className="pointer-events-none absolute max-w-none"
          />
        ))}

        {routeScreenPoints.length >= 2 && (
          <svg className="pointer-events-none absolute inset-0 size-full">
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={routeScreenPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            />
          </svg>
        )}

        {meeting && (
          <MapPinMarker
            pos={toScreen(meeting.lat, meeting.lng)}
            colorClass="bg-emerald-500 text-white"
            label={`Meet: ${meeting.name}`}
            icon={<MapPin className="size-3.5" />}
          />
        )}

        {waypoints.map((wp, idx) => (
          <MapPinMarker
            key={`wp-${idx}`}
            pos={toScreen(wp.lat, wp.lng)}
            colorClass="bg-amber-500 text-slate-950"
            label={`${idx + 1}. ${wp.name}`}
            icon={<span className="text-[10px] font-black">{idx + 1}</span>}
          />
        ))}

        {destination && (
          <MapPinMarker
            pos={toScreen(destination.lat, destination.lng)}
            colorClass="bg-primary text-primary-foreground"
            label={`Dest: ${destination.name}`}
            icon={<Flag className="size-3.5" />}
          />
        )}

        <div className="absolute right-2.5 top-2.5 flex flex-col gap-1 z-20">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setZoom((z) => Math.min(18, z + 1))}
            className="rounded-lg border border-border bg-card/90 p-1.5 text-foreground shadow"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setZoom((z) => Math.max(5, z - 1))}
            className="rounded-lg border border-border bg-card/90 p-1.5 text-foreground shadow"
          >
            <Minus className="size-3.5" />
          </button>
        </div>

        <div className="pointer-events-none absolute left-2.5 bottom-2.5 rounded-lg bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white flex items-center gap-1.5">
          <Crosshair className="size-3 text-emerald-400" />
          Drag to pan · Click map to set {target} pin (z{zoom})
        </div>
      </div>
    </div>
  );
}

function MapPinMarker({
  pos,
  colorClass,
  label,
  icon,
}: {
  pos: { x: number; y: number };
  colorClass: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-full z-10 flex flex-col items-center"
    >
      <span className="mb-1 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
        {label}
      </span>
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full border-2 border-white shadow-md",
          colorClass,
        )}
      >
        {icon}
      </span>
    </div>
  );
}
