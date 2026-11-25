import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  return fallback;
}

export function isAdminRole(role?: string | null): boolean {
  return (role ?? "").trim().toLowerCase() === "administrator";
}

export function isModeratorRole(role?: string | null): boolean {
  return (role ?? "").trim().toLowerCase() === "moderator";
}

export function canAccessAdmin(role?: string | null): boolean {
  return isAdminRole(role) || isModeratorRole(role);
}

export function formatRiderFullName(
  rider?: {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    username?: string | null;
  } | null,
  fallback = "Rider",
): string {
  if (!rider) return fallback;
  const parts = [rider.first_name, rider.middle_name, rider.last_name].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  if (parts.length > 0) return parts.join(" ");
  if (rider.name && rider.name.trim().length > 0) return rider.name;
  if (rider.username && rider.username.trim().length > 0) return rider.username;
  return fallback;
}
