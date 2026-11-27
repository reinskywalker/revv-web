import { getApiBaseUrl } from "./api-core";
import type { ApiResponse, NewsArticle } from "./api-types";

// Fallback articles mirroring revv-backend seed database for resilience
export const SEED_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "44444444-5555-6666-7777-888888888801",
    slug: "pre-touring-checklist-preparing-brakes-tires-chain-for-cross-java-routes",
    title: "Pre-Touring Checklist: Preparing Brakes, Tires & Chain for Cross-Java Routes",
    summary:
      "Long-haul highway and mountain stages push brake fluid temperatures, tire pressures, and drive chains far harder than daily commuting.",
    content: `Before rolling out on a multi-hundred-kilometer ride, spend twenty focused minutes inspecting five critical systems.\n\n1. Cold Tire Pressure & Tread Depth\nAlways measure tire pressure cold before departing. Under-inflated tires flex excessively at sustained highway speeds, building heat and accelerating center wear.\n\n2. Brake Pad Thickness & Fluid Clarity\nMountain descents demand crisp hydraulic response. Check front and rear pad grooves and verify brake fluid color in the reservoir.\n\n3. Chain Slack, Lubrication & Sprocket Teeth\nAdjust slack to manufacturer spec with the bike on its side stand or center stand as specified, clean grit with kerosene-safe cleaner, and apply touring-grade chain wax.\n\n4. Fasteners & Luggage Balance\nKeep heavy tools low and centered, torque rack bolts, and verify tail/brake lights remain unobstructed.\n\nLog every replacement in your REVV Digital Garage so mileage intervals alert you well before ride day.`,
    category: "MAINTENANCE",
    author_name: "REVV Garage Desk",
    reading_time_minutes: 4,
    is_highlight: true,
    published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "44444444-5555-6666-7777-888888888802",
    slug: "group-ride-intercom-etiquette-keeping-pack-comms-clear-safe",
    title: "Group Ride Intercom Etiquette: Keeping Pack Comms Clear & Safe",
    summary:
      "Clear Road Captain callouts and disciplined Push-to-Talk habits make pack riding smoother for every rider in the formation.",
    content: `Live helmet intercom transforms group riding—when the channel stays crisp and uncluttered.\n\n1. Designate Lead & Sweep Early\nAgree before departure who calls hazards at the front (Lead) and who confirms lane changes or regroups from the rear (Sweep).\n\n2. Concise Hazard Callouts\nUse short, unmistakable phrases: "Gravel left", "Slowing—toll gate ahead", or "Single file". Avoid long stories while navigating technical corners.\n\n3. Use Mute or Push-to-Talk at High Speed\nOpen-visor wind buffeting fatigues everyone on channel. Toggle Push-to-Talk mode in REVV Voice Comms whenever highway wind noise picks up.\n\n4. Regroup at Waypoints, Not Blind Shoulders\nPin fuel and rest waypoints in REVV Navigation ahead of time so no rider feels pressured to rush yellow lights to stay in visual range.`,
    category: "SAFETY & COMMS",
    author_name: "REVV Touring Ops",
    reading_time_minutes: 3,
    is_highlight: true,
    published_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
  {
    id: "44444444-5555-6666-7777-888888888803",
    slug: "wet-asphalt-cornering-reading-surface-grip-during-tropical-downpours",
    title: "Wet-Asphalt Cornering: Reading Surface Grip During Tropical Downpours",
    summary:
      "The first fifteen minutes of rain lift oil and diesel film onto painted lines and toll approaches. Smooth inputs keep chassis pitch settled.",
    content: `Sudden tropical rain changes road grip dramatically within minutes.\n\n• Give the first 15 minutes extra margin: light rain mixes with traffic residue before heavy runoff washes the lane clean.\n• Avoid painted markings, metal expansion joints, and polished concrete patches while leaned over.\n• Relax your grip on the bars: stiff arms transmit wind gusts directly into steering wobble.\n• Roll on and brake progressively so tire contact patches load smoothly before peak force.`,
    category: "RIDING CRAFT",
    author_name: "REVV Editorial",
    reading_time_minutes: 3,
    is_highlight: false,
    published_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "44444444-5555-6666-7777-888888888804",
    slug: "introducing-revv-photo-mode-route-story-overlays",
    title: "Introducing REVV Photo Mode & Route Story Overlays",
    summary:
      "Turn post-ride photos into crisp route cards with polylines, average speed, ride time, and your Digital Garage bike.",
    content: `Every great ride deserves more than a raw camera roll frame.\n\nWith REVV Route Story, overlay your actual GPS route, total distance, ride time, and average speed onto your favorite summit or rest-stop shot—ready to save to Gallery or share straight to Instagram Stories and TikTok.\n\nPrefer a minimal Strava-inspired look? Launch REVV Photo Mode to stamp the REVV mark, your @username, your bike from Digital Garage, and clean ride stats.`,
    category: "PRODUCT",
    author_name: "REVV Team",
    reading_time_minutes: 2,
    is_highlight: false,
    published_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
];

/**
 * Fetch news articles from revv-backend /api/v1/news
 */
export async function fetchNewsArticles(params?: {
  page?: number;
  limit?: number;
}): Promise<{ articles: NewsArticle[]; fromFallback: boolean }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const baseUrl = getApiBaseUrl();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/news?page=${page}&limit=${limit}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.ok) {
      const data: ApiResponse<NewsArticle[]> = await res.json();
      if (Array.isArray(data.data)) {
        return { articles: data.data, fromFallback: false };
      }
    }
  } catch (err) {
    console.warn("REVV Backend news endpoint unreachable:", err);
  }

  return { articles: [], fromFallback: false };
}

/**
 * Fetch a single news article by slug or id from revv-backend /api/v1/news/{slug}
 */
export async function fetchNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/news/${encodeURIComponent(slug)}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.ok) {
      const data: ApiResponse<NewsArticle> = await res.json();
      if (data.data) return data.data;
    }
  } catch (err) {
    console.warn("REVV Backend article detail lookup failed:", err);
  }

  return null;
}
