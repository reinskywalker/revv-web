import { Shield } from "lucide-react";

export type AccountVisibility = "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE" | "CUSTOM";
export type SavedRoutesVisibility = "public" | "friends" | "private";

export interface ProfileEditorFormProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  job: string;
  onJobChange: (value: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
  visibility: AccountVisibility;
  onVisibilityChange: (value: AccountVisibility) => void;
  showMotorcycleCount: boolean;
  onShowMotorcycleCountChange: (value: boolean) => void;
  showGarageDetails: boolean;
  onShowGarageDetailsChange: (value: boolean) => void;
  showCity: boolean;
  onShowCityChange: (value: boolean) => void;
  showCountry: boolean;
  onShowCountryChange: (value: boolean) => void;
  showJob: boolean;
  onShowJobChange: (value: boolean) => void;
  privacySavedRoutes: SavedRoutesVisibility;
  onPrivacySavedRoutesChange: (value: SavedRoutesVisibility) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const VISIBILITY_OPTIONS: Array<{ value: AccountVisibility; label: string }> = [
  { value: "PUBLIC", label: "Public" },
  { value: "FRIENDS_ONLY", label: "Friends Only" },
  { value: "PRIVATE", label: "Private" },
  { value: "CUSTOM", label: "Custom Granular" },
];

export function ProfileEditorForm({
  displayName,
  onDisplayNameChange,
  city,
  onCityChange,
  country,
  onCountryChange,
  job,
  onJobChange,
  bio,
  onBioChange,
  visibility,
  onVisibilityChange,
  showMotorcycleCount,
  onShowMotorcycleCountChange,
  showGarageDetails,
  onShowGarageDetailsChange,
  showCity,
  onShowCityChange,
  showCountry,
  onShowCountryChange,
  showJob,
  onShowJobChange,
  privacySavedRoutes,
  onPrivacySavedRoutesChange,
  saving,
  onSave,
  onCancel,
}: ProfileEditorFormProps) {
  const customFlags: Array<{
    id: string;
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
  }> = [
    {
      id: "show-moto-count",
      label: "Show motorcycle count",
      checked: showMotorcycleCount,
      onChange: onShowMotorcycleCountChange,
    },
    {
      id: "show-garage-details",
      label: "Show garage details",
      checked: showGarageDetails,
      onChange: onShowGarageDetailsChange,
    },
    { id: "show-city", label: "Show city", checked: showCity, onChange: onShowCityChange },
    {
      id: "show-country",
      label: "Show home base / country",
      checked: showCountry,
      onChange: onShowCountryChange,
    },
    { id: "show-job", label: "Show occupation", checked: showJob, onChange: onShowJobChange },
  ];

  return (
    <div className="pt-4 border-t border-border/60 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label
            htmlFor="edit-display-name"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            Display Name
          </label>
          <input
            id="edit-display-name"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            maxLength={80}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label
            htmlFor="edit-city"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            City
          </label>
          <input
            id="edit-city"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            maxLength={80}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label
            htmlFor="edit-country"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            Home Base / Country
          </label>
          <input
            id="edit-country"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            maxLength={80}
            placeholder="e.g. Indonesia"
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label
            htmlFor="edit-job"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            Occupation
          </label>
          <input
            id="edit-job"
            value={job}
            onChange={(e) => onJobChange(e.target.value)}
            maxLength={80}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="edit-account-visibility"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            Account Visibility
          </label>
          <select
            id="edit-account-visibility"
            value={visibility}
            onChange={(e) => onVisibilityChange(e.target.value as AccountVisibility)}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="edit-routes-visibility"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            Default Saved Routes Privacy
          </label>
          <select
            id="edit-routes-visibility"
            value={privacySavedRoutes}
            onChange={(e) => onPrivacySavedRoutesChange(e.target.value as SavedRoutesVisibility)}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {visibility === "CUSTOM" && (
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Shield className="size-3.5 text-primary" />
            <span>Custom Public Visibility Controls</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Choose what non-friends can see when inspecting your public profile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {customFlags.map((flag) => (
              <label
                key={flag.id}
                htmlFor={flag.id}
                className="flex items-center gap-2.5 min-h-[44px] rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs text-foreground cursor-pointer hover:border-primary/40"
              >
                <input
                  id={flag.id}
                  type="checkbox"
                  checked={flag.checked}
                  onChange={(e) => flag.onChange(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span>{flag.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="edit-bio"
          className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
        >
          Bio
        </label>
        <textarea
          id="edit-bio"
          rows={2}
          maxLength={250}
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary/50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="min-h-[44px] rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
