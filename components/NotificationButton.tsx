"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { savePushSubscription } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function NotificationButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied">("idle");

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Push notifications aren't supported in this browser.");
      return;
    }

    setStatus("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      await savePushSubscription(subscription);
      setStatus("enabled");
    } catch (err) {
      console.error("Push subscription failed:", err);
      setStatus("idle");
    }
  }

  if (status === "enabled") {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <Bell className="h-4 w-4" />
        <span>Notifications enabled — you'll get alerts when it's time to leave.</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>
          Notifications blocked. Enable them in your browser settings to get leave-now alerts.
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={enableNotifications}
      disabled={status === "loading"}
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
        status === "loading" && "opacity-50 cursor-not-allowed"
      )}
    >
      <Bell className="h-4 w-4" />
      {status === "loading" ? "Setting up notifications..." : "Enable leave-now alerts"}
    </button>
  );
}

// ─── VAPID key helper ──────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
