import { NextRequest, NextResponse } from "next/server";
import { getAllPushSubscriptions } from "@/lib/supabase-server";
import { sendPushToAll, type PushPayload } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const payload: PushPayload = await req.json();

    const subscriptions = await getAllPushSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: "No push subscribers" });
    }

    await sendPushToAll(subscriptions, payload);

    return NextResponse.json({ sent: subscriptions.length });
  } catch (err) {
    console.error("/api/push error:", err);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
