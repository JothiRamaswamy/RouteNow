import { createClient } from "@supabase/supabase-js";
import type { SavedLocation, ScheduledTrip, PushSubscriptionRow } from "@/types";

// Server-side Supabase client (uses service role key — bypasses RLS)
// ONLY use this in API routes and server components, never in the browser.
function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Scheduled trips (server) ─────────────────────────────────────────────────

export async function getUpcomingTrips(): Promise<ScheduledTrip[]> {
  const supabase = createServerClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + 45 * 60 * 1000); // 45 min window

  const { data, error } = await supabase
    .from("scheduled_trips")
    .select("*")
    .eq("alert_sent", false)
    .gte("arrive_by", now.toISOString())
    .lte("arrive_by", horizon.toISOString());

  if (error) throw error;
  return data ?? [];
}

export async function markTripAlertSent(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("scheduled_trips")
    .update({ alert_sent: true })
    .eq("id", id);

  if (error) throw error;
}

export async function saveScheduledTrip(
  trip: Omit<ScheduledTrip, "id" | "alert_sent" | "created_at">
): Promise<ScheduledTrip> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scheduled_trips")
    .insert({ ...trip, alert_sent: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Push subscriptions (server) ─────────────────────────────────────────────

export async function getAllPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) throw error;
  return data ?? [];
}

// ─── Saved locations (server) ─────────────────────────────────────────────────

export async function getSavedLocationsServer(): Promise<SavedLocation[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .order("type", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
