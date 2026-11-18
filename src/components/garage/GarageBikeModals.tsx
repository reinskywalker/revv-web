import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateGarageMotorcycle, type GarageMotorcycle } from "@/lib/api";
import { formatThousandsDot, parseThousandsDot } from "@/lib/number-format";

interface OdometerModalProps {
  bike: GarageMotorcycle | null;
  onClose: () => void;
  onUpdated: (newKm: number) => Promise<void>;
  onError: (msg: string) => void;
}

export function UpdateOdometerModal({ bike, onClose, onUpdated, onError }: OdometerModalProps) {
  const [mileage, setMileage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bike) setMileage(String(bike.current_mileage));
  }, [bike]);

  useEffect(() => {
    if (!bike) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bike, onClose]);

  if (!bike) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bike) return;
    const parsed = Number(mileage);
    if (!Number.isFinite(parsed) || parsed < 0) {
      onError("Please enter a valid non-negative odometer reading.");
      return;
    }
    setSaving(true);
    try {
      await updateGarageMotorcycle(bike.id, { current_mileage: Math.round(parsed) });
      await onUpdated(Math.round(parsed));
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update mileage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground">Update Odometer</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close odometer dialog"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/50"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {bike.nickname || bike.series_name || bike.name}
        </p>
        <div>
          <label
            htmlFor="odometer-km"
            className="text-[11px] font-mono uppercase text-muted-foreground block mb-1"
          >
            Current Odometer (km)
          </label>
          <input
            id="odometer-km"
            type="number"
            min={0}
            required
            autoFocus
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-border px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {saving ? "Updating…" : "Save KM"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface EditBikeModalProps {
  bike: GarageMotorcycle | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}

export function EditBikeModal({ bike, onClose, onSaved, onError }: EditBikeModalProps) {
  const [nickname, setNickname] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [transmission, setTransmission] = useState("matic");
  const [category, setCategory] = useState("scooter");
  const [mileage, setMileage] = useState("0");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 101 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (!bike) return;
    setNickname(bike.nickname || "");
    setPlateNumber(bike.plate_number || "");
    setManufactureYear(bike.manufacture_year ? String(bike.manufacture_year) : "");
    setTransmission(bike.transmission || "matic");
    setCategory(bike.category || "scooter");
    setMileage(formatThousandsDot(bike.current_mileage));
    setIsPrimary(Boolean(bike.is_primary));
  }, [bike]);

  useEffect(() => {
    if (!bike) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bike, onClose]);

  if (!bike) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bike) return;
    const parsedKm = parseThousandsDot(mileage);
    setSaving(true);
    try {
      await updateGarageMotorcycle(bike.id, {
        ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
        ...(plateNumber.trim() ? { plate_number: plateNumber.trim() } : {}),
        ...(manufactureYear ? { manufacture_year: Number(manufactureYear) } : {}),
        transmission,
        category,
        current_mileage: Math.round(parsedKm),
        is_primary: isPrimary,
      });
      await onSaved();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save bike details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Edit Motorcycle</h3>
            <p className="text-xs text-muted-foreground">
              {bike.brand_name} {bike.series_name || bike.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit motorcycle modal"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
              Nickname
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Black Mamba"
              className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
              Plate Number
            </label>
            <input
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder="B 1234 REV"
              className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground uppercase"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
              Transmission
            </label>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
            >
              <option value="matic">Matic</option>
              <option value="manual">Manual</option>
              <option value="semi_auto">Semi-Auto</option>
              <option value="dct">DCT</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
              Model Year
            </label>
            <select
              value={manufactureYear}
              onChange={(e) => setManufactureYear(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select Year</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
              Odometer (km)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={mileage}
              onChange={(e) => setMileage(formatThousandsDot(e.target.value))}
              className="w-full min-h-[44px] rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-mono text-foreground"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 min-h-[40px] text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span>Set as primary cockpit ride</span>
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-border px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Bike"}
          </button>
        </div>
      </form>
    </div>
  );
}
