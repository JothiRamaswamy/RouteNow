"use client";

import { useEffect, useState } from "react";
import { Home, Briefcase, MapPin } from "lucide-react";
import { getSavedLocations } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { SavedLocation, LocationType } from "@/types";

interface SavedLocationsProps {
  onSelect: (location: SavedLocation) => void;
}

export function SavedLocations({ onSelect }: SavedLocationsProps) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSavedLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (locations.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Quick select</p>
      <div className="flex flex-wrap gap-2">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => onSelect(loc)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
              "bg-secondary text-secondary-foreground",
              "hover:bg-secondary/80 transition-colors"
            )}
          >
            <LocationIcon type={loc.type} />
            {loc.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationIcon({ type }: { type: LocationType }) {
  switch (type) {
    case "home":
      return <Home className="h-3.5 w-3.5" />;
    case "work":
      return <Briefcase className="h-3.5 w-3.5" />;
    default:
      return <MapPin className="h-3.5 w-3.5" />;
  }
}
