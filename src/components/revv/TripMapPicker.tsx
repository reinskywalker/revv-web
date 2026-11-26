import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Flag, MapPin, Minus, Plus, Search } from "lucide-react";
import { authRequest } from "@/lib/api";
import { fetchRoadRouteGeometry, type RoadRouteCoordinate } from "@/lib/api-trip-plans";
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
  onPickMeeting?: (pt: MapPoint) => void;
  onPickDestination?: (pt: MapPoint) => void;
  onAddWaypoint?: (pt: MapPoint) => void;
  readOnly?: boolean;
  height?: number;
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
  return { lat, lng };
}

function fitViewportForPoints(
  points: RoadRouteCoordinate[],
  viewportW: number,
  viewportH: number,
): { center: { lat: number; lng: number }; zoom: number } {
  if (points.length === 0) {
    return { center: { lat: -6.2088, lng: 106.8456 }, zoom: 11 };
  }
  if (points.length === 1) {
    return { center: { lat: points[0]!.lat, lng: points[0]!.lng }, zoom: 13 };
  }
  let minLat = points[0]!.lat;
  let maxLat = points[0]!.lat;
  let minLng = points[0]!.lng;
  let maxLng = points[0]!.lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  for (let z = 15; z >= 5; z--) {
    const nw = latLngToWorldPx(maxLat, minLng, z);
    const se = latLngToWorldPx(minLat, maxLng, z);
    if (Math.abs(se.x - nw.x) <= viewportW * 0.78 && Math.abs(se.y - nw.y) <= viewportH * 0.72) {
      return { center, zoom: z };
    }
  }
  return { center, zoom: 5 };
}

export function TripMapPicker({
  meeting,
  destination,
  waypoints,
  onPickMeeting,
  onPickDestination,
  onAddWaypoint,
  readOnly = false,
  height = 290,
}: TripMapPickerProps) {
  const allPins = useMemo<RoadRouteCoordinate[]>(() => {
    const pts: RoadRouteCoordinate[] = [];
    if (meeting) pts.push({ lat: meeting.lat, lng: meeting.lng });
    for (const wp of waypoints) pts.push({ lat: wp.lat, lng: wp.lng });
    if (destination) pts.push({ lat: destination.lat, lng: destination.lng });
    return pts;
  }, [destination, meeting, waypoints]);

  const initialFit = useMemo(() => fitViewportForPoints(allPins, 520, height), [allPins, height]);

  const [center, setCenter] = useState<{ lat: number; lng: number }>(initialFit.center);
  const [zoom, setZoom] = useState<number>(initialFit.zoom);
  const [target, setTarget] = useState<MapPickTarget>("meeting");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoSearchPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [roadCoords, setRoadCoords] = useState<RoadRouteCoordinate[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startWorldX: number;
    startWorldY: number;
    moved: boolean;
  } | null>(null);

  const pinsSignature = useMemo(
    () => allPins.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|"),
    [allPins],
  );

  // Auto-fit read-only thumbnails whenever route pins change.
  useEffect(() => {
    if (!readOnly) return;
    const width = containerRef.current?.clientWidth || 520;
    const fit = fitViewportForPoints(allPins, width, height);
    setCenter(fit.center);
    setZoom(fit.zoom);
  }, [allPins, height, pinsSignature, readOnly]);

  // Fetch actual road navigation polyline from /geo/route whenever 2+ pins exist.
  useEffect(() => {
    if (allPins.length < 2) {
      setRoadCoords([]);
      setLoadingRoute(false);
      return;
    }
    let cancelled = false;
    setLoadingRoute(true);
    void fetchRoadRouteGeometry(allPins).then((coords) => {
      if (!cancelled) {
        setRoadCoords(coords);
        setLoadingRoute(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [allPins, pinsSignature]);

  const viewportW = containerRef.current?.clientWidth || 560;
  const viewportH = height;

  const centerWorld = useMemo(
    () => latLngToWorldPx(center.lat, center.lng, zoom),
    [center.lat, center.lng, zoom],
  );

  const tiles = useMemo(() => {
    const maxTile = 2 ** zoom;
    const leftPx = centerWorld.x - viewportW / 2;
    const topPx = centerWorld.y - viewportH / 2;
    const minTx = Math.floor(leftPx / TILE_SIZE);
    const maxTx = Math.floor((leftPx + viewportW) / TILE_SIZE);
    const minTy = Math.floor(topPx / TILE_SIZE);
    const maxTy = Math.floor((topPx + viewportH) / TILE_SIZE);

    const out: Array<{ key: string; url: string; left: number; top: number }> = [];
    for (let tx = minTx; tx <= maxTx; tx++) {
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (ty < 0 || ty >= maxTile) continue;
        const wrappedTx = ((tx % maxTile) + maxTile) % maxTile;
        out.push({
          key: `${zoom}-${tx}-${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`,
          left: tx * TILE_SIZE - leftPx,
          top: ty * TILE_SIZE - topPx,
        });
      }
    }
    return out;
  }, [centerWorld.x, centerWorld.y, viewportH, viewportW, zoom]);

  const toScreen = useCallback(
    (lat: number, lng: number) => {
      const pt = latLngToWorldPx(lat, lng, zoom);
      return {
        x: pt.x - centerWorld.x + viewportW / 2,
        y: pt.y - centerWorld.y + viewportH / 2,
      };
    },
    [centerWorld.x, centerWorld.y, viewportH, viewportW, zoom],
  );

  const applyPick = useCallback(
    (pt: MapPoint) => {
      if (target === "meeting") onPickMeeting?.(pt);
      else if (target === "destination") onPickDestination?.(pt);
      else onAddWaypoint?.(pt);
    },
    [onAddWaypoint, onPickDestination, onPickMeeting, target],
  );

  const resolveAndPick = useCallback(
    async (lat: number, lng: number) => {
      setResolving(true);
      let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const res = await authRequest<GeoSearchPlace>(
          `/geo/reverse?lat=${encodeURIComponent(lat.toFixed(6))}&lon=${encodeURIComponent(lng.toFixed(6))}`,
        );
        const candidate = (res?.name || res?.display_name || "").trim();
        if (candidate) label = candidate.split(",").slice(0, 2).join(", ").trim();
      } catch {
        // Coordinate fallback stays readable if reverse geocode is unavailable.
      } finally {
        setResolving(false);
      }
      applyPick({ name: label, lat, lng });
    },
    [applyPick],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWorldX: centerWorld.x,
      startWorldY: centerWorld.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    if (dragRef.current.moved) {
      const next = worldPxToLatLng(
        dragRef.current.startWorldX - dx,
        dragRef.current.startWorldY - dy,
        zoom,
      );
      setCenter(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = centerWorld.x + (clickX - rect.width / 2);
    const worldY = centerWorld.y + (clickY - rect.height / 2);
    const picked = worldPxToLatLng(worldX, worldY, zoom);
    void resolveAndPick(picked.lat, picked.lng);
  };

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

  const polylineSource = roadCoords.length >= 2 ? roadCoords : allPins;
  const routeScreenPoints = useMemo(
    () => polylineSource.map((pt) => toScreen(pt.lat, pt.lng)),
    [polylineSource, toScreen],
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/70",
        readOnly ? "overflow-hidden" : "space-y-3 p-3.5",
      )}
    >
      {!readOnly && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["meeting", "Pick Start Point", "bg-emerald-600 text-white"],
                  ["waypoint", "Add Stop", "bg-amber-500 text-slate-950"],
                  ["destination", "Pick Destination", "bg-primary text-primary-foreground"],
                ] as const
              ).map(([mode, label, activeCls]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTarget(mode)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    target === mode
                      ? activeCls
                      : "bg-secondary text-muted-foreground hover:text-foreground",
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
                className="w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-xs sm:w-56"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={searching}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80"
              >
                <Search className="size-3.5" />
                {searching ? "..." : "Find"}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
              {results.slice(0, 6).map((item, idx) => {
                const lat = Number(item.latitude ?? item.lat);
                const lng = Number(item.longitude ?? item.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                return (
                  <button
                    key={`${lat}-${lng}-${idx}`}
                    type="button"
                    onClick={() => {
                      const label = (item.name || item.display_name || "Pinned Location")
                        .split(",")
                        .slice(0, 2)
                        .join(", ")
                        .trim();
                      setCenter({ lat, lng });
                      setZoom(14);
                      applyPick({ name: label, lat, lng });
                      setResults([]);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/60"
                  >
                    <MapPin className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate font-medium">
                      {item.display_name || item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ height }}
        className={cn(
          "relative w-full select-none overflow-hidden bg-slate-900",
          !readOnly && "cursor-crosshair rounded-lg border border-border",
        )}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
            className="pointer-events-none absolute max-w-none opacity-90"
          />
        ))}

        {routeScreenPoints.length >= 2 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <polyline
              fill="none"
              stroke="#0f172a"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.45"
              points={routeScreenPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            />
            <polyline
              fill="none"
              stroke="#f97316"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={roadCoords.length >= 2 ? undefined : "6 4"}
              points={routeScreenPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            />
          </svg>
        )}

        {meeting && (
          <MapPinMarker
            pos={toScreen(meeting.lat, meeting.lng)}
            color="bg-emerald-600"
            label={`Start: ${meeting.name}`}
            icon={<Crosshair className="size-3.5 text-white" />}
          />
        )}
        {waypoints.map((wp, idx) => (
          <MapPinMarker
            key={`${wp.lat}-${wp.lng}-${idx}`}
            pos={toScreen(wp.lat, wp.lng)}
            color="bg-amber-500 text-slate-950"
            label={`Stop ${idx + 1}: ${wp.name}`}
            icon={<span className="text-[11px] font-black">{idx + 1}</span>}
          />
        ))}
        {destination && (
          <MapPinMarker
            pos={toScreen(destination.lat, destination.lng)}
            color="bg-primary"
            label={`End: ${destination.name}`}
            icon={<Flag className="size-3.5 text-white" />}
          />
        )}

        {!readOnly && (
          <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(18, z + 1));
              }}
              className="rounded-md bg-card/90 p-1.5 text-foreground shadow hover:bg-card"
              aria-label="Zoom in"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(5, z - 1));
              }}
              className="rounded-md bg-card/90 p-1.5 text-foreground shadow hover:bg-card"
              aria-label="Zoom out"
            >
              <Minus className="size-3.5" />
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
          {readOnly
            ? loadingRoute
              ? "Loading navigation route..."
              : `${allPins.length} route pins`
            : resolving
              ? "Resolving address..."
              : "Drag to pan • Click map to drop pin"}
        </div>
      </div>
    </div>
  );
}

function MapPinMarker({
  pos,
  color,
  label,
  icon,
}: {
  pos: { x: number; y: number };
  color: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      title={label}
    >
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-full border-2 border-white shadow-md",
          color,
        )}
      >
        {icon}
      </div>
    </div>
  );
}
