import { useCallback, useEffect, useState } from "react";
import { Lottie } from "lottie-react";
import { CheckCircle2, Coins, Plus, RefreshCw, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import { RevvBadge } from "@/components/revv/RevvBadge";
import { formatDbPrice } from "@/lib/api-billing";
import {
  type AdminCosmeticsResponse,
  type AdminPlanPriceItem,
  type AdminRegionalRuleItem,
  archiveAdminBadge,
  archiveAdminFrame,
  fetchAdminCosmetics,
  fetchAdminPricing,
  saveAdminBadge,
  saveAdminFrame,
  updateAdminPlanPrice,
} from "@/lib/api-cosmetics-admin";
import { clearCosmeticsMemoryCache } from "@/lib/cosmetics-cache";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SubView = "frames" | "badges" | "pricing";

export function AdminCosmeticsPanel() {
  const { t } = useI18n();
  const [subView, setSubView] = useState<SubView>("frames");
  const [cosmetics, setCosmetics] = useState<AdminCosmeticsResponse | null>(null);
  const [plans, setPlans] = useState<AdminPlanPriceItem[]>([]);
  const [rules, setRules] = useState<AdminRegionalRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shared cosmetic editor form state
  const [editingKind, setEditingKind] = useState<"frame" | "badge">("frame");
  const [editingExistingCode, setEditingExistingCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("shop");
  const [sourceType, setSourceType] = useState("purchase");
  const [conditionType, setConditionType] = useState("none");
  const [conditionTargetCode, setConditionTargetCode] = useState("");
  const [priceIdr, setPriceIdr] = useState("");
  const [priceUsdCents, setPriceUsdCents] = useState("");
  const [lottieRaw, setLottieRaw] = useState("");
  const [lottiePreview, setLottiePreview] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline DB plan price draft map
  const [planDrafts, setPlanDrafts] = useState<
    Record<string, { usd: string; idr: string; label: string }>
  >({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, pRes] = await Promise.all([fetchAdminCosmetics(), fetchAdminPricing()]);
      setCosmetics(cRes);
      setPlans(pRes.plans);
      setRules(pRes.regional_rules);
      const nextDrafts: Record<string, { usd: string; idr: string; label: string }> = {};
      for (const p of pRes.plans) {
        nextDrafts[p.plan_key] = {
          usd: String(p.base_price_usd_cents),
          idr: p.idr_override_amount != null ? String(p.idr_override_amount) : "",
          label: p.label,
        };
      }
      setPlanDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cosmetics & pricing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const resetForm = (kind: "frame" | "badge") => {
    setEditingKind(kind);
    setEditingExistingCode(null);
    setCode("");
    setTitle("");
    setDescription("");
    setCategory("shop");
    setSourceType("purchase");
    setConditionType("none");
    setConditionTargetCode("");
    setPriceIdr("");
    setPriceUsdCents("");
    setLottieRaw("");
    setLottiePreview(null);
  };

  const handleLottieTextChange = (raw: string) => {
    setLottieRaw(raw);
    if (!raw.trim()) {
      setLottiePreview(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && Array.isArray(parsed["layers"]) && parsed["w"] && parsed["h"]) {
        setLottiePreview(parsed);
      } else {
        setLottiePreview(null);
      }
    } catch {
      setLottiePreview(null);
    }
  };

  const handleLottieFileUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 200 * 1024) {
      setError("Lottie JSON file exceeds the 200 KB performance limit.");
      return;
    }
    const text = await file.text();
    handleLottieTextChange(text);
  };

  const handleSaveCosmetic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      let parsedLottie: Record<string, unknown> | null = null;
      if (lottieRaw.trim()) {
        parsedLottie = JSON.parse(lottieRaw) as Record<string, unknown>;
      }
      const payload = {
        code: editingExistingCode ?? code.trim(),
        title: title.trim(),
        description: description.trim(),
        category,
        source_type: sourceType,
        condition_type: conditionType,
        condition_target_code: conditionTargetCode.trim() || null,
        price_idr: priceIdr.trim() ? Number(priceIdr) : null,
        price_usd_cents: priceUsdCents.trim() ? Number(priceUsdCents) : null,
        is_animated: true,
        is_active: true,
        lottie_json: parsedLottie,
      };
      if (editingKind === "frame") {
        await saveAdminFrame(payload, editingExistingCode ?? undefined);
      } else {
        await saveAdminBadge(payload, editingExistingCode ?? undefined);
      }
      clearCosmeticsMemoryCache();
      setNotice(
        `${editingKind === "frame" ? "Avatar frame" : "Animated badge"} saved to PostgreSQL (live immediately with zero app rebuild).`,
      );
      resetForm(editingKind);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cosmetic item.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlanPrice = async (planKey: string) => {
    const draft = planDrafts[planKey];
    if (!draft) return;
    setError(null);
    setNotice(null);
    try {
      await updateAdminPlanPrice(planKey, {
        base_price_usd_cents: Math.max(0, Number(draft.usd) || 0),
        idr_override_amount: draft.idr.trim() ? Math.max(0, Number(draft.idr) || 0) : null,
        label: draft.label.trim() || undefined,
      });
      setNotice(`Updated DB pricing for ${planKey}.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update ${planKey}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t("billing.heroEyebrow")}</p>
          <h2 className="display-heading text-2xl font-black">{t("adminCosmetics.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("adminCosmetics.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-semibold hover:bg-secondary"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          {t("adminCosmetics.refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3">
        {(
          [
            { id: "frames", label: `${t("adminCosmetics.tabFrames")} (${cosmetics?.frames.length ?? 0})` },
            { id: "badges", label: `${t("adminCosmetics.tabBadges")} (${cosmetics?.badges.length ?? 0})` },
            { id: "pricing", label: `${t("adminCosmetics.tabPricing")} (${plans.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSubView(tab.id);
              if (tab.id === "frames") resetForm("frame");
              if (tab.id === "badges") resetForm("badge");
            }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              subView === tab.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary/40 text-foreground/80 hover:bg-secondary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {subView !== "pricing" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Catalog list */}
          <div className="space-y-3 lg:col-span-7">
            {(subView === "frames" ? (cosmetics?.frames ?? []) : (cosmetics?.badges ?? [])).map(
              (item) => (
                <div
                  key={item.code}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-4"
                >
                  <div className="flex items-center gap-3.5">
                    {subView === "frames" ? (
                      <RevvAvatar name={item.title} frameCode={item.code} size={44} />
                    ) : (
                      <RevvBadge
                        badgeCode={item.code}
                        assetHash={item.asset_hash}
                        lottieUrl={item.lottie_url}
                        title={item.title}
                        size={44}
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-bold">{item.title}</span>
                        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                          {item.code}
                        </code>
                        {!item.is_active && (
                          <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-xs text-destructive">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
                        <span>source: {item.source_type}</span>
                        <span>· condition: {item.condition_type}</span>
                        {item.condition_target_code && <span>({item.condition_target_code})</span>}
                        {item.price_idr != null && item.price_idr > 0 && (
                          <span className="text-warning">
                            · {formatDbPrice("IDR", item.price_idr)}
                          </span>
                        )}
                        {item.price_usd_cents != null && item.price_usd_cents > 0 && (
                          <span className="text-sky-400">
                            / {formatDbPrice("USD", item.price_usd_cents)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKind(subView === "frames" ? "frame" : "badge");
                        setEditingExistingCode(item.code);
                        setCode(item.code);
                        setTitle(item.title);
                        setDescription(item.description);
                        setCategory(item.category);
                        setSourceType(item.source_type);
                        setConditionType(item.condition_type);
                        setConditionTargetCode(item.condition_target_code ?? "");
                        setPriceIdr(item.price_idr != null ? String(item.price_idr) : "");
                        setPriceUsdCents(
                          item.price_usd_cents != null ? String(item.price_usd_cents) : "",
                        );
                        setLottieRaw("");
                        setLottiePreview(null);
                      }}
                      className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                    >
                      Edit
                    </button>
                    {item.is_active && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (subView === "frames") await archiveAdminFrame(item.code);
                          else await archiveAdminBadge(item.code);
                          clearCosmeticsMemoryCache();
                          await loadAll();
                        }}
                        className="rounded-lg border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                        title="Archive cosmetic"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Create / Edit Lottie form */}
          <form
            onSubmit={handleSaveCosmetic}
            className="space-y-4 rounded-xl border border-border/80 bg-card p-5 lg:col-span-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                {editingExistingCode
                  ? `Edit ${editingKind === "frame" ? "Frame" : "Badge"}: ${editingExistingCode}`
                  : `Add New ${editingKind === "frame" ? "Avatar Frame" : "Animated Badge"}`}
              </h3>
              {editingExistingCode && (
                <button
                  type="button"
                  onClick={() => resetForm(editingKind)}
                  className="text-xs text-muted-foreground underline"
                >
                  New Item
                </button>
              )}
            </div>

            {!editingExistingCode && (
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Unique Code (snake_case)
                </label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={editingKind === "frame" ? "frame_sunmori_2026" : "anim_turbo_spark"}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Closed Beta Pioneer / Redline Flame"
                className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground">
                Description
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Source Track
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <option value="purchase">Paid Shop</option>
                  <option value="beta_reward">Closed Beta Free</option>
                  <option value="milestone">Milestone Free</option>
                  <option value="event">Event Exclusive</option>
                  <option value="subscription">Subscription Tier</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Unlock Condition
                </label>
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <option value="none">None (Shop / Manual)</option>
                  <option value="achievement">Achievement Milestone</option>
                  <option value="badge">Badge Unlocked</option>
                  <option value="event_completed">Event Completed</option>
                  <option value="beta_tester">Closed Beta Tester</option>
                  <option value="subscription_tier">Subscription Tier</option>
                </select>
              </div>
            </div>

            {conditionType !== "none" && (
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Condition Target Code (e.g. odometer, special_century, event slug)
                </label>
                <input
                  value={conditionTargetCode}
                  onChange={(e) => setConditionTargetCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Indonesia Price (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={priceIdr}
                  onChange={(e) => setPriceIdr(e.target.value)}
                  placeholder="24900"
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Global Master (USD Cents)
                </label>
                <input
                  type="number"
                  min={0}
                  value={priceUsdCents}
                  onChange={(e) => setPriceUsdCents(e.target.value)}
                  placeholder="199"
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-muted-foreground">
                  Lottie JSON (Max 200 KB)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Upload className="size-3.5" />
                  Upload .json
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => void handleLottieFileUpload(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <textarea
                rows={4}
                value={lottieRaw}
                onChange={(e) => handleLottieTextChange(e.target.value)}
                placeholder='{"v":"5.7.4","fr":30,"ip":0,"op":90,"w":200,"h":200,"layers":[...]}'
                className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs"
              />
              {lottiePreview && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="size-16 shrink-0">
                    <Lottie src={lottiePreview} loop autoplay className="size-16" />
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    Valid Lottie vector preview ready!
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-bold uppercase text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {saving ? "Saving to Database..." : "Save to Database (Live)"}
            </button>
          </form>
        </div>
      ) : (
        /* DB Subscription Pricing Editor */
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {rules.map((r) => (
              <div key={r.region_code} className="rounded-xl border border-border/80 bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold">{r.label}</span>
                  <code className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                    {r.region_code} · {r.currency_code}
                  </code>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  FX Rate: {r.usd_to_local_rate} · Discount Factor: {r.discount_factor}x
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/80 bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-secondary/40 font-mono text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Plan Key</th>
                  <th className="px-4 py-3">Tier / Period</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Global Master (USD Cents)</th>
                  <th className="px-4 py-3">Indonesia Override (IDR)</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {plans.map((p) => {
                  const d = planDrafts[p.plan_key] ?? {
                    usd: String(p.base_price_usd_cents),
                    idr: p.idr_override_amount != null ? String(p.idr_override_amount) : "",
                    label: p.label,
                  };
                  return (
                    <tr key={p.plan_key}>
                      <td className="px-4 py-3 font-mono text-xs">{p.plan_key}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold">{p.brand_name}</span>
                        <div className="text-muted-foreground">
                          {p.tier_code} · {p.billing_period} ({p.duration_hours}h)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={d.label}
                          onChange={(e) =>
                            setPlanDrafts((prev) => ({
                              ...prev,
                              [p.plan_key]: { ...d, label: e.target.value },
                            }))
                          }
                          className="w-48 rounded border border-border bg-secondary/40 px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={d.usd}
                          onChange={(e) =>
                            setPlanDrafts((prev) => ({
                              ...prev,
                              [p.plan_key]: { ...d, usd: e.target.value },
                            }))
                          }
                          className="w-28 rounded border border-border bg-secondary/40 px-2 py-1 font-mono text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={d.idr}
                          onChange={(e) =>
                            setPlanDrafts((prev) => ({
                              ...prev,
                              [p.plan_key]: { ...d, idr: e.target.value },
                            }))
                          }
                          className="w-32 rounded border border-border bg-secondary/40 px-2 py-1 font-mono text-xs"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleSavePlanPrice(p.plan_key)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          <Save className="size-3.5" />
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="size-4 text-primary" />
            All subscription, weekday/weekend pass, and Club Boost prices are fetched exclusively
            from PostgreSQL at runtime.
          </p>
        </div>
      )}
    </div>
  );
}
