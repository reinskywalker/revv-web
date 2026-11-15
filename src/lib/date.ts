export function formatRelativeTime(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "just now";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  const y = Math.floor(diffDays / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}
