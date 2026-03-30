import { NextRequest, NextResponse } from "next/server";
import { saveScheduledTrip, getUpcomingTrips } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST — schedule a new trip
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      destination,
      destination_lat,
      destination_lng,
      arrive_by,
      origin,
      origin_lat,
      origin_lng,
    } = body;

    if (!destination || !destination_lat || !destination_lng || !arrive_by) {
      return NextResponse.json(
        { error: "destination, coordinates, and arrive_by are required" },
        { status: 400 }
      );
    }

    const trip = await saveScheduledTrip({
      origin_address: origin ?? "Current location",
      origin_lat: origin_lat ?? 0,
      origin_lng: origin_lng ?? 0,
      destination_address: destination,
      destination_lat,
      destination_lng,
      arrive_by: new Date(arrive_by).toISOString(),
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    console.error("/api/trips POST error:", err);
    return NextResponse.json({ error: "Failed to schedule trip" }, { status: 500 });
  }
}

// GET — list upcoming trips
export async function GET() {
  try {
    const trips = await getUpcomingTrips();
    return NextResponse.json(trips);
  } catch (err) {
    console.error("/api/trips GET error:", err);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}
