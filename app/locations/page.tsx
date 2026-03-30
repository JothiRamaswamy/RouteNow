"use client";

import { useEffect, useState } from "react";
import { Home, Briefcase, MapPin, Trash2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSavedLocations, addSavedLocation, deleteSavedLocation } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { SavedLocation, LocationType } from "@/types";

export default function LocationsPage() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<LocationType>("custom");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSavedLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newName || !newAddress) return;
    setSaving(true);
    try {
      // Geocode the address via Google Maps
      const geocodeRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(newAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geocodeData = await geocodeRes.json();

      if (geocodeData.status !== "OK" || !geocodeData.results[0]) {
        alert("Couldn't find that address. Try being more specific.");
        return;
      }

      const result = geocodeData.results[0];
      const lat = result.geometry.location.lat;
      const lng = result.geometry.location.lng;
      const formattedAddress = result.formatted_address;

      const newLoc = await addSavedLocation({
        name: newName,
        address: formattedAddress,
        lat,
        lng,
        type: newType,
      });

      setLocations((prev) => [...prev, newLoc]);
      setAdding(false);
      setNewName("");
      setNewAddress("");
      setNewType("custom");
    } catch (err) {
      console.error(err);
      alert("Failed to add location.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this saved location?")) return;
    await deleteSavedLocation(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h2 className="text-lg font-semibold">Saved Locations</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <LocationIcon type={loc.type} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{loc.name}</p>
                <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
              </div>
              <button
                onClick={() => handleDelete(loc.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {locations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No saved locations yet.
            </p>
          )}
        </div>
      )}

      {/* Add new location */}
      {adding ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Add Location</h3>
          <input
            type="text"
            placeholder="Name (e.g. Gym)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            placeholder="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as LocationType)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none"
          >
            <option value="custom">Custom</option>
            <option value="home">Home</option>
            <option value="work">Work</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newName || !newAddress}
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 rounded-lg border py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add location
        </button>
      )}
    </div>
  );
}

function LocationIcon({ type }: { type: LocationType }) {
  const cls = "h-5 w-5 text-muted-foreground";
  switch (type) {
    case "home": return <Home className={cls} />;
    case "work": return <Briefcase className={cls} />;
    default: return <MapPin className={cls} />;
  }
}
