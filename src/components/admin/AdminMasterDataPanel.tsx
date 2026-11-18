import { useMemo, useState } from "react";
import {
  Bell,
  Eye,
  Mail,
  Pencil,
  Plus,
  Settings,
  Sliders,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  createAdminBrand,
  createAdminComponent,
  createAdminMotorcycle,
  createAdminNotificationTemplate,
  deleteAdminBrand,
  deleteAdminComponent,
  deleteAdminMotorcycle,
  deleteAdminNotificationTemplate,
  type MasterBrandItem,
  type MasterComponentItem,
  type MasterEmailTemplateItem,
  type MasterGeneralSettingItem,
  type MasterMotorcycleItem,
  type MasterNotificationTemplateItem,
  updateAdminBrand,
  updateAdminComponent,
  updateAdminEmailTemplate,
  updateAdminGeneralSetting,
  updateAdminMotorcycle,
  updateAdminNotificationTemplate,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export type MasterSubTab = "brands" | "components" | "notifications" | "emails" | "settings";

const TRANSMISSIONS = ["matic", "manual", "semi_auto", "dct"] as const;
const CATEGORIES = ["scooter", "naked", "sport", "adventure", "touring", "cruiser", "classic"] as const;

export function AdminMasterDataPanel({
  activeMasterSub,
  onSelectMasterSub,
  brands,
  motorcycles,
  components,
  notifTemplates,
  emailTemplates,
  generalSettings,
  onReload,
  onNotice,
}: {
  activeMasterSub: MasterSubTab;
  onSelectMasterSub: (sub: MasterSubTab) => void;
  brands: MasterBrandItem[];
  motorcycles: MasterMotorcycleItem[];
  components: MasterComponentItem[];
  notifTemplates: MasterNotificationTemplateItem[];
  emailTemplates: MasterEmailTemplateItem[];
  generalSettings: MasterGeneralSettingItem[];
  onReload: () => Promise<void>;
  onNotice: (msg: string | null) => void;
}) {
  // Brand create/edit
  const [newBrandName, setNewBrandName] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");
  const [editingBrand, setEditingBrand] = useState<MasterBrandItem | null>(null);
  const [editBrandName, setEditBrandName] = useState("");

  // Motorcycle create/edit
  const [newMotoBrandId, setNewMotoBrandId] = useState<string>(brands[0] ? String(brands[0].id) : "");
  const [newMotoSeries, setNewMotoSeries] = useState("");
  const [newMotoTransmission, setNewMotoTransmission] = useState("manual");
  const [newMotoCategory, setNewMotoCategory] = useState("naked");
  const [newMotoCc, setNewMotoCc] = useState("150");
  const [editingMoto, setEditingMoto] = useState<MasterMotorcycleItem | null>(null);
  const [editMotoSeries, setEditMotoSeries] = useState("");
  const [editMotoBrandId, setEditMotoBrandId] = useState("");
  const [editMotoTrans, setEditMotoTrans] = useState("manual");
  const [editMotoCat, setEditMotoCat] = useState("naked");
  const [editMotoCc, setEditMotoCc] = useState("");

  // Component create/edit
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompNameEn, setNewCompNameEn] = useState("");
  const [newCompNameId, setNewCompNameId] = useState("");
  const [newCompKm, setNewCompKm] = useState("4000");
  const [newCompMonths, setNewCompMonths] = useState("6");
  const [newCompTrans, setNewCompTrans] = useState<string[]>(["matic", "manual", "semi_auto", "dct"]);
  const [editingComp, setEditingComp] = useState<MasterComponentItem | null>(null);
  const [editCompCode, setEditCompCode] = useState("");
  const [editCompNameEn, setEditCompNameEn] = useState("");
  const [editCompNameId, setEditCompNameId] = useState("");
  const [editCompKm, setEditCompKm] = useState("");
  const [editCompMonths, setEditCompMonths] = useState("");
  const [editCompTrans, setEditCompTrans] = useState<string[]>([]);

  // Notification template create/edit
  const [editingNotif, setEditingNotif] = useState<MasterNotificationTemplateItem | null>(null);
  const [notifForm, setNotifForm] = useState({
    code: "",
    category: "garage",
    name: "",
    title_template: "",
    body_template: "",
    language: "en",
    variables_hint: "",
  });

  // Email template edit + preview popup
  const [selectedEmailId, setSelectedEmailId] = useState<number>(emailTemplates[0]?.id ?? 0);
  const activeEmailTemplate =
    emailTemplates.find((e) => e.id === selectedEmailId) ?? emailTemplates[0] ?? null;
  const [emailSubjectDraft, setEmailSubjectDraft] = useState<string | null>(null);
  const [emailHtmlDraft, setEmailHtmlDraft] = useState<string | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);

  // General settings drafts
  const [settingDrafts, setSettingDrafts] = useState<Record<number, string>>({});

  const filteredMotorcycles = useMemo(() => {
    if (selectedBrandFilter === "all") return motorcycles;
    return motorcycles.filter((m) => String(m.brand_id) === selectedBrandFilter);
  }, [motorcycles, selectedBrandFilter]);

  const currentSubject = emailSubjectDraft ?? activeEmailTemplate?.subject_template ?? "";
  const currentHtml = emailHtmlDraft ?? activeEmailTemplate?.html_body ?? "";
  const compiledEmailPreviewHtml = useMemo(
    () =>
      currentHtml
        .replaceAll("{{otp}}", "482910")
        .replaceAll("{{display_name}}", "Reynaldi")
        .replaceAll("{{expiry_minutes}}", "10")
        .replaceAll("{{request_id}}", "req-preview-9f2a"),
    [currentHtml],
  );

  return (
    <div className="space-y-6">
      {/* Sub-submenu tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["brands", `Brand & Motorcycle (${brands.length} / ${motorcycles.length})`, Wrench],
            ["components", `Components (${components.length})`, Sliders],
            ["notifications", `Notification Templates (${notifTemplates.length})`, Bell],
            ["emails", `Email Templates (${emailTemplates.length})`, Mail],
            ["settings", `General Settings (${generalSettings.length})`, Settings],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectMasterSub(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition",
              activeMasterSub === key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 1. BRAND & MOTORCYCLE COMBINED */}
      {activeMasterSub === "brands" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Brands (Left 4 cols) */}
          <div className="hud-card p-5 space-y-4 lg:col-span-4">
            <h4 className="font-display text-base font-black uppercase">Motorcycle Brands</h4>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newBrandName.trim()) return;
                try {
                  await createAdminBrand({ name: newBrandName.trim(), is_active: true });
                  setNewBrandName("");
                  await onReload();
                  onNotice("Brand created.");
                } catch (err) {
                  onNotice(err instanceof Error ? err.message : "Failed to create brand.");
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Add brand (e.g. Harley-Davidson)"
                className="flex-1 rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              />
              <button type="submit" className="btn-primary px-3 py-2 text-xs">
                <Plus className="size-3.5" />
              </button>
            </form>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedBrandFilter("all")}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2 font-mono text-xs flex justify-between",
                  selectedBrandFilter === "all"
                    ? "border-primary bg-primary/15 text-primary font-bold"
                    : "border-border/50 bg-secondary/20 text-muted-foreground",
                )}
              >
                <span>All Brands</span>
                <span>{motorcycles.length} models</span>
              </button>
              {brands.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                    selectedBrandFilter === String(b.id)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/50 bg-secondary/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedBrandFilter(String(b.id))}
                    className="flex-1 text-left font-semibold truncate"
                  >
                    {b.name}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrand(b);
                        setEditBrandName(b.name);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="Edit brand"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAdminBrand(b.id);
                        await onReload();
                        onNotice(`Removed brand ${b.name}.`);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Delete brand"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motorcycles (Right 8 cols) */}
          <div className="hud-card p-5 space-y-4 lg:col-span-8">
            <h4 className="font-display text-base font-black uppercase">
              Motorcycle Models ({filteredMotorcycles.length})
            </h4>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const bid = Number(newMotoBrandId || brands[0]?.id);
                if (!bid || !newMotoSeries.trim()) return;
                try {
                  await createAdminMotorcycle({
                    brand_id: bid,
                    series_name: newMotoSeries.trim(),
                    transmission: newMotoTransmission,
                    category: newMotoCategory,
                    engine_cc: Number(newMotoCc) || null,
                    is_active: true,
                  });
                  setNewMotoSeries("");
                  await onReload();
                  onNotice("Motorcycle model added.");
                } catch (err) {
                  onNotice(err instanceof Error ? err.message : "Failed to add model.");
                }
              }}
              className="grid gap-2 sm:grid-cols-6"
            >
              <select
                value={newMotoBrandId || (brands[0] ? String(brands[0].id) : "")}
                onChange={(e) => setNewMotoBrandId(e.target.value)}
                className="rounded-lg border border-input bg-secondary/40 px-2.5 py-2 text-xs sm:col-span-2"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newMotoSeries}
                onChange={(e) => setNewMotoSeries(e.target.value)}
                placeholder="Series (e.g. Jupiter Z1)"
                className="rounded-lg border border-input bg-secondary/40 px-2.5 py-2 text-xs sm:col-span-2"
              />
              <select
                value={newMotoTransmission}
                onChange={(e) => setNewMotoTransmission(e.target.value)}
                className="rounded-lg border border-input bg-secondary/40 px-2 py-2 text-xs"
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={newMotoCc}
                  onChange={(e) => setNewMotoCc(e.target.value)}
                  placeholder="CC"
                  className="w-16 rounded-lg border border-input bg-secondary/40 px-2 py-2 text-xs"
                />
                <button type="submit" className="btn-primary flex-1 px-2 py-2 text-xs">
                  Add
                </button>
              </div>
              <select
                value={newMotoCategory}
                onChange={(e) => setNewMotoCategory(e.target.value)}
                className="rounded-lg border border-input bg-secondary/40 px-2.5 py-1.5 text-xs sm:col-span-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    Category: {c}
                  </option>
                ))}
              </select>
            </form>

            <div className="overflow-x-auto max-h-[430px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 font-mono text-[10px] uppercase text-muted-foreground sticky top-0 bg-card">
                  <tr>
                    <th className="py-2 pr-3">Brand</th>
                    <th className="py-2 px-3">Series Name</th>
                    <th className="py-2 px-3">Transmission</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">CC</th>
                    <th className="py-2 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredMotorcycles.map((m) => (
                    <tr key={m.id} className="hover:bg-secondary/20">
                      <td className="py-2 pr-3 font-mono text-primary">{m.brand_name}</td>
                      <td className="py-2 px-3 font-semibold">{m.series_name}</td>
                      <td className="py-2 px-3 font-mono uppercase">{m.transmission}</td>
                      <td className="py-2 px-3 font-mono uppercase">{m.category}</td>
                      <td className="py-2 px-3 font-mono text-right">{m.engine_cc ?? "—"}</td>
                      <td className="py-2 pl-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMoto(m);
                              setEditMotoBrandId(String(m.brand_id));
                              setEditMotoSeries(m.series_name);
                              setEditMotoTrans(m.transmission);
                              setEditMotoCat(m.category);
                              setEditMotoCc(m.engine_cc ? String(m.engine_cc) : "");
                            }}
                            className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteAdminMotorcycle(m.id);
                              await onReload();
                              onNotice(`Removed ${m.brand_name} ${m.series_name}.`);
                            }}
                            className="rounded border border-destructive/40 bg-destructive/10 p-1 text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MASTER COMPONENTS (BILINGUAL READY) */}
      {activeMasterSub === "components" && (
        <div className="hud-card p-6 space-y-5">
          <div>
            <h4 className="font-display text-lg font-black uppercase">
              Master Components Catalog (Bilingual EN / ID)
            </h4>
            <p className="font-mono text-xs text-muted-foreground">
              Define English and Indonesian labels plus default km/month maintenance intervals.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCompCode.trim() || (!newCompNameEn.trim() && !newCompNameId.trim())) return;
              try {
                await createAdminComponent({
                  code: newCompCode.trim().toUpperCase(),
                  name: (newCompNameEn || newCompNameId).trim(),
                  name_en: (newCompNameEn || newCompNameId).trim(),
                  name_id: (newCompNameId || newCompNameEn).trim(),
                  default_interval_km: Number(newCompKm) || null,
                  default_interval_months: Number(newCompMonths) || null,
                  applicable_transmission: newCompTrans,
                  is_active: true,
                });
                setNewCompCode("");
                setNewCompNameEn("");
                setNewCompNameId("");
                await onReload();
                onNotice("Master component created.");
              } catch (err) {
                onNotice(err instanceof Error ? err.message : "Failed to add component.");
              }
            }}
            className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:grid-cols-6"
          >
            <input
              type="text"
              value={newCompCode}
              onChange={(e) => setNewCompCode(e.target.value)}
              placeholder="Code (e.g. ENGINE_OIL)"
              className="rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs"
            />
            <input
              type="text"
              value={newCompNameEn}
              onChange={(e) => setNewCompNameEn(e.target.value)}
              placeholder="Name (EN)"
              className="rounded-lg border border-input bg-card px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={newCompNameId}
              onChange={(e) => setNewCompNameId(e.target.value)}
              placeholder="Nama (ID)"
              className="rounded-lg border border-input bg-card px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={newCompKm}
              onChange={(e) => setNewCompKm(e.target.value)}
              placeholder="Interval KM"
              className="rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs"
            />
            <input
              type="number"
              value={newCompMonths}
              onChange={(e) => setNewCompMonths(e.target.value)}
              placeholder="Interval Months"
              className="rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs"
            />
            <button type="submit" className="btn-primary text-xs">
              + Add Component
            </button>
            <div className="sm:col-span-6 flex flex-wrap gap-3 items-center font-mono text-[11px]">
              <span className="text-muted-foreground">Applicable Transmission:</span>
              {TRANSMISSIONS.map((tr) => (
                <label key={tr} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCompTrans.includes(tr)}
                    onChange={(e) =>
                      setNewCompTrans((prev) =>
                        e.target.checked ? [...prev, tr] : prev.filter((x) => x !== tr),
                      )
                    }
                  />
                  <span className="uppercase">{tr}</span>
                </label>
              ))}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2.5 pr-3">Code</th>
                  <th className="py-2.5 px-3">Name (EN)</th>
                  <th className="py-2.5 px-3">Name (ID)</th>
                  <th className="py-2.5 px-3 text-right">Every KM</th>
                  <th className="py-2.5 px-3 text-right">Every Months</th>
                  <th className="py-2.5 px-3">Transmission</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {components.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/20">
                    <td className="py-2.5 pr-3 font-mono text-primary font-semibold">{c.code}</td>
                    <td className="py-2.5 px-3 font-semibold">{c.name_en || c.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.name_id || c.name}</td>
                    <td className="py-2.5 px-3 font-mono text-right">
                      {c.default_interval_km ? `${c.default_interval_km.toLocaleString("id-ID")} km` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right">
                      {c.default_interval_months ? `${c.default_interval_months} mo` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] uppercase">
                      {c.applicable_transmission.join(", ")}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComp(c);
                            setEditCompCode(c.code);
                            setEditCompNameEn(c.name_en || c.name);
                            setEditCompNameId(c.name_id || c.name);
                            setEditCompKm(c.default_interval_km ? String(c.default_interval_km) : "");
                            setEditCompMonths(
                              c.default_interval_months ? String(c.default_interval_months) : "",
                            );
                            setEditCompTrans(c.applicable_transmission);
                          }}
                          className="rounded border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary hover:bg-primary/20"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAdminComponent(c.id);
                            await onReload();
                            onNotice(`Removed component ${c.code}.`);
                          }}
                          className="rounded border border-destructive/40 bg-destructive/10 p-1 text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATION TEMPLATES */}
      {activeMasterSub === "notifications" && (
        <div className="hud-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-lg font-black uppercase">
                Master Notification Templates
              </h4>
              <p className="font-mono text-xs text-muted-foreground">
                Edit push notification &amp; in-app wording across service reminders, squad alerts,
                and social events.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingNotif({
                  id: 0,
                  code: "",
                  category: "garage",
                  name: "",
                  title_template: "",
                  body_template: "",
                  language: "en",
                  variables_hint: "",
                  updated_at: new Date().toISOString(),
                });
                setNotifForm({
                  code: "",
                  category: "garage",
                  name: "",
                  title_template: "",
                  body_template: "",
                  language: "en",
                  variables_hint: "",
                });
              }}
              className="btn-primary text-xs px-3 py-2"
            >
              + New Template
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2.5 pr-3">Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Title Wording</th>
                  <th className="py-2.5 px-3">Body Wording</th>
                  <th className="py-2.5 px-3">Variables</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {notifTemplates.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/20">
                    <td className="py-3 pr-3 font-mono text-primary font-bold">{t.code}</td>
                    <td className="py-3 px-3 font-mono uppercase">{t.category}</td>
                    <td className="py-3 px-3 font-semibold">{t.title_template}</td>
                    <td className="py-3 px-3 text-muted-foreground max-w-md">{t.body_template}</td>
                    <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground">
                      {t.variables_hint || "—"}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotif(t);
                            setNotifForm({
                              code: t.code,
                              category: t.category,
                              name: t.name,
                              title_template: t.title_template,
                              body_template: t.body_template,
                              language: t.language,
                              variables_hint: t.variables_hint || "",
                            });
                          }}
                          className="rounded border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAdminNotificationTemplate(t.id);
                            await onReload();
                            onNotice(`Deleted template ${t.code}.`);
                          }}
                          className="rounded border border-destructive/40 bg-destructive/10 p-1 text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. EMAIL TEMPLATES (HTML EDITOR + PREVIEW POPUP) */}
      {activeMasterSub === "emails" && (
        <div className="hud-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-display text-lg font-black uppercase">
                Master Email Templates (HTML Editor)
              </h4>
              <p className="font-mono text-xs text-muted-foreground">
                Edit transactional email HTML such as verification OTP delivery. Available tags:{" "}
                <code>{activeEmailTemplate?.variables_hint || "{{otp}}, {{display_name}}"}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={activeEmailTemplate?.id ?? ""}
                onChange={(e) => {
                  setSelectedEmailId(Number(e.target.value));
                  setEmailSubjectDraft(null);
                  setEmailHtmlDraft(null);
                }}
                className="rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs"
              >
                {emailTemplates.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.code} — {et.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/15 px-3.5 py-2 font-mono text-xs font-bold uppercase text-primary hover:bg-primary/25"
              >
                <Eye className="size-3.5" />
                See Preview
              </button>
            </div>
          </div>

          {activeEmailTemplate && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase text-muted-foreground">
                  Email Subject Template
                </label>
                <input
                  type="text"
                  value={currentSubject}
                  onChange={(e) => setEmailSubjectDraft(e.target.value)}
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase text-muted-foreground">
                  HTML Source Editor
                </label>
                <textarea
                  rows={16}
                  value={currentHtml}
                  onChange={(e) => setEmailHtmlDraft(e.target.value)}
                  className="w-full rounded-lg border border-input bg-[#090b10] p-3.5 font-mono text-xs text-emerald-300 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEmailPreviewModal(true)}
                  className="rounded-lg border border-border px-4 py-2 font-mono text-xs uppercase hover:bg-secondary/40"
                >
                  See Preview Popup
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await updateAdminEmailTemplate(activeEmailTemplate.id, {
                      subject_template: currentSubject,
                      html_body: currentHtml,
                    });
                    setEmailSubjectDraft(null);
                    setEmailHtmlDraft(null);
                    await onReload();
                    onNotice(`Saved email template ${activeEmailTemplate.code}.`);
                  }}
                  className="btn-primary text-xs px-5 py-2"
                >
                  Save HTML Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. GENERAL SETTINGS */}
      {activeMasterSub === "settings" && (
        <div className="hud-card p-6 space-y-5">
          <div>
            <h4 className="font-display text-lg font-black uppercase">
              Master General Settings &amp; Session Quotas
            </h4>
            <p className="font-mono text-xs text-muted-foreground">
              Backend-enforced limits for Ride Sessions, Left-Behind alerts, and Service Reminder
              cooldowns.
            </p>
          </div>
          <div className="space-y-3">
            {generalSettings.map((gs) => {
              const draft = settingDrafts[gs.id] ?? gs.setting_value;
              return (
                <div
                  key={gs.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase rounded bg-primary/15 px-2 py-0.5 text-primary font-bold">
                        {gs.category}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {gs.setting_key}
                      </span>
                    </div>
                    <div className="text-sm font-semibold">{gs.label}</div>
                    {gs.description && (
                      <p className="text-xs text-muted-foreground">{gs.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) =>
                        setSettingDrafts((prev) => ({ ...prev, [gs.id]: e.target.value }))
                      }
                      className="w-28 rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await updateAdminGeneralSetting(gs.id, { setting_value: draft });
                        await onReload();
                        onNotice(`Updated ${gs.setting_key} = ${draft}`);
                      }}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brand Edit Modal */}
      {editingBrand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEditingBrand(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display text-base font-black uppercase">Edit Brand</h4>
            <input
              type="text"
              value={editBrandName}
              onChange={(e) => setEditBrandName(e.target.value)}
              className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateAdminBrand(editingBrand.id, { name: editBrandName.trim() });
                  setEditingBrand(null);
                  await onReload();
                  onNotice("Brand updated.");
                }}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motorcycle Edit Modal */}
      {editingMoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEditingMoto(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display text-base font-black uppercase">Edit Motorcycle</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={editMotoBrandId}
                onChange={(e) => setEditMotoBrandId(e.target.value)}
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={editMotoSeries}
                onChange={(e) => setEditMotoSeries(e.target.value)}
                placeholder="Series Name"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              />
              <select
                value={editMotoTrans}
                onChange={(e) => setEditMotoTrans(e.target.value)}
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={editMotoCat}
                onChange={(e) => setEditMotoCat(e.target.value)}
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={editMotoCc}
                onChange={(e) => setEditMotoCc(e.target.value)}
                placeholder="Engine CC"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMoto(null)}
                className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateAdminMotorcycle(editingMoto.id, {
                    brand_id: Number(editMotoBrandId),
                    series_name: editMotoSeries.trim(),
                    transmission: editMotoTrans,
                    category: editMotoCat,
                    engine_cc: Number(editMotoCc) || null,
                  });
                  setEditingMoto(null);
                  await onReload();
                  onNotice("Motorcycle model updated.");
                }}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Edit Modal */}
      {editingComp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEditingComp(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display text-base font-black uppercase">Edit Component</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={editCompCode}
                onChange={(e) => setEditCompCode(e.target.value)}
                placeholder="Code"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs"
              />
              <input
                type="text"
                value={editCompNameEn}
                onChange={(e) => setEditCompNameEn(e.target.value)}
                placeholder="Name (EN)"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={editCompNameId}
                onChange={(e) => setEditCompNameId(e.target.value)}
                placeholder="Nama (ID)"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editCompKm}
                  onChange={(e) => setEditCompKm(e.target.value)}
                  placeholder="Every KM"
                  className="w-1/2 rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs"
                />
                <input
                  type="number"
                  value={editCompMonths}
                  onChange={(e) => setEditCompMonths(e.target.value)}
                  placeholder="Months"
                  className="w-1/2 rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 font-mono text-xs">
              {TRANSMISSIONS.map((tr) => (
                <label key={tr} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={editCompTrans.includes(tr)}
                    onChange={(e) =>
                      setEditCompTrans((prev) =>
                        e.target.checked ? [...prev, tr] : prev.filter((x) => x !== tr),
                      )
                    }
                  />
                  <span className="uppercase">{tr}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingComp(null)}
                className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateAdminComponent(editingComp.id, {
                    code: editCompCode.trim().toUpperCase(),
                    name: (editCompNameEn || editCompNameId).trim(),
                    name_en: editCompNameEn.trim(),
                    name_id: editCompNameId.trim(),
                    default_interval_km: Number(editCompKm) || null,
                    default_interval_months: Number(editCompMonths) || null,
                    applicable_transmission: editCompTrans,
                  });
                  setEditingComp(null);
                  await onReload();
                  onNotice("Component updated.");
                }}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Template Edit/Create Modal */}
      {editingNotif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEditingNotif(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display text-base font-black uppercase">
              {editingNotif.id ? `Edit ${editingNotif.code}` : "Create Notification Template"}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={notifForm.code}
                onChange={(e) => setNotifForm({ ...notifForm, code: e.target.value })}
                placeholder="Code"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs"
              />
              <input
                type="text"
                value={notifForm.category}
                onChange={(e) => setNotifForm({ ...notifForm, category: e.target.value })}
                placeholder="Category"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs"
              />
              <input
                type="text"
                value={notifForm.name}
                onChange={(e) => setNotifForm({ ...notifForm, name: e.target.value })}
                placeholder="Display Name"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs sm:col-span-2"
              />
              <input
                type="text"
                value={notifForm.title_template}
                onChange={(e) => setNotifForm({ ...notifForm, title_template: e.target.value })}
                placeholder="Title Template"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs sm:col-span-2"
              />
              <textarea
                rows={3}
                value={notifForm.body_template}
                onChange={(e) => setNotifForm({ ...notifForm, body_template: e.target.value })}
                placeholder="Body Template"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs sm:col-span-2"
              />
              <input
                type="text"
                value={notifForm.variables_hint}
                onChange={(e) => setNotifForm({ ...notifForm, variables_hint: e.target.value })}
                placeholder="Variables hint (e.g. {{actor_name}})"
                className="rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs sm:col-span-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNotif(null)}
                className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (editingNotif.id) {
                    await updateAdminNotificationTemplate(editingNotif.id, notifForm);
                  } else {
                    await createAdminNotificationTemplate(notifForm);
                  }
                  setEditingNotif(null);
                  await onReload();
                  onNotice("Notification template saved.");
                }}
                className="btn-primary px-4 py-1.5 text-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email HTML Preview Popup */}
      {showEmailPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowEmailPreviewModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <div>
                <h5 className="font-display text-sm font-black uppercase">Email HTML Preview</h5>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Subject:{" "}
                  <strong className="text-foreground">
                    {currentSubject.replaceAll("{{otp}}", "482910")}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 bg-[#07080a]">
              <iframe
                title="REVV Email Preview"
                sandbox=""
                srcDoc={compiledEmailPreviewHtml}
                className="w-full h-[420px] rounded-xl border border-border/60 bg-[#0a0b0e]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
