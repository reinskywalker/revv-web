import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, MessageSquare, Pencil, Plus, RefreshCw, Send, Trash2, Wrench } from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { ModalShell } from "@/components/revv/ModalShell";
import {
  createGarageItemComment,
  createMaintenanceLog,
  deleteGarageComponent,
  deleteGarageItemComment,
  deleteMaintenanceLog,
  fetchGarageComponents,
  fetchGarageItemComments,
  fetchMaintenanceLogs,
  updateGarageComponent,
  updateMaintenanceLog,
  upsertGarageComponent,
  type GarageComponentItem,
  type GarageItemCommentItem,
  type MaintenanceLogItem,
  type MasterComponentItemPublic,
} from "@/lib/api-rider";
import { formatThousandsDot, parseThousandsDot } from "@/lib/number-format";

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
  const [replacedMileage, setReplacedMileage] = useState(formatThousandsDot(currentMileage));
  const [customIntervalKm, setCustomIntervalKm] = useState("");
  const [customIntervalMonths, setCustomIntervalMonths] = useState("");

  // Edit modals for component / service log
  const [editingComp, setEditingComp] = useState<GarageComponentItem | null>(null);
  const [editCompBrand, setEditCompBrand] = useState("");
  const [editCompReplacedKm, setEditCompReplacedKm] = useState("");
  const [editCompIntervalKm, setEditCompIntervalKm] = useState("");
  const [editCompIntervalMonths, setEditCompIntervalMonths] = useState("");
  const [editCompReminder, setEditCompReminder] = useState(true);

  const [editingLog, setEditingLog] = useState<MaintenanceLogItem | null>(null);
  const [editLogType, setEditLogType] = useState("");
  const [editLogPart, setEditLogPart] = useState("");
  const [editLogKm, setEditLogKm] = useState("");
  const [editLogIntervalKm, setEditLogIntervalKm] = useState("");
  const [editLogIntervalMonths, setEditLogIntervalMonths] = useState("");
  const [editLogCost, setEditLogCost] = useState("");
  const [editLogWorkshop, setEditLogWorkshop] = useState("");
  const [editLogNotes, setEditLogNotes] = useState("");

  // Per-item comments modal
  const [commentTarget, setCommentTarget] = useState<{
    itemType: "component" | "service_log";
    itemId: string;
    title: string;
  } | null>(null);
  const [itemComments, setItemComments] = useState<GarageItemCommentItem[]>([]);
  const [commentInput, setCommentInput] = useState("");

  // Maintenance log form
  const [serviceType, setServiceType] = useState("Routine Service");
  const [partBrand, setPartBrand] = useState("");
  const [serviceMileage, setServiceMileage] = useState(formatThousandsDot(currentMileage));
  const [logIntervalKm, setLogIntervalKm] = useState("");
  const [logIntervalMonths, setLogIntervalMonths] = useState("");
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
        last_replaced_mileage: parseThousandsDot(replacedMileage),
        ...(customIntervalKm ? { custom_interval_km: parseThousandsDot(customIntervalKm) } : {}),
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
        mileage_at_service: parseThousandsDot(serviceMileage),
        ...(logIntervalKm ? { custom_interval_km: parseThousandsDot(logIntervalKm) } : {}),
        ...(logIntervalMonths ? { custom_interval_months: Number(logIntervalMonths) } : {}),
        ...(cost.trim() ? { cost: cost.trim() } : {}),
        ...(workshop.trim() ? { workshop_name: workshop.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setPartBrand("");
      setLogIntervalKm("");
      setLogIntervalMonths("");
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

  async function openComments(itemType: "component" | "service_log", itemId: string, title: string) {
    setCommentTarget({ itemType, itemId, title });
    setCommentInput("");
    try {
      const list = await fetchGarageItemComments(garageId, itemType, itemId);
      setItemComments(list);
    } catch {
      setItemComments([]);
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
              type="text"
              inputMode="numeric"
              value={replacedMileage}
              onChange={(e) => setReplacedMileage(formatThousandsDot(e.target.value))}
              placeholder="Replaced at km (e.g. 3.000)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs font-mono text-foreground"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={customIntervalKm}
                onChange={(e) => setCustomIntervalKm(formatThousandsDot(e.target.value))}
                placeholder="Every km"
                className="w-1/2 min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs font-mono text-foreground"
              />
              <input
                type="number"
                min={1}
                value={customIntervalMonths}
                onChange={(e) => setCustomIntervalMonths(e.target.value)}
                placeholder="Months"
                className="w-1/2 min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs font-mono text-foreground"
              />
            </div>
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
              type="text"
              inputMode="numeric"
              value={serviceMileage}
              onChange={(e) => setServiceMileage(formatThousandsDot(e.target.value))}
              placeholder="Mileage km (e.g. 3.000)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs font-mono text-foreground"
            />
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost (e.g. 250000)"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs text-foreground"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={logIntervalKm}
              onChange={(e) => setLogIntervalKm(formatThousandsDot(e.target.value))}
              placeholder="Next every km"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs font-mono text-foreground"
            />
            <input
              type="number"
              min={1}
              value={logIntervalMonths}
              onChange={(e) => setLogIntervalMonths(e.target.value)}
              placeholder="Next every months"
              className="min-h-[40px] rounded-lg border border-border bg-card px-2.5 text-xs font-mono text-foreground"
            />
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
                onClick={() => void openComments("component", comp.id, comp.name)}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 flex items-start justify-between gap-2 transition hover:border-primary/40 ${
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
                    Replaced {comp.last_replaced_mileage.toLocaleString("id-ID")} km
                    {typeof comp.interval_km === "number"
                      ? ` · Every ${comp.interval_km.toLocaleString("id-ID")} km`
                      : ""}
                    {typeof comp.interval_months === "number" ? ` / ${comp.interval_months} mo` : ""}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => void openComments("component", comp.id, comp.name)}
                    aria-label={`Comments for ${comp.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                    title="Comments"
                  >
                    <MessageSquare className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingComp(comp);
                      setEditCompBrand(comp.brand_or_spec || "");
                      setEditCompReplacedKm(formatThousandsDot(comp.last_replaced_mileage));
                      setEditCompIntervalKm(comp.interval_km ? formatThousandsDot(comp.interval_km) : "");
                      setEditCompIntervalMonths(comp.interval_months ? String(comp.interval_months) : "");
                      setEditCompReminder(comp.is_reminder_enabled);
                    }}
                    aria-label={`Edit ${comp.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                    title="Edit Interval"
                  >
                    <Pencil className="size-3.5" />
                  </button>
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
              onClick={() => void openComments("service_log", log.id, log.service_type)}
              className="cursor-pointer rounded-xl border border-border/70 bg-secondary/20 px-3 py-2.5 flex items-start justify-between gap-2 transition hover:border-primary/40"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-semibold text-foreground">
                  {log.service_type}
                  {log.part_name_or_brand ? ` — ${log.part_name_or_brand}` : ""}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {log.service_date.slice(0, 10)} · {log.mileage_at_service.toLocaleString("id-ID")} km
                  {log.custom_interval_km ? ` · Every ${log.custom_interval_km.toLocaleString("id-ID")} km` : ""}
                  {log.workshop_name ? ` · ${log.workshop_name}` : ""}
                </div>
                {log.notes && <p className="text-[11px] text-muted-foreground">{log.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => void openComments("service_log", log.id, log.service_type)}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                  title="Comments"
                >
                  <MessageSquare className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLog(log);
                    setEditLogType(log.service_type);
                    setEditLogPart(log.part_name_or_brand || "");
                    setEditLogKm(formatThousandsDot(log.mileage_at_service));
                    setEditLogIntervalKm(log.custom_interval_km ? formatThousandsDot(log.custom_interval_km) : "");
                    setEditLogIntervalMonths(log.custom_interval_months ? String(log.custom_interval_months) : "");
                    setEditLogCost(log.cost || "");
                    setEditLogWorkshop(log.workshop_name || "");
                    setEditLogNotes(log.notes || "");
                  }}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                  title="Edit Log"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({ kind: "log", id: log.id, label: log.service_type })
                  }
                  aria-label={`Delete ${log.service_type}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Component Modal */}
      {editingComp && (
        <ModalShell
          open
          onClose={() => setEditingComp(null)}
          title={<h4 className="font-display text-sm font-bold uppercase">Edit {editingComp.name}</h4>}
          maxWidthClass="max-w-md"
          panelClassName="p-5 space-y-3"
        >
            <input value={editCompBrand} onChange={(e) => setEditCompBrand(e.target.value)} placeholder="Brand / spec" className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs" />
            <input value={editCompReplacedKm} onChange={(e) => setEditCompReplacedKm(formatThousandsDot(e.target.value))} placeholder="Last replaced mileage (km)" className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input value={editCompIntervalKm} onChange={(e) => setEditCompIntervalKm(formatThousandsDot(e.target.value))} placeholder="Every km (e.g. 3.000)" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs" />
              <input type="number" value={editCompIntervalMonths} onChange={(e) => setEditCompIntervalMonths(e.target.value)} placeholder="Every months" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editCompReminder} onChange={(e) => setEditCompReminder(e.target.checked)} />
              <span>Enable Push Reminder (FCM)</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingComp(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await updateGarageComponent(garageId, editingComp.id, {
                    brand_or_spec: editCompBrand.trim(),
                    last_replaced_mileage: parseThousandsDot(editCompReplacedKm),
                    ...(editCompIntervalKm ? { custom_interval_km: parseThousandsDot(editCompIntervalKm) } : {}),
                    ...(editCompIntervalMonths ? { custom_interval_months: Number(editCompIntervalMonths) } : {}),
                    is_reminder_enabled: editCompReminder,
                  });
                  setEditingComp(null);
                  onNotice("Component interval updated.");
                  await loadData();
                }}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                Save
              </button>
            </div>
        </ModalShell>
      )}

      {/* Edit Service Log Modal */}
      {editingLog && (
        <ModalShell
          open
          onClose={() => setEditingLog(null)}
          title={<h4 className="font-display text-sm font-bold uppercase">Edit Service Log</h4>}
          maxWidthClass="max-w-md"
          panelClassName="p-5 space-y-3"
        >
            <input value={editLogType} onChange={(e) => setEditLogType(e.target.value)} placeholder="Service type" className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs" />
            <input value={editLogPart} onChange={(e) => setEditLogPart(e.target.value)} placeholder="Parts / oil brand" className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <input value={editLogKm} onChange={(e) => setEditLogKm(formatThousandsDot(e.target.value))} placeholder="Odometer" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs" />
              <input value={editLogIntervalKm} onChange={(e) => setEditLogIntervalKm(formatThousandsDot(e.target.value))} placeholder="Every km" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs" />
              <input type="number" value={editLogIntervalMonths} onChange={(e) => setEditLogIntervalMonths(e.target.value)} placeholder="Months" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={editLogCost} onChange={(e) => setEditLogCost(e.target.value)} placeholder="Cost" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs" />
              <input value={editLogWorkshop} onChange={(e) => setEditLogWorkshop(e.target.value)} placeholder="Workshop" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs" />
            </div>
            <textarea rows={2} value={editLogNotes} onChange={(e) => setEditLogNotes(e.target.value)} placeholder="Notes" className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingLog(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await updateMaintenanceLog(garageId, editingLog.id, {
                    service_type: editLogType.trim(),
                    part_name_or_brand: editLogPart.trim(),
                    mileage_at_service: parseThousandsDot(editLogKm),
                    ...(editLogIntervalKm ? { custom_interval_km: parseThousandsDot(editLogIntervalKm) } : {}),
                    ...(editLogIntervalMonths ? { custom_interval_months: Number(editLogIntervalMonths) } : {}),
                    cost: editLogCost.trim() || "0",
                    workshop_name: editLogWorkshop.trim(),
                    notes: editLogNotes.trim(),
                  });
                  setEditingLog(null);
                  onNotice("Service log updated.");
                  await loadData();
                }}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                Save Log
              </button>
            </div>
        </ModalShell>
      )}

      {/* Per-Item Comments Modal */}
      {commentTarget && (
        <ModalShell
          open
          onClose={() => setCommentTarget(null)}
          title={<h4 className="font-display text-sm font-bold uppercase truncate">Comments · {commentTarget.title}</h4>}
          maxWidthClass="max-w-md"
          panelClassName="p-5 space-y-3"
        >
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {itemComments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No comments yet.</p>
              ) : (
                itemComments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 flex justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-primary">@{c.author_username || c.author_name}</div>
                      <div className="text-foreground mt-0.5">{c.comment}</div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteGarageItemComment(garageId, c.id);
                        setItemComments((prev) => prev.filter((x) => x.id !== c.id));
                      }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commentInput.trim()) return;
                const created = await createGarageItemComment(
                  garageId,
                  commentTarget.itemType,
                  commentTarget.itemId,
                  commentInput.trim(),
                );
                setItemComments((prev) => [...prev, created]);
                setCommentInput("");
              }}
              className="flex gap-2"
            >
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Write a comment or mechanic note…"
                className="flex-1 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs"
              />
              <button type="submit" className="btn-primary px-3 py-2 text-xs">
                <Send className="size-3.5" />
              </button>
            </form>
        </ModalShell>
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
