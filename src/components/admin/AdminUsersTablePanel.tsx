import { useMemo, useState } from "react";
import { Loader2, Pencil, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { resolveMediaUrl, updateAdminUser, type AdminUserItem } from "@/lib/api";
import { cn } from "@/lib/utils";

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

  // Edit modal fields
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

  const openEditModal = (u: AdminUserItem) => {
    setEditingUser(u);
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
        role,
        status,
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

  return (
    <div className="space-y-4">
      <div className="hud-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-black uppercase tracking-tight">
            Users &amp; RBAC Directory ({filteredUsers.length} / {users.length})
          </h3>
          <p className="font-mono text-[11px] text-muted-foreground">
            Click any rider row to view full details, edit profile, check username uniqueness, or
            update RBAC role.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, @handle, email…"
              className="rounded-lg border border-border bg-secondary/40 pl-8 pr-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-xs uppercase"
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
          <thead className="border-b border-border/70 bg-secondary/20 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-3 px-4">Rider</th>
              <th className="py-3 px-3">Username / NoReg</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Joined</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
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
              const av = resolveMediaUrl(u.avatar_url);

              return (
                <tr
                  key={u.id}
                  onClick={() => openEditModal(u)}
                  className="cursor-pointer transition-colors hover:bg-secondary/25"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-mono text-xs font-bold text-primary overflow-hidden">
                        {av ? (
                          <img
                            src={av}
                            alt={fullName}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          (u.username || fullName).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate max-w-[160px] flex items-center gap-1">
                          <span>{fullName}</span>
                          {isSelf && <ShieldCheck className="size-3.5 text-primary shrink-0" />}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[160px]">
                          {u.id.slice(0, 8)}…
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <div className="font-semibold text-foreground">
                      @{u.username || "—"}
                    </div>
                    {u.noreg && (
                      <div className="text-[10px] text-primary">{u.noreg}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="truncate max-w-[180px]">{u.email || "—"}</div>
                    <div className="text-muted-foreground">{u.phone || "—"}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                    {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                        u.status === "Active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-destructive/20 text-destructive",
                      )}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => onRequestSoftDelete(u)}
                          className="rounded border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
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

      {/* User Detail & Edit Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !saving && setEditingUser(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
              <div>
                <h4 className="font-display text-lg font-black uppercase">
                  Edit Rider Profile &amp; RBAC
                </h4>
                <p className="font-mono text-[11px] text-muted-foreground">
                  ID: {editingUser.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/15 px-3 py-2 font-mono text-xs text-destructive">
                  {modalError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Username (Unique)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                    placeholder="username"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs uppercase"
                  >
                    <option value="user">user</option>
                    <option value="paid_user">paid_user</option>
                    <option value="moderator">moderator</option>
                    <option value="administrator">administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 font-mono text-xs uppercase"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Deleted">Deleted</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[11px] uppercase text-muted-foreground">
                  Rider Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-border px-4 py-2 font-mono text-xs uppercase text-muted-foreground hover:text-foreground"
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
          </div>
        </div>
      )}
    </div>
  );
}
