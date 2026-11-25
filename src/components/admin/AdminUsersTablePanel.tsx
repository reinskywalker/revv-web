import { useMemo, useState } from "react";
import { Check, Copy, Loader2, Pencil, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { ModalShell } from "@/components/revv/ModalShell";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import {
  type AdminCosmeticsResponse,
  type AdminUserCosmeticsResponse,
  fetchAdminCosmetics,
  fetchAdminUserCosmetics,
  grantAdminUserCosmetic,
  revokeAdminUserCosmetic,
} from "@/lib/api-cosmetics-admin";
import { updateAdminUser, type AdminUserItem } from "@/lib/api";
import { invalidateCosmeticsCatalogCache } from "@/lib/cosmetics-cache";
import { cn } from "@/lib/utils";

type ModalTab = "profile" | "cosmetics" | "activity";

export function AdminUsersTablePanel({
  users,
  currentUserId,
  currentUserEmail,
  onReload,
  onNotice,
  onRequestSoftDelete,
}: {
  users: AdminUserItem[];
  currentUserId?: string | undefined;
  currentUserEmail?: string | null | undefined;
  onReload: () => Promise<void>;
  onNotice: (msg: string | null) => void;
  onRequestSoftDelete: (u: AdminUserItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("profile");

  // Tab 1: Profile & Role fields
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Tab 2 & 3: Cosmetics inspection + Activity telemetry
  const [userCosmetics, setUserCosmetics] = useState<AdminUserCosmeticsResponse | null>(null);
  const [catalogCosmetics, setCatalogCosmetics] = useState<AdminCosmeticsResponse | null>(null);
  const [loadingCosmetics, setLoadingCosmetics] = useState(false);
  const [cosmeticBusy, setCosmeticBusy] = useState<string | null>(null);
  const [autoEquipOnGrant, setAutoEquipOnGrant] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const loadInspectionData = async (userId: string) => {
    setLoadingCosmetics(true);
    try {
      const [uRes, cRes] = await Promise.all([
        fetchAdminUserCosmetics(userId),
        catalogCosmetics ? Promise.resolve(catalogCosmetics) : fetchAdminCosmetics(),
      ]);
      setUserCosmetics(uRes);
      setCatalogCosmetics(cRes);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to inspect rider cosmetics.");
    } finally {
      setLoadingCosmetics(false);
    }
  };

  const openEditModal = (u: AdminUserItem) => {
    setEditingUser(u);
    setModalTab("profile");
    setUsername(u.username || "");
    setFirstName(u.first_name || "");
    setMiddleName(u.middle_name || "");
    setLastName(u.last_name || "");
    setEmail(u.email || "");
    setPhone(u.phone || "");
    setCity(u.city || "");
    setCountry(u.country || "");
    setBio(u.bio || "");
    setRole(u.role.toLowerCase());
    setStatus(u.status);
    setModalError(null);
    setUserCosmetics(null);
    setCopiedId(false);
    void loadInspectionData(u.id);
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role.toLowerCase() !== roleFilter) return false;
      if (!q) return true;
      const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
      return (
        fullName.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.noreg || "").toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const isEditingSelf = Boolean(
    editingUser &&
    (editingUser.id === currentUserId ||
      (Boolean(currentUserEmail) &&
        editingUser.email?.toLowerCase() === currentUserEmail?.toLowerCase())),
  );

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);

    const cleanUsername = username.trim().replace(/^@+/, "");
    if (cleanUsername) {
      const duplicate = users.find(
        (other) =>
          other.id !== editingUser.id &&
          (other.username || "").trim().toLowerCase() === cleanUsername.toLowerCase(),
      );
      if (duplicate) {
        setModalError(`Username '@${cleanUsername}' is already used by another rider.`);
        return;
      }
    }

    setSaving(true);
    try {
      await updateAdminUser(editingUser.id, {
        ...(cleanUsername ? { username: cleanUsername } : {}),
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        city: city.trim(),
        country: country.trim(),
        bio: bio.trim(),
        ...(isEditingSelf ? {} : { role, status }),
      });
      await onReload();
      onNotice(`Saved rider profile & permissions for @${cleanUsername || editingUser.username}`);
      setEditingUser(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const handleGrantCosmetic = async (itemType: "early_user" | "frame" | "badge", code?: string) => {
    if (!editingUser) return;
    const key = `grant_${itemType}_${code ?? "early"}`;
    setCosmeticBusy(key);
    setModalError(null);
    try {
      const res = await grantAdminUserCosmetic(editingUser.id, {
        item_type: itemType,
        ...(code ? { code } : {}),
        auto_equip: itemType !== "badge" ? autoEquipOnGrant : undefined,
      });
      invalidateCosmeticsCatalogCache();
      await loadInspectionData(editingUser.id);
      if (itemType === "early_user") {
        onNotice(
          `Granted Early User (Closed Beta Pioneer + Founding Throttle) to @${editingUser.username}.`,
        );
      } else {
        onNotice(
          `Granted ${itemType} '${code}'${res.bundled_badge_code ? ` (+ bundled badge ${res.bundled_badge_code})` : ""} to @${editingUser.username}.`,
        );
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to grant cosmetic.");
    } finally {
      setCosmeticBusy(null);
    }
  };

  const handleRevokeCosmetic = async (
    itemType: "early_user" | "frame" | "badge",
    code?: string,
  ) => {
    if (!editingUser) return;
    const key = `revoke_${itemType}_${code ?? "early"}`;
    setCosmeticBusy(key);
    setModalError(null);
    try {
      await revokeAdminUserCosmetic(editingUser.id, {
        item_type: itemType,
        ...(code ? { code } : {}),
      });
      invalidateCosmeticsCatalogCache();
      await loadInspectionData(editingUser.id);
      onNotice(
        itemType === "early_user"
          ? `Revoked Early User status from @${editingUser.username}.`
          : `Revoked ${itemType} '${code}' from @${editingUser.username}.`,
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to revoke cosmetic.");
    } finally {
      setCosmeticBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="hud-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight">
            Riders &amp; Permissions ({filteredUsers.length} / {users.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Select a rider to manage profile details, Early User &amp; cosmetic grants, or activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, @handle, email…"
              className="rounded-xl border border-border bg-secondary/40 py-1.5 pl-8 pr-3 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-semibold uppercase"
          >
            <option value="all">All Roles</option>
            <option value="administrator">Administrator</option>
            <option value="moderator">Moderator</option>
            <option value="paid_user">Paid User</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      <div className="hud-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/70 bg-secondary/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Rider</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredUsers.map((u) => {
              const isSelf =
                u.id === currentUserId ||
                (Boolean(currentUserEmail) &&
                  u.email?.toLowerCase() === currentUserEmail?.toLowerCase());
              const fullName =
                [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ") ||
                u.name ||
                u.username ||
                "REVV Rider";

              return (
                <tr
                  key={u.id}
                  onClick={() => openEditModal(u)}
                  className="cursor-pointer transition-colors hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <RevvAvatar src={u.avatar_url} name={fullName} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 font-bold text-foreground truncate max-w-[180px]">
                          <span className="truncate">{fullName}</span>
                          {isSelf && <ShieldCheck className="size-3.5 shrink-0 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          @{u.username || "rider"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="max-w-[180px] truncate text-foreground">{u.email || "—"}</div>
                    <div className="text-muted-foreground">{u.phone || "—"}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-lg border border-border bg-secondary/70 px-2 py-0.5 text-[11px] font-bold uppercase text-foreground">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                        u.status === "Active"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        <Pencil className="size-3" />
                        Manage
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => onRequestSoftDelete(u)}
                          className="rounded-lg border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                          title="Soft delete user"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3-Tab User Detail & Grant Modal */}
      {editingUser && (
        <ModalShell
          open
          onClose={() => {
            if (!saving && !cosmeticBusy) setEditingUser(null);
          }}
          closeOnBackdrop={!saving && !cosmeticBusy}
          title={
            <h4 className="font-display text-lg font-bold">
              Manage @{editingUser.username || editingUser.name || "Rider"}
            </h4>
          }
          subtitle="Profile permissions, Early User & cosmetic grants, and session diagnostics"
          maxWidthClass="max-w-3xl"
          panelClassName="p-0 overflow-hidden max-h-[92vh] flex flex-col [&>div:first-child]:px-6 [&>div:first-child]:pt-4 [&>div:first-child]:mb-0 [&>div:first-child]:border-b [&>div:first-child]:border-border [&>div:first-child]:pb-3"
        >
          {/* Modal Tab Strip */}
          <div className="flex gap-1 border-b border-border bg-secondary/35 px-6 pt-2">
            {(
              [
                { id: "profile", label: "Profile & Role" },
                { id: "cosmetics", label: "Early User & Cosmetics" },
                { id: "activity", label: "Account & Activity" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalTab(tab.id)}
                className={cn(
                  "border-b-2 px-3.5 py-2 text-xs font-bold transition",
                  modalTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto p-6 space-y-4">
            {modalError && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/15 px-3 py-2 text-xs text-destructive">
                {modalError}
              </div>
            )}

            {modalTab === "profile" && (
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Role</label>
                    <select
                      value={role}
                      disabled={isEditingSelf}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs font-semibold uppercase disabled:opacity-55"
                    >
                      <option value="user">user</option>
                      <option value="paid_user">paid_user</option>
                      <option value="moderator">moderator</option>
                      <option value="administrator">administrator</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground/85">Status</label>
                    <select
                      value={status}
                      disabled={isEditingSelf}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs font-semibold uppercase disabled:opacity-55"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Deleted">Deleted</option>
                    </select>
                  </div>
                </div>

                {isEditingSelf && (
                  <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    Self-protection: your own administrator role and status cannot be downgraded
                    here.
                  </p>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/85">Rider Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditingUser(null)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs"
                  >
                    {saving && <Loader2 className="size-3.5 animate-spin" />}
                    Save Rider Changes
                  </button>
                </div>
              </form>
            )}

            {modalTab === "cosmetics" && (
              <div className="space-y-5">
                {loadingCosmetics ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Early User / Closed Beta Pioneer Grant Card */}
                    <div className="rounded-2xl border border-primary/35 bg-primary/5 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <RevvAvatar
                            src={editingUser.avatar_url}
                            name={editingUser.username || "Rider"}
                            frameCode="beta_pioneer"
                            size={44}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-sm font-bold text-foreground">
                                Early User · Closed Beta Pioneer
                              </span>
                              {userCosmetics?.is_early_user ? (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                  Granted
                                </span>
                              ) : (
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                                  Not Granted
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Grants the permanent <strong>Closed Beta Pioneer</strong> frame +{" "}
                              <strong>Founding Throttle</strong> special achievement.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {userCosmetics?.is_early_user ? (
                            <button
                              type="button"
                              disabled={Boolean(cosmeticBusy)}
                              onClick={() => void handleRevokeCosmetic("early_user")}
                              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                            >
                              Revoke Early User
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(cosmeticBusy)}
                              onClick={() => void handleGrantCosmetic("early_user")}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              <Sparkles className="size-3.5" />
                              Grant Early User
                            </button>
                          )}
                        </div>
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={autoEquipOnGrant}
                          onChange={(e) => setAutoEquipOnGrant(e.target.checked)}
                          className="accent-primary"
                        />
                        Auto-equip frame on rider profile when granting
                      </label>
                    </div>

                    {/* Catalog Frames */}
                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Avatar Frames
                      </h5>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {(catalogCosmetics?.frames ?? []).map((frame) => {
                          const owned = userCosmetics?.owned_frames.some(
                            (o) => o.frame_code === frame.code,
                          );
                          const equipped = userCosmetics?.equipped_frame_code === frame.code;
                          return (
                            <div
                              key={frame.code}
                              className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-3"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <RevvAvatar name={frame.title} frameCode={frame.code} size={34} />
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-bold text-foreground">
                                    {frame.title}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {equipped ? "Equipped" : owned ? "Owned" : "Locked"}
                                  </div>
                                </div>
                              </div>
                              {owned ? (
                                <button
                                  type="button"
                                  disabled={Boolean(cosmeticBusy)}
                                  onClick={() => void handleRevokeCosmetic("frame", frame.code)}
                                  className="shrink-0 rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={Boolean(cosmeticBusy)}
                                  onClick={() => void handleGrantCosmetic("frame", frame.code)}
                                  className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                                >
                                  Grant
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Catalog Animated Badges */}
                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Animated Badges
                      </h5>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {(catalogCosmetics?.badges ?? []).map((badge) => {
                          const own = userCosmetics?.owned_badges.find(
                            (b) => b.badge_code === badge.code,
                          );
                          return (
                            <div
                              key={badge.code}
                              className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold text-foreground">
                                  {badge.title}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {own?.is_equipped ? "Equipped" : own ? "Owned" : "Locked"}
                                </div>
                              </div>
                              {own ? (
                                <button
                                  type="button"
                                  disabled={Boolean(cosmeticBusy)}
                                  onClick={() => void handleRevokeCosmetic("badge", badge.code)}
                                  className="shrink-0 rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={Boolean(cosmeticBusy)}
                                  onClick={() => void handleGrantCosmetic("badge", badge.code)}
                                  className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                                >
                                  Grant
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {modalTab === "activity" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Rider UUID</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="truncate font-mono text-xs text-foreground">
                      {editingUser.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(editingUser.id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1800);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                    >
                      {copiedId ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copiedId ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {loadingCosmetics ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="text-muted-foreground">NoReg</div>
                      <div className="mt-1 font-mono font-bold text-foreground">
                        {userCosmetics?.activity.noreg || editingUser.noreg || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="text-muted-foreground">Last Login</div>
                      <div className="mt-1 font-semibold text-foreground">
                        {userCosmetics?.activity.last_login_at
                          ? new Date(userCosmetics.activity.last_login_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="text-muted-foreground">Last Active</div>
                      <div className="mt-1 font-semibold text-foreground">
                        {userCosmetics?.activity.last_active_at
                          ? new Date(userCosmetics.activity.last_active_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="text-muted-foreground">Logins / Sessions</div>
                      <div className="mt-1 font-mono font-bold text-foreground">
                        {userCosmetics?.activity.login_count ?? 0} /{" "}
                        {userCosmetics?.activity.session_count ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="text-muted-foreground">Device &amp; OS</div>
                      <div className="mt-1 font-semibold text-foreground truncate">
                        {[
                          userCosmetics?.activity.last_platform?.toUpperCase(),
                          userCosmetics?.activity.last_device_model,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="text-muted-foreground">App Build</div>
                      <div className="mt-1 font-mono font-semibold text-foreground">
                        {userCosmetics?.activity.last_app_version
                          ? `v${userCosmetics.activity.last_app_version}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
