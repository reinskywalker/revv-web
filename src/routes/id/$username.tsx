import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Check,
  Edit3,
  Gauge,
  Globe,
  Heart,
  Hourglass,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  UserX,
  Wrench,
} from "lucide-react";
import {
  cancelFriendRequest,
  checkUsernameAvailability,
  fetchMyProfile,
  fetchPublicProfile,
  resolveMediaUrl,
  sendFriendRequest,
  unfriendRider,
  updateMyProfile,
  uploadProfileAvatar,
  uploadProfileBanner,
  type PublicProfileResponse,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/id/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"garage" | "posts">("garage");

  // Edit profile state (for self)
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVisibility, setEditVisibility] = useState("PUBLIC");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const isSelf =
    username === "me" ||
    (!!user?.username && user.username.toLowerCase() === username.toLowerCase()) ||
    (!!user?.id && user.id === username);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicProfile(username);
      setProfile(data);
      if (isSelf) {
        setEditUsername(data.username || "");
        setEditFirstName(data.first_name || "");
        setEditMiddleName(data.middle_name || "");
        setEditLastName(data.last_name || "");
        setEditCity(data.city || "");
        setEditJob(data.job || "");
        setEditBio(data.bio || "");
        setEditVisibility(data.account_visibility || "PUBLIC");
      }
    } catch (err: any) {
      if (isSelf) {
        try {
          const myProf = await fetchMyProfile();
          setProfile({
            id: myProf.id,
            username: myProf.username || "rider",
            noreg: myProf.noreg || null,
            first_name: myProf.first_name || null,
            middle_name: myProf.middle_name || null,
            last_name: myProf.last_name || null,
            avatar_url: myProf.avatar_url || null,
            banner_url: myProf.banner_url || null,
            bio: myProf.bio || null,
            city: myProf.city || null,
            job: myProf.job || null,
            account_visibility: (myProf.account_visibility as "PUBLIC" | "PRIVATE") || "PUBLIC",
            is_friend: true,
            has_pending_request: false,
            is_private: false,
            motorcycle_count: null,
            garage: null,
            posts: null,
          });
          setEditUsername(myProf.username || "");
          setEditFirstName(myProf.first_name || "");
          setEditMiddleName(myProf.middle_name || "");
          setEditLastName(myProf.last_name || "");
          setEditCity(myProf.city || "");
          setEditJob(myProf.job || "");
          setEditBio(myProf.bio || "");
          setEditVisibility(myProf.account_visibility || "PUBLIC");
          return;
        } catch {
          // ignore
        }
      }
      setError(err?.message || "Failed to load rider profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [username]);

  // Debounced username validation when editing
  useEffect(() => {
    if (!isEditing || !profile) return;
    const trimmed = editUsername.trim();
    const initialUname = (profile.username || "").trim();
    if (trimmed.toLowerCase() === initialUname.toLowerCase()) {
      setUsernameError(null);
      setCheckingUsername(false);
      return;
    }
    if (!/^[a-zA-Z0-9._]{3,20}$/.test(trimmed)) {
      setUsernameError("3-20 chars: letters, numbers, dot, underscore");
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      const check = await checkUsernameAvailability(trimmed);
      setCheckingUsername(false);
      if (!check.available) {
        setUsernameError(check.message || "Username is already taken");
      } else {
        setUsernameError(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [editUsername, isEditing, profile]);

  const isDirty = Boolean(
    profile &&
      (editUsername.trim() !== (profile.username || "").trim() ||
        editFirstName.trim() !== (profile.first_name || "").trim() ||
        editMiddleName.trim() !== (profile.middle_name || "").trim() ||
        editLastName.trim() !== (profile.last_name || "").trim() ||
        editCity.trim() !== (profile.city || "").trim() ||
        editJob.trim() !== (profile.job || "").trim() ||
        editBio.trim() !== (profile.bio || "").trim() ||
        editVisibility !== (profile.account_visibility || "PUBLIC")),
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || usernameError || checkingUsername) return;
    setIsSaving(true);
    setActionNotice(null);
    try {
      const payload: Record<string, string | undefined> = {
        first_name: editFirstName.trim(),
        middle_name: editMiddleName.trim(),
        last_name: editLastName.trim(),
        city: editCity.trim(),
        job: editJob.trim(),
        bio: editBio.trim(),
        account_visibility: editVisibility,
      };
      if (profile && editUsername.trim() !== (profile.username || "").trim()) {
        payload.username = editUsername.trim();
      }
      await updateMyProfile(payload);
      setIsEditing(false);
      setActionNotice("Profile updated successfully");
      await refreshUser();
      await loadData();
    } catch (err: any) {
      setActionNotice(err?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingBanner(true);
    setActionNotice(null);
    try {
      await uploadProfileBanner(file);
      setActionNotice("Profile banner updated & synced!");
      await refreshUser();
      await loadData();
    } catch (err: any) {
      setActionNotice(err?.message || "Could not upload banner image");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    setActionNotice(null);
    try {
      await uploadProfileAvatar(file);
      setActionNotice("Profile photo updated & synced!");
      await refreshUser();
      await loadData();
    } catch (err: any) {
      setActionNotice(err?.message || "Could not upload profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddFriend = async () => {
    if (!profile) return;
    try {
      await sendFriendRequest(profile.id);
      setActionNotice("Friend request sent!");
      await loadData();
    } catch (err: any) {
      setActionNotice(err?.message || "Could not send friend request");
    }
  };

  const handleCancelRequest = async () => {
    if (!profile) return;
    try {
      await cancelFriendRequest(profile.id);
      setActionNotice("Friend request cancelled");
      await loadData();
    } catch (err: any) {
      setActionNotice(err?.message || "Could not cancel request");
    }
  };

  const handleUnfriend = async () => {
    if (!profile) return;
    if (!window.confirm(`Unfriend @${profile.username}?`)) return;
    try {
      await unfriendRider(profile.id);
      setActionNotice("Unfriended successfully");
      await loadData();
    } catch (err: any) {
      setActionNotice(err?.message || "Could not unfriend");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Loading Rider Profile @{username}...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center space-y-4">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/30">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="font-display text-2xl font-black uppercase text-foreground">
          Rider Profile Not Found
        </h2>
        <p className="text-sm text-muted-foreground">{error || "User does not exist on REVV."}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          Back to Home Feed
        </Link>
      </div>
    );
  }

  const displayName =
    [profile.first_name, profile.middle_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || profile.username;
  const resolvedBannerUrl = resolveMediaUrl(profile.banner_url);
  const resolvedAvatarUrl = resolveMediaUrl(profile.avatar_url);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8 space-y-8 animate-fade-in">
      {isSelf && (
        <>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleBannerFileChange}
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
        </>
      )}

      {/* Action Notification Alert */}
      {actionNotice && (
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs text-primary">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="hover:underline uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Banner */}
        <div className="h-44 sm:h-52 w-full bg-gradient-to-r from-neutral-950 via-secondary/40 to-neutral-900 border-b border-border/80 relative overflow-hidden">
          {resolvedBannerUrl ? (
            <>
              <img
                src={resolvedBannerUrl}
                alt={`${displayName} cover banner`}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(#2D3843_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
          )}

          {isSelf && (
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black/80 transition disabled:opacity-50"
            >
              {uploadingBanner ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ImagePlus className="size-3 text-primary" />
              )}
              {uploadingBanner ? "Uploading..." : "Change Banner"}
            </button>
          )}

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm",
                profile.account_visibility === "PUBLIC"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-400",
              )}
            >
              {profile.account_visibility === "PUBLIC" ? (
                <>
                  <Globe className="size-3" /> Public Profile
                </>
              ) : (
                <>
                  <Lock className="size-3" /> Private Profile
                </>
              )}
            </span>
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar & Identifiers */}
            <div className="flex items-end gap-4">
              <div
                onClick={isSelf ? () => avatarInputRef.current?.click() : undefined}
                className={cn(
                  "group relative size-24 sm:size-32 rounded-2xl border-4 border-card bg-secondary/80 shadow-2xl flex items-center justify-center overflow-hidden font-display text-4xl font-black text-primary",
                  isSelf && "cursor-pointer",
                )}
              >
                {resolvedAvatarUrl ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt={displayName}
                    className="size-full object-cover"
                  />
                ) : (
                  profile.username.charAt(0).toUpperCase()
                )}
                {isSelf && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    {uploadingAvatar ? (
                      <Loader2 className="size-6 animate-spin text-white" />
                    ) : (
                      <Camera className="size-6 text-white" />
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground">
                    {displayName}
                  </h1>
                  {/* Temporarily hidden noreg badge
                  {profile.noreg && (
                    <span className="rounded bg-secondary/80 px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground border border-border">
                      #{profile.noreg}
                    </span>
                  )}
                  */}
                </div>
                <p className="font-mono text-sm text-primary font-bold">
                  @{profile.username}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {isSelf ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition"
                >
                  <Edit3 className="size-3.5" />
                  {isEditing ? "Close Editor" : "Edit Profile"}
                </button>
              ) : profile.is_friend ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <Check className="size-4" /> Connected Friend
                  </span>
                  <button
                    type="button"
                    onClick={handleUnfriend}
                    className="rounded-lg border border-border/80 bg-secondary/30 p-2 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition"
                    title="Unfriend"
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              ) : profile.has_pending_request ? (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 transition"
                >
                  <Hourglass className="size-3.5" /> Cancel Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddFriend}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                >
                  <UserPlus className="size-4" /> Add Friend
                </button>
              )}
            </div>
          </div>

          {/* Bio & Details */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
            {profile.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                {profile.city}
              </span>
            )}
            {profile.job && (
              <span className="flex items-center gap-1.5">
                <Wrench className="size-3.5 text-primary" />
                {profile.job}
              </span>
            )}
            {profile.motorcycle_count !== null && (
              <span className="flex items-center gap-1.5">
                <Gauge className="size-3.5 text-primary" />
                {profile.motorcycle_count} Motorcycle{profile.motorcycle_count === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/90 font-sans italic border-l-2 border-primary/60 pl-3">
              "{profile.bio}"
            </p>
          )}
        </div>

        {/* Self Profile Edit Form Panel */}
        {isSelf && isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="border-t border-border bg-secondary/20 p-6 space-y-4"
          >
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              Edit Rider Profile Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-mono text-muted-foreground uppercase">
                  Username (@handle)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="rider_handle"
                    className={cn(
                      "w-full rounded-lg border bg-secondary/50 px-3 py-2 text-foreground focus:outline-none",
                      usernameError
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-primary",
                    )}
                  />
                  {checkingUsername && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground absolute right-3 top-2.5" />
                  )}
                </div>
                {usernameError && (
                  <p className="font-mono text-[11px] text-destructive">{usernameError}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase">First Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase">Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase">City</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase">Occupation / Job</label>
                <input
                  type="text"
                  value={editJob}
                  onChange={(e) => setEditJob(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="font-mono text-muted-foreground uppercase">Bio</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="font-mono text-muted-foreground uppercase">Account Visibility</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-sans">
                    <input
                      type="radio"
                      name="visibility"
                      value="PUBLIC"
                      checked={editVisibility === "PUBLIC"}
                      onChange={() => setEditVisibility("PUBLIC")}
                      className="text-primary"
                    />
                    <span>Public (anyone can view garage & posts)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-sans">
                    <input
                      type="radio"
                      name="visibility"
                      value="PRIVATE"
                      checked={editVisibility === "PRIVATE"}
                      onChange={() => setEditVisibility("PRIVATE")}
                      className="text-primary"
                    />
                    <span>Private (only accepted friends can view garage & posts)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-border px-4 py-2 font-mono text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !isDirty || !!usernameError || checkingUsername}
                className="rounded-lg bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Private Account Warning (Mobile Permission Rule) */}
      {profile.is_private ? (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-12 text-center space-y-4">
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="size-7" />
          </div>
          <h3 className="font-display text-xl font-bold uppercase tracking-wide">
            This Account is Private
          </h3>
          <p className="max-w-md mx-auto text-sm text-muted-foreground">
            Add <span className="text-foreground font-semibold">@{profile.username}</span> as a friend to inspect their Digital Garage motorcycles and ride posts.
          </p>
        </div>
      ) : (
        /* Tabs: Garage & Activity Posts */
        <div className="space-y-6">
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("garage")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider transition-colors",
                activeTab === "garage"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Wrench className="size-4" />
              Digital Garage ({profile.garage?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider transition-colors",
                activeTab === "posts"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="size-4" />
              Ride Posts ({profile.posts?.length || 0})
            </button>
          </div>

          {activeTab === "garage" && (
            <div className="space-y-4">
              {!profile.garage || profile.garage.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No motorcycles added to garage yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.garage.map((bike) => (
                    <div
                      key={bike.id}
                      className="rounded-xl border border-border bg-card p-5 space-y-4 relative overflow-hidden"
                    >
                      {bike.is_primary && (
                        <div className="absolute top-3 right-3 rounded bg-primary/20 border border-primary/40 px-2 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                          Primary Ride
                        </div>
                      )}
                      <div>
                        <div className="font-mono text-xs uppercase text-muted-foreground">
                          {bike.brand_name}
                        </div>
                        <h4 className="font-display text-xl font-bold text-foreground">
                          {bike.series_name}
                        </h4>
                        {bike.nickname && (
                          <p className="font-sans text-xs italic text-primary">
                            "{bike.nickname}"
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-border/60 pt-3 text-muted-foreground">
                        <div>
                          <span className="block text-[10px] uppercase">Capacity</span>
                          <span className="text-foreground font-bold">
                            {bike.engine_capacity_cc ? `${bike.engine_capacity_cc} cc` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase">Mileage</span>
                          <span className="text-foreground font-bold">
                            {bike.current_mileage?.toLocaleString() || 0} km
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase">Transmission</span>
                          <span className="text-foreground capitalize">
                            {bike.transmission || "Manual"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase">Category</span>
                          <span className="text-foreground capitalize">
                            {bike.category || "Sport"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "posts" && (
            <div className="space-y-4">
              {!profile.posts || profile.posts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No ride activity posts shared yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.posts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                        {post.bike_label && (
                          <span className="rounded bg-secondary/80 px-2 py-0.5 font-mono text-[10px] text-primary border border-border">
                            {post.bike_label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed font-sans">
                        {post.caption}
                      </p>
                      <div className="flex items-center gap-4 pt-1 font-mono text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3.5 text-rose-500 fill-rose-500/20" />
                          {post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3.5" />
                          {post.comment_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
