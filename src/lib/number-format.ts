export function formatThousandsDot(value: string | number | null | undefined): string {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseThousandsDot(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}
