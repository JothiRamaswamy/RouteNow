import { NextRequest, NextResponse } from "next/server";
import { getUpcomingTrips, markTripAlertSent } from "@/lib/supabase-server";
import { getAllPushSubscriptions } from "@/lib/supabase-server";
import { fetchRoute } from "@/lib/google-maps";
import { getMtaAlerts, filterAlertsForLines, extractLinesFromSteps } from "@/lib/mta";
import { computeLeaveBy, minsUntil } from "@/lib/leaveBy";
import { sendTelegramMessage, buildLeaveNowMessage } from "@/lib/telegram";
import { sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 10; // Must complete within 10s on Vercel hobby plan

// Vercel cron secret — set CRON_SECRET in env vars and vercel.json
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // skip auth if not configured (dev only)
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [trips, allAlerts, pushSubs] = await Promise.all([
      getUpcomingTrips(),
      getMtaAlerts(),
      getAllPushSubscriptions(),
    ]);

    if (trips.length === 0) {
      return NextResponse.json({ checked: 0, fired: 0 });
    }

    let fired = 0;

    for (const trip of trips) {
      const arrivalTime = new Date(trip.arrive_by);
      const arrivalUnix = Math.floor(arrivalTime.getTime() / 1000);

      const origin = `${trip.origin_lat},${trip.origin_lng}`;
      const destination = `${trip.destination_lat},${trip.destination_lng}`;

      // Re-fetch live route (prefer transit, fall back to driving)
      const transitRoute = await fetchRoute(origin, destination, "transit", arrivalUnix);
      const route = transitRoute ?? await fetchRoute(origin, destination, "driving", arrivalUnix);

      if (!route) continue;

      const subwayLines = extractLinesFromSteps(route.steps);
      const alerts = filterAlertsForLines(allAlerts, subwayLines);
      const leaveBy = computeLeaveBy(arrivalTime, route.durationSeconds, alerts);

      // Fire if current time >= leave_by_safe
      const minsLeft = minsUntil(leaveBy.leaveBySafe);
      if (minsLeft > 0) continue; // Not time yet

      // Build message
      const durationMins = Math.round(route.durationSeconds / 60);
      const message = buildLeaveNowMessage({
        destination: trip.destination_address,
        leaveBySafe: leaveBy.leaveBySafeFormatted,
        mode: route.mode,
        durationMins,
        confidence: leaveBy.confidence,
        hasAlerts: alerts.length > 0,
      });

      const pushPayload = {
        title: "Time to leave!",
        body: `Head to ${trip.destination_address} — ${route.mode} · ${durationMins} min`,
        url: "/",
      };

      // Fire Telegram + Web Push simultaneously
      await Promise.allSettled([
        sendTelegramMessage(message),
        pushSubs.length > 0 ? sendPushToAll(pushSubs, pushPayload) : Promise.resolve(),
      ]);

      await markTripAlertSent(trip.id);
      fired++;
    }

    return NextResponse.json({ checked: trips.length, fired });
  } catch (err) {
    console.error("/api/cron/check-trips error:", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
