"use client";

import { useState } from "react";
import { DestinationInput } from "@/components/DestinationInput";
import { SavedLocations } from "@/components/SavedLocations";
import { RouteCard } from "@/components/RouteCard";
import { ClaudeExplanation } from "@/components/ClaudeExplanation";
import { NotificationButton } from "@/components/NotificationButton";
import type { RouteResult, SavedLocation } from "@/types";

export default function Home() {
  const [destination, setDestination] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [scheduledTrip, setScheduledTrip] = useState(false);

  async function handleSearch() {
    if (!destination || !arrivalTime) return;

    setLoading(true);
    setError(null);
    setRoutes([]);
    setShowExplanation(false);

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.address,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          arrival_time: arrivalTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch routes");
      }

      const data = await res.json();
      setRoutes(data.routes);
      setShowExplanation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleTrip() {
    if (!destination || !arrivalTime || routes.length === 0) return;

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.address,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          arrive_by: arrivalTime,
        }),
      });

      if (res.ok) {
        setScheduledTrip(true);
        setTimeout(() => setScheduledTrip(false), 3000);
      }
    } catch {
      // silent fail for scheduling
    }
  }

  function handleLocationSelect(location: SavedLocation) {
    setDestination({
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    });
  }

  const recommendedRoute = routes.find((r) => r.recommended) ?? routes[0];

  return (
    <div className="space-y-6">
      {/* Destination input */}
      <DestinationInput
        destination={destination}
        arrivalTime={arrivalTime}
        onDestinationChange={setDestination}
        onArrivalTimeChange={setArrivalTime}
        onSearch={handleSearch}
        loading={loading}
      />

      {/* Saved locations quick-select */}
      <SavedLocations onSelect={handleLocationSelect} />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Route results */}
      {routes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Routes
            </h2>
            <button
              onClick={handleScheduleTrip}
              className="text-xs text-primary hover:underline"
            >
              {scheduledTrip ? "Reminder set!" : "Remind me"}
            </button>
          </div>

          {routes.map((route) => (
            <RouteCard
              key={route.mode}
              route={route}
              recommended={route.recommended}
            />
          ))}
        </div>
      )}

      {/* Claude explanation */}
      {showExplanation && routes.length > 0 && (
        <ClaudeExplanation routes={routes} recommendedRoute={recommendedRoute} />
      )}

      {/* Notification setup */}
      <div className="pt-4 border-t border-border">
        <NotificationButton />
      </div>
    </div>
  );
}
