import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import type { MtaAlert } from "@/types";

// MTA GTFS-RT service alerts feed URLs
// These are all free — no API key required for the main feeds.
// The newer "enhanced" feeds require a key from api.mta.info.
const ALERTS_FEED_URL =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts";

// NYC subway line groups used for matching alerts to routes
const ALL_SUBWAY_LINES = [
  "1","2","3","4","5","6","7",
  "A","C","E",
  "B","D","F","M",
  "G",
  "J","Z",
  "L",
  "N","Q","R","W",
  "S", // shuttles
];

// Simple in-memory cache — don't hammer the MTA feed on every request
let alertsCache: { data: MtaAlert[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─── Fetch + parse MTA alerts ─────────────────────────────────────────────────

export async function getMtaAlerts(): Promise<MtaAlert[]> {
  const now = Date.now();

  if (alertsCache && now - alertsCache.fetchedAt < CACHE_TTL_MS) {
    return alertsCache.data;
  }

  try {
    const res = await fetch(ALERTS_FEED_URL, { cache: "no-store" });

    if (!res.ok) {
      console.warn(`MTA feed returned ${res.status} — returning empty alerts`);
      return [];
    }

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const alerts: MtaAlert[] = [];

    for (const entity of feed.entity) {
      if (!entity.alert) continue;

      const alert = entity.alert;
      const header =
        alert.headerText?.translation?.[0]?.text ?? "Service Alert";
      const description =
        alert.descriptionText?.translation?.[0]?.text ?? "";
      const effect = String(alert.effect ?? "UNKNOWN_EFFECT");

      // Extract affected route IDs (subway lines)
      const affectedLines: string[] = [];
      for (const informed of alert.informedEntity ?? []) {
        const routeId = informed.routeId;
        if (routeId && ALL_SUBWAY_LINES.includes(routeId.toUpperCase())) {
          affectedLines.push(routeId.toUpperCase());
        }
      }

      if (affectedLines.length > 0) {
        alerts.push({
          id: entity.id,
          header,
          description,
          affectedLines: [...new Set(affectedLines)],
          effect,
        });
      }
    }

    alertsCache = { data: alerts, fetchedAt: now };
    return alerts;
  } catch (err) {
    console.error("Failed to fetch MTA GTFS-RT alerts:", err);
    return [];
  }
}

// ─── Filter alerts relevant to a set of subway lines ─────────────────────────

export function filterAlertsForLines(
  alerts: MtaAlert[],
  lines: string[]
): MtaAlert[] {
  const upperLines = lines.map((l) => l.toUpperCase());
  return alerts.filter((alert) =>
    alert.affectedLines.some((line) => upperLines.includes(line))
  );
}

// ─── Extract subway lines used in a route ────────────────────────────────────

export function extractLinesFromSteps(
  steps: { transitLine?: string }[]
): string[] {
  const lines: string[] = [];
  for (const step of steps) {
    if (step.transitLine) {
      // Google returns short names like "A", "4", "L"
      const line = step.transitLine.replace(/\s+train$/i, "").trim().toUpperCase();
      if (ALL_SUBWAY_LINES.includes(line)) {
        lines.push(line);
      }
    }
  }
  return [...new Set(lines)];
}
