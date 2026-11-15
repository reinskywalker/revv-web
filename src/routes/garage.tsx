import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  Camera,
  Check,
  ChevronRight,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { EditBikeModal, UpdateOdometerModal } from "@/components/garage/GarageBikeModals";
import { GarageMaintenancePanel } from "@/components/garage/GarageMaintenancePanel";
import {
  addGarageMotorcycle,
  deleteGarageMotorcycle,
  fetchMasterMotorcycles,
  fetchMyGarage,
  resolveMediaUrl,
  type GarageMotorcycle,
  type MasterMotorcycleItem,
  updateGarageMotorcycle,
} from "@/lib/api";
import {
  fetchMasterComponentsPublic,
  uploadGarageBikeImage,
  type MasterComponentItemPublic,
} from "@/lib/api-rider";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/garage")({
  head: () => ({
    meta: [
      { title: "Digital Garage — REVV Motorsport Web" },
      {
        name: "description",
        content:
          "Manage your motorcycle fleet, odometer, maintenance specs and machine telemetry on REVV.",
      },
    ],
  }),
  component: GaragePage,
});

function GaragePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [garage, setGarage] = useState<GarageMotorcycle[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<MasterMotorcycleItem[]>([]);
  const [masterComponents, setMasterComponents] = useState<MasterComponentItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [editingBike, setEditingBike] = useState<GarageMotorcycle | null>(null);
  const [odometerBike, setOdometerBike] = useState<GarageMotorcycle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GarageMotorcycle | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [expandedMaintId, setExpandedMaintId] = useState<string | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);

  // Form state
  const [selectedMasterBikeId, setSelectedMasterBikeId] = useState<string>("");
  const [bikeBrandManual, setBikeBrandManual] = useState("");
  const [bikeSeriesManual, setBikeSeriesManual] = useState("");
  const [bikeNickname, setBikeNickname] = useState("");
  const [bikeMileage, setBikeMileage] = useState("0");
  const [bikePlate, setBikePlate] = useState("");
  const [bikeTransmission, setBikeTransmission] = useState("matic");
  const [bikeCategory, setBikeCategory] = useState("scooter");
  const [bikePrimary, setBikePrimary] = useState(false);

  const loadGarageData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [gar, masters, comps] = await Promise.all([
        fetchMyGarage(),
        fetchMasterMotorcycles().catch(() => []),
        fetchMasterComponentsPublic().catch(() => []),
      ]);
      setGarage(gar);
      setMasterCatalog(masters);
      setMasterComponents(comps);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load Digital Garage.";
      setLoadError(msg);
      setNotice({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setLoading(false);
      return;
    }
    if (isAuthenticated) {
      void loadGarageData();
    }
  }, [isAuthenticated, authLoading, loadGarageData]);

  const handleAddMotorcycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      const masterId = selectedMasterBikeId ? Number(selectedMasterBikeId) : null;
      await addGarageMotorcycle({
        master_motorcycle_id: masterId,
        ...(!masterId && bikeBrandManual.trim() ? { brand_manual: bikeBrandManual.trim() } : {}),
        ...(!masterId && bikeSeriesManual.trim() ? { series_manual: bikeSeriesManual.trim() } : {}),
        ...(bikeNickname.trim() ? { nickname: bikeNickname.trim() } : {}),
        current_mileage: Number(bikeMileage) || 0,
        ...(bikePlate.trim() ? { plate_number: bikePlate.trim() } : {}),
        transmission: bikeTransmission,
        category: bikeCategory,
        is_primary: bikePrimary,
      });

      // Reset form
      setSelectedMasterBikeId("");
      setBikeBrandManual("");
      setBikeSeriesManual("");
      setBikeNickname("");
      setBikePlate("");
      setBikeMileage("0");
      setBikePrimary(false);

      const refreshed = await fetchMyGarage();
      setGarage(refreshed);
      setNotice({ type: "success", message: "Motorcycle added to your Digital Garage." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to add motorcycle.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrimary = async (bike: GarageMotorcycle) => {
    try {
      await updateGarageMotorcycle(bike.id, { is_primary: true });
      const refreshed = await fetchMyGarage();
      setGarage(refreshed);
      setNotice({
        type: "success",
        message: `${bike.nickname || bike.series_name || bike.name} set as primary ride.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to set primary bike.",
      });
    }
  };

  const confirmDeleteBike = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteGarageMotorcycle(deleteTarget.id);
      const refreshed = await fetchMyGarage();
      setGarage(refreshed);
      setDeleteTarget(null);
      setNotice({ type: "success", message: "Motorcycle removed from garage." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete machine.",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleBikePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const targetId = photoTargetId;
    setPhotoTargetId(null);
    if (!file || !targetId) return;
    setUploadingPhotoId(targetId);
    setNotice(null);
    try {
      await uploadGarageBikeImage(targetId, file);
      const refreshed = await fetchMyGarage();
      setGarage(refreshed);
      setNotice({ type: "success", message: "Motorcycle photo updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to upload motorcycle photo.",
      });
    } finally {
      setUploadingPhotoId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in mx-auto max-w-xl space-y-6 text-center py-16">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Bike className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Digital Garage Access
        </h1>
        <p className="text-sm text-muted-foreground">
          Log in with your REVV account to inspect your riding stable, log odometer readings, and
          sync maintenance telemetry.
        </p>
        <div className="pt-2">
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Sign In to Cockpit
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const totalKm = garage.reduce((acc, b) => acc + (b.current_mileage || 0), 0);
  const primaryBike = garage.find((b) => b.is_primary) || garage[0];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
            <Bike className="size-3.5" />
            <span>Digital Garage Telemetry</span>
          </div>
          <h1 className="font-display mt-1 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            My Machines
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal stable, odometer mileage, and primary riding setup.
          </p>
        </div>

        {/* Quick Fleet Stats */}
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-border bg-card/60 px-4 py-2.5 text-right backdrop-blur">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block">
              Fleet Size
            </span>
            <span className="font-display text-xl font-black text-foreground">
              {garage.length} {garage.length === 1 ? "Unit" : "Units"}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card/60 px-4 py-2.5 text-right backdrop-blur">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block">
              Total Logged
            </span>
            <span className="font-display text-xl font-black text-primary">
              {totalKm.toLocaleString()} KM
            </span>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-mono ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ADD MOTORCYCLE FORM */}
        <div className="lg:col-span-1">
          <form onSubmit={handleAddMotorcycle} className="hud-card sticky top-24 space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                Add Machine
              </h2>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                Fleet Intake
              </span>
            </div>

            <div>
              <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                Select From Master Catalog
              </label>
              <select
                value={selectedMasterBikeId}
                onChange={(e) => setSelectedMasterBikeId(e.target.value)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
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
                  <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required={!selectedMasterBikeId}
                    value={bikeBrandManual}
                    onChange={(e) => setBikeBrandManual(e.target.value)}
                    placeholder="e.g. Honda"
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                    Series / Model *
                  </label>
                  <input
                    type="text"
                    required={!selectedMasterBikeId}
                    value={bikeSeriesManual}
                    onChange={(e) => setBikeSeriesManual(e.target.value)}
                    placeholder="e.g. CBR 250RR"
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                  Machine Nickname
                </label>
                <input
                  type="text"
                  value={bikeNickname}
                  onChange={(e) => setBikeNickname(e.target.value)}
                  placeholder="e.g. Silver Arrow"
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                  Odometer (km)
                </label>
                <input
                  type="number"
                  min={0}
                  value={bikeMileage}
                  onChange={(e) => setBikeMileage(e.target.value)}
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                  Transmission
                </label>
                <select
                  value={bikeTransmission}
                  onChange={(e) => setBikeTransmission(e.target.value)}
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
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
                <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                  Category
                </label>
                <select
                  value={bikeCategory}
                  onChange={(e) => setBikeCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
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
              <label className="font-mono text-xs uppercase text-muted-foreground block mb-1">
                Plate Number (Optional)
              </label>
              <input
                type="text"
                value={bikePlate}
                onChange={(e) => setBikePlate(e.target.value)}
                placeholder="e.g. B 1234 REV"
                className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none uppercase"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={bikePrimary}
                onChange={(e) => setBikePrimary(e.target.checked)}
                className="size-4 rounded border-border bg-secondary text-primary accent-primary"
              />
              <span>Set as primary machine for rides and profile</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex w-full items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add to Digital Garage
            </button>
          </form>
        </div>

        {/* MOTORCYCLES LIST */}
        <div className="space-y-4 lg:col-span-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleBikePhotoChange(e)}
          />
          {loading ? (
            <div className="hud-card flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : loadError && garage.length === 0 ? (
            <div className="hud-card p-8 text-center space-y-3 border-destructive/40 bg-destructive/10">
              <p className="text-sm text-destructive">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadGarageData()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-destructive/40 px-5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="size-3.5" /> Retry
              </button>
            </div>
          ) : garage.length === 0 ? (
            <div className="hud-card p-12 text-center">
              <Bike className="mx-auto size-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
                No Machines Registered Yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Your Digital Garage is empty. Use the form on the left to add your motorcycle from
                the catalog or via manual entry.
              </p>
            </div>
          ) : (
            garage.map((bike) => {
              const displayName = bike.nickname || bike.series_name || bike.name || "Motorcycle";
              const isPrimary = bike.is_primary;
              const imgUrl = resolveMediaUrl(bike.image_path);

              return (
                <div
                  key={bike.id}
                  className={`hud-card group relative p-6 transition-all duration-200 ${
                    isPrimary ? "border-primary/50 bg-gradient-to-br from-card to-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {imgUrl && (
                        <div className="relative h-32 w-full sm:h-28 sm:w-40 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                          <img
                            src={imgUrl}
                            alt={displayName}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                            {bike.brand_name || "Motorcycle"} · {bike.category}
                          </span>
                          {isPrimary && (
                            <span className="inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-primary">
                              <Sparkles className="size-2.5" />
                              Primary Machine
                            </span>
                          )}
                          {bike.plate_number && (
                            <span className="rounded border border-border/80 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                              {bike.plate_number}
                            </span>
                          )}
                        </div>

                        <h3 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
                          {displayName}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                          <span>
                            Model:{" "}
                            <strong className="text-foreground">
                              {bike.series_name || bike.name || "Custom"}
                            </strong>
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Gauge className="size-3 text-primary" />
                            <strong className="text-foreground">
                              {bike.current_mileage.toLocaleString()} km
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Transmission:{" "}
                            <strong className="text-foreground uppercase">
                              {bike.transmission}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(bike)}
                          className="min-h-[40px] rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs uppercase text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingBike(bike)}
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-xs font-semibold uppercase text-foreground transition-colors hover:bg-secondary"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={uploadingPhotoId === bike.id}
                        onClick={() => {
                          setPhotoTargetId(bike.id);
                          photoInputRef.current?.click();
                        }}
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-xs font-semibold uppercase text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                      >
                        <Camera className="size-3.5" />
                        {uploadingPhotoId === bike.id ? "Uploading…" : "Photo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOdometerBike(bike)}
                        className="min-h-[40px] rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-xs font-semibold uppercase text-foreground transition-colors hover:bg-secondary"
                      >
                        Update KM
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMaintId((prev) => (prev === bike.id ? null : bike.id))
                        }
                        className={`inline-flex min-h-[40px] items-center gap-1 rounded-lg border px-3 py-2 font-mono text-xs font-semibold uppercase transition-colors ${
                          expandedMaintId === bike.id
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
                        }`}
                      >
                        <Wrench className="size-3.5" /> Service
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(bike)}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
                        title="Remove machine from garage"
                        aria-label={`Delete ${displayName}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {expandedMaintId === bike.id && (
                    <GarageMaintenancePanel
                      garageId={bike.id}
                      currentMileage={bike.current_mileage}
                      transmissionType={bike.transmission}
                      masterComponents={masterComponents}
                      onError={(message) => setNotice({ type: "error", message })}
                      onNotice={(message) => setNotice({ type: "success", message })}
                    />
                  )}

                  {/* Telemetry Footer Info */}
                  <div className="mt-4 border-t border-border/40 pt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="size-3 text-primary/70" />
                      Status: Active Telemetry Synced
                    </span>
                    {user?.username && (
                      <Link
                        to="/id/$username"
                        params={{ username: user.username }}
                        className="text-primary hover:underline text-[11px]"
                      >
                        View in Public Profile →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <UpdateOdometerModal
        bike={odometerBike}
        onClose={() => setOdometerBike(null)}
        onUpdated={async (km) => {
          const refreshed = await fetchMyGarage();
          setGarage(refreshed);
          setNotice({ type: "success", message: `Odometer updated to ${km.toLocaleString()} km.` });
        }}
        onError={(message) => setNotice({ type: "error", message })}
      />

      <EditBikeModal
        bike={editingBike}
        onClose={() => setEditingBike(null)}
        onSaved={async () => {
          const refreshed = await fetchMyGarage();
          setGarage(refreshed);
          setNotice({ type: "success", message: "Motorcycle updated." });
        }}
        onError={(message) => setNotice({ type: "error", message })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Motorcycle"
        message={`Remove ${deleteTarget?.nickname || deleteTarget?.series_name || deleteTarget?.name || "this motorcycle"} from your Digital Garage?`}
        confirmLabel="Remove Bike"
        destructive
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteBike()}
      />
    </div>
  );
}
