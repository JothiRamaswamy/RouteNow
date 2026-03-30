import type { TransportMode, RouteStep } from "@/types";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json";

// ─── Types from Google Directions API ─────────────────────────────────────────

interface DirectionsLeg {
  duration: { value: number; text: string };
  distance: { value: number; text: string };
  steps: DirectionsStep[];
  departure_time?: { value: number; text: string };
  arrival_time?: { value: number; text: string };
}

interface DirectionsStep {
  html_instructions: string;
  duration: { value: number; text: string };
  distance: { value: number; text: string };
  travel_mode: string;
  transit_details?: {
    line?: {
      short_name?: string;
      name?: string;
    };
  };
}

interface DirectionsRoute {
  legs: DirectionsLeg[];
  summary: string;
  warnings: string[];
}

interface DirectionsResponse {
  status: string;
  routes: DirectionsRoute[];
  error_message?: string;
}

// ─── Main route fetcher ───────────────────────────────────────────────────────

export interface FetchedRoute {
  mode: TransportMode;
  durationSeconds: number;
  steps: RouteStep[];
  summary: string;
  departureTimestamp: number; // Unix seconds
  arrivalTimestamp: number; // Unix seconds
  rawWarnings: string[];
}

export async function fetchRoute(
  origin: string,
  destination: string,
  mode: TransportMode,
  arrivalTimeUnix: number // Unix timestamp in seconds
): Promise<FetchedRoute | null> {
  const params = new URLSearchParams({
    origin,
    destination,
    mode: modeToGoogleMode(mode),
    arrival_time: String(arrivalTimeUnix),
    key: GOOGLE_MAPS_API_KEY,
    units: "imperial",
    // For transit, prefer subway
    ...(mode === "transit" && { transit_mode: "subway" }),
  });

  const res = await fetch(`${DIRECTIONS_BASE}?${params.toString()}`);
  const data: DirectionsResponse = await res.json();

  if (data.status !== "OK" || data.routes.length === 0) {
    console.warn(`Google Maps ${mode} route failed: ${data.status}`, data.error_message);
    return null;
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  // Google returns departure_time for transit routes with arrival_time specified.
  // For driving/walking we compute from duration.
  const arrivalTs = leg.arrival_time?.value ?? arrivalTimeUnix;
  const departureTs = leg.departure_time?.value ?? (arrivalTimeUnix - leg.duration.value);

  return {
    mode,
    durationSeconds: leg.duration.value,
    steps: leg.steps.map(stepToRouteStep),
    summary: route.summary || buildTransitSummary(leg.steps),
    departureTimestamp: departureTs,
    arrivalTimestamp: arrivalTs,
    rawWarnings: route.warnings,
  };
}

// ─── Batch fetch all three modes ──────────────────────────────────────────────

export async function fetchAllRoutes(
  origin: string,
  destination: string,
  arrivalTimeUnix: number
): Promise<FetchedRoute[]> {
  const modes: TransportMode[] = ["transit", "driving", "walking"];

  const results = await Promise.allSettled(
    modes.map((mode) => fetchRoute(origin, destination, mode, arrivalTimeUnix))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<FetchedRoute> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modeToGoogleMode(mode: TransportMode): string {
  switch (mode) {
    case "transit": return "transit";
    case "driving": return "driving";
    case "walking": return "walking";
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function stepToRouteStep(step: DirectionsStep): RouteStep {
  return {
    instruction: stripHtml(step.html_instructions),
    duration: step.duration.value,
    distance: step.distance.value,
    transitLine: step.transit_details?.line?.short_name ??
                 step.transit_details?.line?.name,
  };
}

function buildTransitSummary(steps: DirectionsStep[]): string {
  const transitSteps = steps.filter(
    (s) => s.travel_mode === "TRANSIT" && s.transit_details?.line?.short_name
  );
  if (transitSteps.length === 0) return "Walk";
  const lines = transitSteps.map((s) => s.transit_details!.line!.short_name!);
  return lines.join(" → ");
}

// ─── Reverse geocode ──────────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );
  const data = await res.json();
  if (data.status === "OK" && data.results[0]) {
    return data.results[0].formatted_address;
  }
  return `${lat},${lng}`;
}
