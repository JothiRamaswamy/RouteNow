import { createClient } from "@supabase/supabase-js";
import type { SavedLocation, ScheduledTrip, PushSubscriptionRow } from "@/types";

// Browser-side Supabase client (uses anon key, respects RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Saved locations helpers ──────────────────────────────────────────────────

export async function getSavedLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .order("type", { ascending: true }); // home, work, custom

  if (error) throw error;
  return data ?? [];
}

export async function addSavedLocation(
  location: Omit<SavedLocation, "id">
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from("saved_locations")
    .insert(location)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSavedLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from("saved_locations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateSavedLocation(
  id: string,
  updates: Partial<Omit<SavedLocation, "id">>
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from("saved_locations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Scheduled trips helpers ──────────────────────────────────────────────────

export async function getScheduledTrips(): Promise<ScheduledTrip[]> {
  const { data, error } = await supabase
    .from("scheduled_trips")
    .select("*")
    .eq("alert_sent", false)
    .order("arrive_by", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function deleteScheduledTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from("scheduled_trips")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Push subscription helpers ────────────────────────────────────────────────

export async function savePushSubscription(
  sub: PushSubscription
): Promise<void> {
  const key = sub.getKey("p256dh");
  const auth = sub.getKey("auth");

  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
    auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
  });

  if (error) throw error;
}
