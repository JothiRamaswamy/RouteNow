import { NextRequest, NextResponse } from "next/server";
import { fetchAllRoutes } from "@/lib/google-maps";
import { getMtaAlerts, filterAlertsForLines, extractLinesFromSteps } from "@/lib/mta";
import { computeLeaveBy, scoreRoute } from "@/lib/leaveBy";
import type { RoutesApiRequest, RoutesApiResponse, RouteResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body: RoutesApiRequest = await req.json();
    const { destination, destination_lat, destination_lng, arrival_time } = body;

    if (!destination || !arrival_time) {
      return NextResponse.json(
        { error: "destination and arrival_time are required" },
        { status: 400 }
      );
    }

    // Parse arrival time — accept "HH:MM" (local NYC time) or ISO string
    const arrivalDate = parseArrivalTime(arrival_time);
    if (!arrivalDate || isNaN(arrivalDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid arrival_time format. Use HH:MM or ISO 8601." },
        { status: 400 }
      );
    }

    // Resolve origin
    const origin =
      body.origin_lat && body.origin_lng
        ? `${body.origin_lat},${body.origin_lng}`
        : body.origin ?? "current location"; // fallback — caller should provide coords

    const destinationCoords =
      destination_lat && destination_lng
        ? `${destination_lat},${destination_lng}`
        : destination;

    // Fetch MTA alerts and Google routes in parallel
    const [googleRoutes, allAlerts] = await Promise.all([
      fetchAllRoutes(origin, destinationCoords, Math.floor(arrivalDate.getTime() / 1000)),
      getMtaAlerts(),
    ]);

    if (googleRoutes.length === 0) {
      return NextResponse.json(
        { error: "No routes found. Check your origin/destination." },
        { status: 404 }
      );
    }

    // Score routes for recommendation
    const scored = googleRoutes.map((route) => {
      const subwayLines = extractLinesFromSteps(route.steps);
      const relevantAlerts = filterAlertsForLines(allAlerts, subwayLines);
      const leaveBy = computeLeaveBy(arrivalDate, route.durationSeconds, relevantAlerts);
      const score = scoreRoute(route.durationSeconds, route.mode, relevantAlerts);

      return { route, relevantAlerts, leaveBy, score };
    });

    scored.sort((a, b) => a.score - b.score);

    const routes: RouteResult[] = scored.map(({ route, relevantAlerts, leaveBy }, idx) => ({
      mode: route.mode,
      durationSeconds: route.durationSeconds,
      departureTime: new Date(route.departureTimestamp * 1000).toISOString(),
      arrivalTime: new Date(route.arrivalTimestamp * 1000).toISOString(),
      leaveBy: leaveBy.leaveByFormatted,
      leaveBySafe: leaveBy.leaveBySafeFormatted,
      confidence: leaveBy.confidence,
      alerts: relevantAlerts,
      steps: route.steps,
      recommended: idx === 0,
      summary: buildSummary(route.mode, route.durationSeconds, route.summary),
    }));

    const response: RoutesApiResponse = {
      routes,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("/api/routes error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArrivalTime(value: string): Date {
  // Try ISO first
  const iso = new Date(value);
  if (!isNaN(iso.getTime())) return iso;

  // Try "HH:MM" — treat as NYC local time today
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (match) {
    const now = new Date();
    const nyc = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = nyc.find((p) => p.type === "year")!.value;
    const month = nyc.find((p) => p.type === "month")!.value;
    const day = nyc.find((p) => p.type === "day")!.value;

    const hourRaw = parseInt(match[1]);
    const min = parseInt(match[2]);
    const meridiem = match[3]?.toLowerCase();

    let hour = hourRaw;
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    // Build date in NYC timezone
    const dateStr = `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Simple approach: use Date.parse with timezone offset
    const offset = getNycOffsetMinutes(now);
    const utcMs = new Date(dateStr).getTime() - offset * 60 * 1000;
    const result = new Date(utcMs);

    // If result is in the past (e.g. it's 2pm and user typed 9:00), assume tomorrow
    if (result < now) {
      result.setDate(result.getDate() + 1);
    }

    return result;
  }

  return new Date("invalid");
}

function getNycOffsetMinutes(date: Date): number {
  // Returns NYC UTC offset in minutes (e.g. -300 for EST, -240 for EDT)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const match = tzPart.match(/GMT([+-]\d+)/);
  if (match) {
    return parseInt(match[1]) * 60;
  }
  return -300; // fallback to EST
}

function buildSummary(mode: string, durationSeconds: number, routeSummary: string): string {
  const mins = Math.round(durationSeconds / 60);
  const modeLabel = mode === "transit" ? "Subway" : mode === "driving" ? "Drive" : "Walk";
  return `${modeLabel} · ${mins} min${routeSummary ? ` · ${routeSummary}` : ""}`;
}
