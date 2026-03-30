"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationInputProps {
  destination: { address: string; lat: number; lng: number } | null;
  arrivalTime: string;
  onDestinationChange: (dest: { address: string; lat: number; lng: number } | null) => void;
  onArrivalTimeChange: (time: string) => void;
  onSearch: () => void;
  loading: boolean;
}

declare global {
  interface Window {
    google: typeof google;
    initAutocomplete: () => void;
  }
}

export function DestinationInput({
  destination,
  arrivalTime,
  onDestinationChange,
  onArrivalTimeChange,
  onSearch,
  loading,
}: DestinationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(destination?.address ?? "");
  const [locating, setLocating] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google?.maps?.places) return;
    if (!inputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "geometry"],
        types: ["geocode", "establishment"],
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current!.getPlace();
      if (!place.geometry?.location || !place.formatted_address) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setInputValue(place.formatted_address);
      onDestinationChange({ address: place.formatted_address, lat, lng });
    });
  }, [onDestinationChange]);

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode via our API
        try {
          const res = await fetch(
            `/api/geocode?lat=${lat}&lng=${lng}`
          );
          const data = await res.json();
          const address = data.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setInputValue(address);
          onDestinationChange({ address, lat, lng });
        } catch {
          const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setInputValue(address);
          onDestinationChange({ address, lat, lng });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        alert("Unable to get your location. Check browser permissions.");
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && destination && arrivalTime) onSearch();
  }

  // Get default time — 1 hour from now in NYC
  function getDefaultTime(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  const canSearch = !!(destination && arrivalTime) && !loading;

  return (
    <div className="space-y-3">
      {/* Destination field */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Where are you going?"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!e.target.value) onDestinationChange(null);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full rounded-lg border bg-background pl-9 pr-10 py-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "transition-colors"
          )}
        />
        <button
          onClick={handleUseCurrentLocation}
          disabled={locating}
          title="Use my current location"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Navigation className={cn("h-4 w-4", locating && "animate-pulse")} />
        </button>
      </div>

      {/* Arrival time + Search button row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">
            Arrive by
          </label>
          <input
            type="time"
            value={arrivalTime || getDefaultTime()}
            onChange={(e) => onArrivalTimeChange(e.target.value)}
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
              "transition-colors"
            )}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={onSearch}
            disabled={!canSearch}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Checking..." : "Go"}
          </button>
        </div>
      </div>
    </div>
  );
}
