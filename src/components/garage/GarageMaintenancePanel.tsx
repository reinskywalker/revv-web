import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, Trash2, Wrench } from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import {
  createMaintenanceLog,
  deleteGarageComponent,
  deleteMaintenanceLog,
  fetchGarageComponents,
  fetchMaintenanceLogs,
  upsertGarageComponent,
  type GarageComponentItem,
  type MaintenanceLogItem,
  type MasterComponentItemPublic,
} from "@/lib/api-rider";

interface GarageMaintenancePanelProps {
  garageId: string;
  currentMileage: number;
  transmissionType?: string | null;
  masterComponents: MasterComponentItemPublic[];
  onError: (msg: string) => void;
  onNotice: (msg: string) => void;
}

export function GarageMaintenancePanel({
  garageId,
  currentMileage,
  transmissionType,
  masterComponents,
  onError,
  onNotice,
}: GarageMaintenancePanelProps) {
  const [components, setComponents] = useState<GarageComponentItem[]>([]);
  const [logs, setLogs] = useState<MaintenanceLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"wear" | "logs">("wear");
  const [showAddWear, setShowAddWear] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "component"; id: string; label: string }
    | { kind: "log"; id: string; label: string }
    | null
  >(null);

  // Wear interval form
  const [componentId, setComponentId] = useState<number>(() => masterComponents[0]?.id ?? 0);
  const [brandOrSpec, setBrandOrSpec] = useState("");
  const [replacedMileage, setReplacedMileage] = useState(String(currentMileage));
  const [customIntervalKm, setCustomIntervalKm] = useState("");
  const [customIntervalMonths, setCustomIntervalMonths] = useState("");

  // Maintenance log form
  const [serviceType, setServiceType] = useState("Routine Service");
  const [partBrand, setPartBrand] = useState("");
  const [serviceMileage, setServiceMileage] = useState(String(currentMileage));
  const [cost, setCost] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [notes, setNotes] = useState("");

  const filteredMaster = masterComponents.filter((m) => {
    if (!transmissionType || m.applicable_transmission.length === 0) return true;
    return m.applicable_transmission.some(
      (t) => t.toLowerCase() === transmissionType.toLowerCase(),
    );
  });

  useEffect(() => {
    const first = filteredMaster[0];
    if (!componentId && first) {
      setComponentId(first.id);
    }
  }, [componentId, filteredMaster]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [compList, logList] = await Promise.all([
        fetchGarageComponents(garageId),
        fetchMaintenanceLogs(garageId),
      ]);
      setComponents(compList);
      setLogs(logList);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load maintenance data.");
    } finally {
      setLoading(false);
    }
  }, [garageId, onError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSaveComponent(e: React.FormEvent) {
    e.preventDefault();
    if (!componentId) {
      onError("Please select a wear component.");
      return;
    }
    setBusy(true);
    try {
      await upsertGarageComponent(garageId, {
        component_id: componentId,
        ...(brandOrSpec.trim() ? { brand_or_spec: brandOrSpec.trim() } : {}),
        last_replaced_mileage: Number(replacedMileage) || 0,
        ...(customIntervalKm ? { custom_interval_km: Number(customIntervalKm) } : {}),
        ...(customIntervalMonths ? { custom_interval_months: Number(customIntervalMonths) } : {}),
        is_reminder_enabled: true,
      });
      setBrandOrSpec("");
      setCustomIntervalKm("");
      setCustomIntervalMonths("");
      setShowAddWear(false);
      onNotice("Wear interval saved.");
      await loadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save wear interval.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveLog(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceType.trim()) {
      onError("Service type is required.");
      return;
    }
    setBusy(true);
    try {
      await createMaintenanceLog(garageId, {
        service_type: serviceType.trim(),
        ...(partBrand.trim() ? { part_name_or_brand: partBrand.trim() } : {}),
        mileage_at_service: Number(serviceMileage) || 0,
        ...(cost.trim() ? { cost: cost.trim() } : {}),
        ...(workshop.trim() ? { workshop_name: workshop.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setPartBrand("");
      setCost("");
      setWorkshop("");
      setNotes("");
      setShowAddLog(false);
      onNotice("Maintenance log recorded.");
      await loadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to record maintenance log.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === "component") {
        await deleteGarageComponent(garageId, deleteTarget.id);
      } else {
        await deleteMaintenanceLog(garageId, deleteTarget.id);
      }
      setDeleteTarget(null);
      onNotice("Record removed.");
      await loadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete record.");
    } finally {
      setBusy(false);
    }
  }

  const dueCount = components.filter((c) => c.is_due).length;

  return (
    <div className="mt-4 pt-4 border-t border-border/70 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-border bg-secondary/30 p-0.5">
          <button
            type="button"
            onClick={() => setSubTab("wear")}
            className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              subTab === "wear"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Wear Intervals ({components.length}){dueCount > 0 ? ` · ${dueCount} Due` : ""}
          </button>
          <button
            type="button"
            onClick={() => setSubTab("logs")}
            className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              subTab === "logs"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Service Logs ({logs.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            aria-label="Refresh maintenance records"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
          </button>
          {subTab === "wear" ? (
            <button
              type="button"
              onClick={() => setShowAddWear((v) => !v)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Plus className="size-3.5" /> Track Part
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddLog((v) => !v)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Wrench className="size-3.5" /> Add Service
            </button>
          )}
        </div>
      </div>

      {subTab === "wear" && showAddWear && (
        <form
          onSubmit={(e) => void handleSaveComponent(e)}
          className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select
              aria-label="Component"
              value={componentId}
              onChange={(e) => setComponentId(Number(e.target.value))}
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            >
              {filteredMaster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              value={brandOrSpec}
              onChange={(e) => setBrandOrSpec(e.target.value)}
              placeholder="Brand / spec (optional)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
            <input
              type="number"
              min={0}
              value={replacedMileage}
              onChange={(e) => setReplacedMileage(e.target.value)}
              placeholder="Replaced at km"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
            <input
              type="number"
              min={100}
              value={customIntervalKm}
              onChange={(e) => setCustomIntervalKm(e.target.value)}
              placeholder="Custom interval km"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddWear(false)}
              className="min-h-[36px] rounded-full border border-border px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-[36px] rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Interval"}
            </button>
          </div>
        </form>
      )}

      {subTab === "logs" && showAddLog && (
        <form
          onSubmit={(e) => void handleSaveLog(e)}
          className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input
              required
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="Service type (e.g. Oil Change)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
            <input
              value={partBrand}
              onChange={(e) => setPartBrand(e.target.value)}
              placeholder="Parts / oil brand"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
            <input
              type="number"
              min={0}
              value={serviceMileage}
              onChange={(e) => setServiceMileage(e.target.value)}
              placeholder="Mileage km"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost (e.g. 250000)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              placeholder="Workshop / dealer (optional)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddLog(false)}
              className="min-h-[36px] rounded-full border border-border px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-[36px] rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : "Record Service"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-16 rounded-xl bg-secondary/20 animate-pulse" />
      ) : subTab === "wear" ? (
        components.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No wear intervals tracked yet. Track oil, tires, or chain intervals above.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {components.map((comp) => (
              <div
                key={comp.id}
                className={`rounded-xl border px-3 py-2.5 flex items-start justify-between gap-2 ${
                  comp.is_due
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-border/70 bg-secondary/20"
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    {comp.is_due && <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />}
                    <span className="truncate">{comp.name}</span>
                  </div>
                  {comp.brand_or_spec && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {comp.brand_or_spec}
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Replaced {comp.last_replaced_mileage.toLocaleString()} km
                    {typeof comp.next_due_mileage === "number"
                      ? ` · Due ${comp.next_due_mileage.toLocaleString()} km`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      kind: "component",
                      id: comp.id,
                      label: comp.name,
                    })
                  }
                  aria-label={`Remove ${comp.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No service logs recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border/70 bg-secondary/20 px-3 py-2.5 flex items-start justify-between gap-2"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-semibold text-foreground">
                  {log.service_type}
                  {log.part_name_or_brand ? ` — ${log.part_name_or_brand}` : ""}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {log.service_date.slice(0, 10)} · {log.mileage_at_service.toLocaleString()} km
                  {log.workshop_name ? ` · ${log.workshop_name}` : ""}
                </div>
                {log.notes && <p className="text-[11px] text-muted-foreground">{log.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({ kind: "log", id: log.id, label: log.service_type })
                }
                aria-label={`Delete ${log.service_type}`}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Maintenance Record"
        message={`Remove "${deleteTarget?.label ?? "this record"}" from this bike's maintenance log?`}
        confirmLabel="Remove"
        destructive
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
