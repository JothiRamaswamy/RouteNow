// ─── Route types ─────────────────────────────────────────────────────────────

export type TransportMode = "transit" | "driving" | "walking";

export type ConfidenceLabel = "on time" | "tight" | "risky";

export interface MtaAlert {
  id: string;
  header: string;
  description: string;
  affectedLines: string[]; // e.g. ["A", "C", "E"]
  effect: string; // e.g. "REDUCED_SERVICE"
}

export interface RouteStep {
  instruction: string;
  duration: number; // seconds
  distance: number; // meters
  transitLine?: string; // e.g. "A train"
}

export interface RouteResult {
  mode: TransportMode;
  durationSeconds: number;
  departureTime: Date | string;
  arrivalTime: Date | string;
  leaveBy: string; // formatted "3:45 PM"
  leaveBySafe: string; // formatted "3:35 PM" (with buffer)
  confidence: ConfidenceLabel;
  alerts: MtaAlert[];
  steps: RouteStep[];
  recommended: boolean;
  summary: string; // e.g. "A train → transfer at Jay St"
}

export interface RoutesApiRequest {
  destination: string;
  destination_lat: number;
  destination_lng: number;
  arrival_time: string; // ISO string or "HH:MM"
  origin?: string; // address, falls back to current location from header
  origin_lat?: number;
  origin_lng?: number;
}

export interface RoutesApiResponse {
  routes: RouteResult[];
  generatedAt: string;
}

// ─── Saved locations ──────────────────────────────────────────────────────────

export type LocationType = "home" | "work" | "custom";

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: LocationType;
}

// ─── Scheduled trips ──────────────────────────────────────────────────────────

export interface ScheduledTrip {
  id: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  arrive_by: string; // ISO timestamp
  alert_sent: boolean;
  created_at: string;
}

// ─── Push subscriptions ───────────────────────────────────────────────────────

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// ─── Leave-by engine ──────────────────────────────────────────────────────────

export interface LeaveByResult {
  leaveBy: Date;
  leaveBySafe: Date;
  leaveByFormatted: string;
  leaveBySafeFormatted: string;
  confidence: ConfidenceLabel;
  bufferMinutes: number;
}
