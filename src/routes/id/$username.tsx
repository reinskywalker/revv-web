import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
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
  Navigation,
  Route as RouteIcon,
  ShieldAlert,
  Trash2,
  Trophy,
  UserPlus,
  UserX,
  Wrench,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/revv/ConfirmDialog";
import { RevvAvatar, RevvCosmeticBadge, VerifiedCheckBadge } from "@/components/revv/RevvAvatar";
import {
  ProfileEditorForm,
  type AccountVisibility,
  type SavedRoutesVisibility,
} from "@/components/profile/ProfileEditorForm";
import { ProfileSavedRoutesTab } from "@/components/profile/ProfileSavedRoutesTab";
import { ProfileTripsTab } from "@/components/profile/ProfileTripsTab";
import { RiderOverviewPanel } from "@/components/profile/RiderOverviewPanel";
import {
  cancelFriendRequest,
  checkUsernameAvailability,
  deleteProfileAvatar,
  deleteProfileBanner,
  fetchMyProfile,
  fetchPublicProfile,
  fetchPublicUserAchievements,
  resolveMediaUrl,
  sendFriendRequest,
  unfriendRider,
  updateMyProfile,
  uploadProfileAvatar,
  uploadProfileBanner,
  type PublicProfileResponse,
  type UserAchievementsPayload,
} from "@/lib/api";
import {
  invalidateCosmeticsCatalogCache,
  fetchCosmeticsCatalogCached,
} from "@/lib/cosmetics-cache";
import { compressImageToTarget } from "@/lib/image-compress";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/id/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [achievements, setAchievements] = useState<UserAchievementsPayload | null>(null);
  const [achievementsError, setAchievementsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "garage" | "achievements" | "posts" | "routes" | "trips"
  >("garage");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "unfriend" | "delete_avatar" | "delete_banner" | null
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Edit profile state (for self)
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVisibility, setEditVisibility] = useState<AccountVisibility>("PUBLIC");
  const [editShowMotorcycleCount, setEditShowMotorcycleCount] = useState(true);
  const [editShowGarageDetails, setEditShowGarageDetails] = useState(true);
  const [editShowCity, setEditShowCity] = useState(true);
  const [editShowCountry, setEditShowCountry] = useState(true);
  const [editShowJob, setEditShowJob] = useState(true);
  const [editPrivacySavedRoutes, setEditPrivacySavedRoutes] =
    useState<SavedRoutesVisibility>("public");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const isSelf =
    username === "me" ||
    (!!user?.username && user.username.toLowerCase() === username.toLowerCase()) ||
    (!!user?.id && user.id === username);

  const syncEditFields = (data: {
    username?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    city?: string | null;
    country?: string | null;
    job?: string | null;
    bio?: string | null;
    account_visibility?: string | null;
    show_motorcycle_count?: boolean | null;
    show_garage_details?: boolean | null;
    show_city?: boolean | null;
    show_country?: boolean | null;
    show_job?: boolean | null;
    privacy_saved_routes?: string | null;
  }) => {
    setEditUsername(data.username || "");
    setEditFirstName(data.first_name || "");
    setEditMiddleName(data.middle_name || "");
    setEditLastName(data.last_name || "");
    setEditCity(data.city || "");
    setEditCountry(data.country || "");
    setEditJob(data.job || "");
    setEditBio(data.bio || "");
    const vis = (data.account_visibility || "PUBLIC").toUpperCase();
    setEditVisibility(
      vis === "PRIVATE" || vis === "CUSTOM" || vis === "FRIENDS_ONLY" ? vis : "PUBLIC",
    );
    setEditShowMotorcycleCount(data.show_motorcycle_count ?? true);
    setEditShowGarageDetails(data.show_garage_details ?? true);
    setEditShowCity(data.show_city ?? true);
    setEditShowCountry(data.show_country ?? true);
    setEditShowJob(data.show_job ?? true);
    const rVis = (data.privacy_saved_routes || "public").toLowerCase();
    setEditPrivacySavedRoutes(rVis === "friends" || rVis === "private" ? rVis : "public");
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setAchievementsError(null);
    try {
      const data = await fetchPublicProfile(username);
      setProfile(data);
      if (isSelf) {
        syncEditFields(data);
      }
      if (!data.is_private && data.show_achievements !== false) {
        fetchPublicUserAchievements(data.username || data.id)
          .then((ach) => setAchievements(ach))
          .catch((achErr: unknown) => {
            setAchievements(null);
            setAchievementsError(
              achErr instanceof Error ? achErr.message : "Achievements unavailable",
            );
          });
      } else {
        setAchievements(null);
      }
    } catch (err: unknown) {
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
            equipped_frame_code: myProf.equipped_frame_code ?? null,
            equipped_badges: myProf.equipped_badges ?? [],
            is_verified_profile: myProf.is_verified_profile ?? false,
            subscription_tier: myProf.subscription_tier ?? null,
            banner_url: myProf.banner_url || null,
            bio: myProf.bio || null,
            city: myProf.city || null,
            country: myProf.country ?? null,
            job: myProf.job || null,
            account_visibility:
              (myProf.account_visibility as PublicProfileResponse["account_visibility"]) ||
              "PUBLIC",
            show_motorcycle_count: myProf.show_motorcycle_count ?? null,
            show_garage_details: myProf.show_garage_details ?? null,
            show_city: myProf.show_city ?? null,
            show_country: myProf.show_country ?? null,
            show_job: myProf.show_job ?? null,
            show_achievements: myProf.show_achievements ?? null,
            show_riding_stats: myProf.show_riding_stats ?? null,
            privacy_saved_routes: myProf.privacy_saved_routes ?? null,
            is_friend: true,
            has_pending_request: false,
            is_private: false,
            motorcycle_count: null,
            garage: null,
            posts: null,
          });
          syncEditFields(myProf);
          fetchPublicUserAchievements(myProf.username || myProf.id)
            .then((ach) => setAchievements(ach))
            .catch(() => {});
          return;
        } catch {
          // ignore
        }
      }
      setError(err instanceof Error ? err.message : "Failed to load rider profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [username]);

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

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
      editCountry.trim() !== (profile.country || "").trim() ||
      editJob.trim() !== (profile.job || "").trim() ||
      editBio.trim() !== (profile.bio || "").trim() ||
      editVisibility !== (profile.account_visibility || "PUBLIC") ||
      editShowMotorcycleCount !== (profile.show_motorcycle_count ?? true) ||
      editShowGarageDetails !== (profile.show_garage_details ?? true) ||
      editShowCity !== (profile.show_city ?? true) ||
      editShowCountry !== (profile.show_country ?? true) ||
      editShowJob !== (profile.show_job ?? true) ||
      editPrivacySavedRoutes !== (profile.privacy_saved_routes || "public")),
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || usernameError || checkingUsername) return;
    setIsSaving(true);
    setActionNotice(null);
    try {
      const payload: Parameters<typeof updateMyProfile>[0] = {
        first_name: editFirstName.trim(),
        middle_name: editMiddleName.trim(),
        last_name: editLastName.trim(),
        city: editCity.trim(),
        country: editCountry.trim(),
        job: editJob.trim(),
        bio: editBio.trim(),
        account_visibility: editVisibility,
        show_motorcycle_count: editShowMotorcycleCount,
        show_garage_details: editShowGarageDetails,
        show_city: editShowCity,
        show_country: editShowCountry,
        show_job: editShowJob,
        privacy_saved_routes: editPrivacySavedRoutes,
      };
      if (profile && editUsername.trim() !== (profile.username || "").trim()) {
        payload.username = editUsername.trim();
      }
      const prevCountry = (profile?.country || "").trim();
      await updateMyProfile(payload);
      if (editCountry.trim() !== prevCountry) {
        invalidateCosmeticsCatalogCache();
        void fetchCosmeticsCatalogCached(true);
      }
      setIsEditing(false);
      setActionNotice("Profile updated successfully");
      await refreshUser();
      await loadData();
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : "Failed to update profile");
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
      const compressed = await compressImageToTarget(file);
      await uploadProfileBanner(compressed);
      setActionNotice("Profile banner updated & synced!");
      await refreshUser();
      await loadData();
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : "Could not upload banner image");
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
      const compressed = await compressImageToTarget(file);
      await uploadProfileAvatar(compressed);
      setActionNotice("Profile photo updated & synced!");
      await refreshUser();
      await loadData();
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : "Could not upload profile photo");
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
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : "Could not send friend request");
    }
  };

  const handleCancelRequest = async () => {
    if (!profile) return;
    try {
      await cancelFriendRequest(profile.id);
      setActionNotice("Friend request cancelled");
      await loadData();
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : "Could not cancel request");
    }
  };

  const handleUnfriend = () => {
    if (!profile) return;
    setConfirmAction("unfriend");
  };

  const handleConfirmAction = async () => {
    if (!profile || !confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction === "unfriend") {
        await unfriendRider(profile.id);
        setActionNotice("Unfriended successfully");
      } else if (confirmAction === "delete_avatar") {
        await deleteProfileAvatar();
        setActionNotice("Profile photo removed");
        await refreshUser();
      } else if (confirmAction === "delete_banner") {
        await deleteProfileBanner();
        setActionNotice("Profile banner removed");
        await refreshUser();
      }
      setConfirmAction(null);
      await loadData();
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirmBusy(false);
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
    [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    profile.username;
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
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            if (resolvedBannerUrl)
              setPreviewImage({ url: resolvedBannerUrl, title: `${displayName} Cover Banner` });
          }}
          className={cn(
            "h-44 sm:h-52 w-full bg-gradient-to-r from-neutral-950 via-secondary/40 to-neutral-900 border-b border-border/80 relative overflow-hidden",
            resolvedBannerUrl && "cursor-pointer",
          )}
        >
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
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <button
                type="button"
                disabled={uploadingBanner}
                onClick={() => bannerInputRef.current?.click()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black/80 transition disabled:opacity-50"
              >
                {uploadingBanner ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <ImagePlus className="size-3 text-primary" />
                )}
                {uploadingBanner ? "Uploading..." : "Change Banner"}
              </button>
              {resolvedBannerUrl && (
                <button
                  type="button"
                  title="Remove Banner"
                  aria-label="Remove banner image"
                  onClick={() => setConfirmAction("delete_banner")}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md text-destructive hover:bg-black/80 transition"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
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
                  <Lock className="size-3" />{" "}
                  {profile.account_visibility === "FRIENDS_ONLY"
                    ? "Friends Only"
                    : profile.account_visibility === "CUSTOM"
                      ? "Custom Privacy"
                      : "Private Profile"}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="relative z-10 px-5 pb-6 pt-0 sm:px-6">
          {/* Avatar overlapping banner bottom cleanly */}
          <div className="-mt-14 mb-4 flex items-end justify-between gap-4 sm:-mt-16">
            <div
              onClick={() => {
                if (resolvedAvatarUrl) {
                  setPreviewImage({
                    url: resolvedAvatarUrl,
                    title: `${displayName} Profile Photo`,
                  });
                } else if (isSelf) {
                  avatarInputRef.current?.click();
                }
              }}
              className="group relative inline-flex shrink-0 cursor-pointer items-center justify-center"
            >
              <RevvAvatar
                src={profile.avatar_url}
                name={displayName}
                frameCode={profile.equipped_frame_code}
                showVerifiedBadge={profile.is_verified_profile}
                size={104}
              />
              {isSelf && (
                <div className="absolute -bottom-1 -right-1 z-30 flex items-center gap-1">
                  {resolvedAvatarUrl && (
                    <button
                      type="button"
                      title="Remove Profile Photo"
                      aria-label="Remove profile photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction("delete_avatar");
                      }}
                      className="rounded-full border border-white/25 bg-black/75 p-1.5 text-destructive transition hover:bg-black"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Change Profile Photo"
                    aria-label="Change profile photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      avatarInputRef.current?.click();
                    }}
                    className="rounded-full border border-white/25 bg-black/75 p-1.5 text-white transition hover:bg-black"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="size-3.5 animate-spin text-white" />
                    ) : (
                      <Camera className="size-3.5 text-white" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Display Name + Tier Pill + Action Buttons safely aligned inside card body */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {displayName}
                </h1>
                {profile.is_verified_profile && <VerifiedCheckBadge size={22} />}
                {profile.subscription_tier &&
                  !["", "rookie", "free"].includes(profile.subscription_tier.toLowerCase()) && (
                    <span className="inline-flex items-center rounded-full border border-sky-500/35 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300">
                      {profile.subscription_tier.replace(/_/g, " ")}
                    </span>
                  )}
              </div>
              <p className="text-sm font-semibold text-primary">@{profile.username}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isSelf ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-secondary"
                >
                  <Edit3 className="size-3.5" />
                  {isEditing ? "Close Editor" : "Edit Profile"}
                </button>
              ) : profile.is_friend ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <Check className="size-4" /> Connected
                  </span>
                  <button
                    type="button"
                    onClick={handleUnfriend}
                    className="rounded-xl border border-border/80 bg-secondary/40 p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                    title="Unfriend"
                  >
                    <UserX className="size-4" />
                  </button>
                </div>
              ) : profile.has_pending_request ? (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 transition hover:bg-amber-500/20"
                >
                  <Hourglass className="size-3.5" /> Cancel Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddFriend}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <UserPlus className="size-4" /> Add Friend
                </button>
              )}
            </div>
          </div>

          {/* Bio & Details */}
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
            {(profile.account_visibility !== "CUSTOM" || profile.show_city !== false) &&
              profile.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  {profile.city}
                </span>
              )}
            {(profile.account_visibility !== "CUSTOM" || profile.show_country !== false) &&
              profile.country && (
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5 text-primary" />
                  {profile.country}
                </span>
              )}
            {(profile.account_visibility !== "CUSTOM" || profile.show_job !== false) &&
              profile.job && (
                <span className="flex items-center gap-1.5">
                  <Wrench className="size-3.5 text-primary" />
                  {profile.job}
                </span>
              )}
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl border-l-2 border-primary/60 pl-3 font-sans text-sm italic leading-relaxed text-foreground/90">
              "{profile.bio}"
            </p>
          )}

          {/* Equipped Animated Cosmetic Badges (Mobile parity) */}
          {profile.equipped_badges && profile.equipped_badges.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {profile.equipped_badges.map((b) => (
                <RevvCosmeticBadge
                  key={b.code}
                  code={b.code}
                  title={b.title}
                  assetHash={b.asset_hash}
                  lottieUrl={b.lottie_url}
                  size={24}
                />
              ))}
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
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
                      "w-full min-h-[44px] rounded-xl border bg-secondary/50 px-3 py-2 text-foreground focus:outline-none",
                      usernameError
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-primary",
                    )}
                  />
                  {checkingUsername && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground absolute right-3 top-3" />
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
                  className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase">Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/50 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <ProfileEditorForm
              displayName={editMiddleName}
              onDisplayNameChange={setEditMiddleName}
              city={editCity}
              onCityChange={setEditCity}
              country={editCountry}
              onCountryChange={setEditCountry}
              job={editJob}
              onJobChange={setEditJob}
              bio={editBio}
              onBioChange={setEditBio}
              visibility={editVisibility}
              onVisibilityChange={setEditVisibility}
              showMotorcycleCount={editShowMotorcycleCount}
              onShowMotorcycleCountChange={setEditShowMotorcycleCount}
              showGarageDetails={editShowGarageDetails}
              onShowGarageDetailsChange={setEditShowGarageDetails}
              showCity={editShowCity}
              onShowCityChange={setEditShowCity}
              showCountry={editShowCountry}
              onShowCountryChange={setEditShowCountry}
              showJob={editShowJob}
              onShowJobChange={setEditShowJob}
              privacySavedRoutes={editPrivacySavedRoutes}
              onPrivacySavedRoutesChange={setEditPrivacySavedRoutes}
              saving={isSaving}
              onCancel={() => setIsEditing(false)}
              onSave={() => {
                void handleSaveProfile({
                  preventDefault: () => {},
                } as React.FormEvent);
              }}
            />
          </form>
        )}
      </div>

      {/* Rider Overview */}
      <RiderOverviewPanel profile={profile} />

      {/* Private Account Warning (Mobile Permission Rule) */}
      {profile.is_private ? (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-12 text-center space-y-4">
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="size-7" />
          </div>
          <h3 className="font-display text-xl font-bold uppercase tracking-wide">
            Garage (Hidden)
          </h3>
          <p className="max-w-md mx-auto text-sm text-muted-foreground">
            Add <span className="text-foreground font-semibold">@{profile.username}</span> as a
            friend to inspect their Digital Garage motorcycles and ride posts.
          </p>
        </div>
      ) : (
        /* Tabs: Garage & Activity Posts */
        <div className="space-y-6">
          <div className="flex overflow-x-auto border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("garage")}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors",
                activeTab === "garage"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Wrench className="size-4" />
              {profile.garage === null
                ? "Garage (Hidden)"
                : `Digital Garage (${profile.garage.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("achievements")}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors",
                activeTab === "achievements"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Trophy className="size-4" />
              Achievements{achievements ? ` (${achievements.summary?.total_achieved ?? 0})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors",
                activeTab === "posts"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="size-4" />
              Posts ({profile.posts?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("routes")}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors",
                activeTab === "routes"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <RouteIcon className="size-4" />
              Saved Routes
            </button>
            {isSelf && (
              <button
                type="button"
                onClick={() => setActiveTab("trips")}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors",
                  activeTab === "trips"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Navigation className="size-4" />
                Trips
              </button>
            )}
          </div>

          {activeTab === "achievements" && (
            <div className="space-y-6">
              {profile.show_achievements === false || achievementsError ? (
                <div className="rounded-xl border border-border/80 bg-card/60 p-10 text-center space-y-2">
                  <Lock className="size-6 mx-auto text-muted-foreground" />
                  <p className="font-display text-sm font-bold text-foreground">
                    Achievements Hidden
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {achievementsError || "This rider prefers to keep their achievements private."}
                  </p>
                </div>
              ) : !achievements ? (
                <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading rider achievements...
                </div>
              ) : (
                (() => {
                  const summary = achievements.summary;
                  const pinnedCodes = summary?.pinned_codes ?? achievements.pinned_codes ?? [];
                  const achievementItems = achievements.achievements ?? achievements.items ?? [];
                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-border bg-card p-4">
                          <div className="text-xs text-muted-foreground">Total XP</div>
                          <div className="mt-1 text-xl font-extrabold text-primary">
                            {(summary?.total_xp ?? 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-4">
                          <div className="text-xs text-muted-foreground">Badges Unlocked</div>
                          <div className="mt-1 text-xl font-extrabold text-foreground">
                            {summary?.badges_unlocked ?? 0} / {summary?.total_badge_tiers ?? 0}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-4">
                          <div className="text-xs text-muted-foreground">Milestones</div>
                          <div className="mt-1 text-xl font-extrabold text-foreground">
                            {summary?.milestones_achieved ?? 0} / {summary?.total_milestones ?? 0}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-4">
                          <div className="text-xs text-muted-foreground">Categories Completed</div>
                          <div className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {summary?.total_achieved ?? 0} / {summary?.total_categories ?? 0}
                          </div>
                        </div>
                      </div>

                      {pinnedCodes.length > 0 && (
                        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Award className="size-4 text-primary" />
                            Pinned Showcase Badges
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {pinnedCodes.map((code) => {
                              const item = achievementItems.find((i) => i.code === code);
                              if (!item) return null;
                              return (
                                <div
                                  key={code}
                                  className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5"
                                >
                                  {item.icon_key ? (
                                    <img
                                      src={`/badges/${item.icon_key}.webp`}
                                      alt={item.title}
                                      className="size-10 shrink-0 rounded-lg object-contain"
                                    />
                                  ) : (
                                    <Trophy className="size-8 shrink-0 text-primary" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-foreground truncate">
                                      {item.title}
                                    </div>
                                    <div className="text-[11px] text-primary font-medium">
                                      Level {item.highest_level} / {item.max_level}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {achievementItems
                          .slice()
                          .sort(
                            (a, b) => (b.highest_level > 0 ? 1 : 0) - (a.highest_level > 0 ? 1 : 0),
                          )
                          .map((item) => {
                            const unlocked = item.highest_level >= 1;
                            const tiers = Array.isArray(item.tiers) ? item.tiers : [];
                            const activeTier =
                              tiers.find((tr) => tr.level === item.highest_level) ?? tiers[0];
                            const currentValue = Number(item.current_value ?? 0);
                            return (
                              <div
                                key={item.code}
                                className={cn(
                                  "flex items-start gap-3.5 rounded-2xl border p-4 transition",
                                  unlocked
                                    ? "border-border bg-card shadow-xs"
                                    : "border-border/60 bg-card/40 opacity-65",
                                )}
                              >
                                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 p-1.5">
                                  {item.has_badge && item.icon_key ? (
                                    <img
                                      src={`/badges/${item.icon_key}.webp`}
                                      alt={item.title}
                                      className={cn(
                                        "size-full object-contain",
                                        !unlocked && "grayscale opacity-60",
                                      )}
                                    />
                                  ) : (
                                    <Trophy
                                      className={cn(
                                        "size-6",
                                        unlocked ? "text-primary" : "text-muted-foreground",
                                      )}
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-bold text-foreground truncate">
                                      {item.title}
                                    </h4>
                                    <span
                                      className={cn(
                                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                        unlocked
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                          : "bg-secondary text-muted-foreground",
                                      )}
                                    >
                                      {unlocked
                                        ? activeTier?.name || `Lv.${item.highest_level}`
                                        : "Locked"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                  <div className="text-[11px] font-medium text-muted-foreground">
                                    {currentValue.toFixed(currentValue % 1 === 0 ? 0 : 1)}
                                    {item.next_threshold ? ` / ${item.next_threshold}` : ""}{" "}
                                    {item.unit_label || ""}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          )}

          {activeTab === "garage" && (
            <div className="space-y-4">
              {profile.garage === null ? (
                <div className="rounded-xl border border-border/80 bg-card/60 p-10 text-center space-y-2">
                  <Lock className="size-6 mx-auto text-muted-foreground" />
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    Garage (Hidden)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This rider hides their motorcycles from public view.
                  </p>
                </div>
              ) : profile.garage.length === 0 ? (
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
                          <p className="font-sans text-xs italic text-primary">"{bike.nickname}"</p>
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
                        {(post.motorcycle_label || post.bike_label) && (
                          <span className="rounded bg-secondary/80 px-2 py-0.5 font-mono text-[10px] text-primary border border-border">
                            {post.motorcycle_label || post.bike_label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed font-sans">
                        {post.caption}
                      </p>
                      {post.image_url && (
                        <img
                          src={resolveMediaUrl(post.image_url) || undefined}
                          alt="Ride post attachment"
                          className="max-h-72 rounded-xl border border-border object-cover"
                        />
                      )}
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

          {activeTab === "routes" && (
            <ProfileSavedRoutesTab
              userId={profile.id}
              isSelf={isSelf}
              isPrivateAccount={profile.is_private}
            />
          )}

          {isSelf && activeTab === "trips" && <ProfileTripsTab />}
        </div>
      )}
      {/* Fullscreen Lightbox Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="font-mono text-xs uppercase tracking-wider font-bold bg-white/10 px-3 py-1 rounded-full">
                {previewImage.title}
              </span>
              <button
                type="button"
                aria-label="Close image preview"
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction === "delete_avatar"
            ? "Remove Profile Photo"
            : confirmAction === "delete_banner"
              ? "Remove Banner Image"
              : "Unfriend Rider"
        }
        message={
          confirmAction === "delete_avatar"
            ? "Remove your current profile photo?"
            : confirmAction === "delete_banner"
              ? "Remove your profile banner image?"
              : `Unfriend @${profile.username}? They will no longer see friends-only garage or feed details.`
        }
        confirmLabel={confirmAction === "unfriend" ? "Unfriend" : "Remove"}
        destructive
        busy={confirmBusy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}
