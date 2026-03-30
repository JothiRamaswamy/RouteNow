import webpush from "web-push";
import type { PushSubscriptionRow } from "@/types";

// Configure web-push with VAPID keys once
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_MAILTO}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionRow,
  payload: PushPayload
): Promise<void> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  await webpush.sendNotification(
    pushSubscription,
    JSON.stringify(payload)
  );
}

export async function sendPushToAll(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload
): Promise<void> {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(`${failed.length}/${subscriptions.length} push notifications failed`);
  }
}
