"use client";

import { Train, Car, Footprints, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RouteResult, TransportMode, ConfidenceLabel } from "@/types";

interface RouteCardProps {
  route: RouteResult;
  recommended?: boolean;
}

export function RouteCard({ route, recommended }: RouteCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-all",
        recommended
          ? "border-primary/40 shadow-sm ring-1 ring-primary/20"
          : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Mode icon + label */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              modeColor(route.mode)
            )}
          >
            <ModeIcon mode={route.mode} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {modeLabel(route.mode)}
              {recommended && (
                <span className="ml-2 text-xs font-normal text-primary">
                  Best option
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {route.summary.replace(/^(Subway|Drive|Walk)\s·\s\d+\smin\s·?\s?/, "")}
            </p>
          </div>
        </div>

        {/* Leave-by + confidence */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-foreground">
            Leave {route.leaveBySafe}
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round(route.durationSeconds / 60)} min ride
          </p>
          <ConfidenceBadge label={route.confidence} />
        </div>
      </div>

      {/* MTA alerts */}
      {route.alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {route.alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5"
            >
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-700 truncate max-w-[200px]">
                {alert.affectedLines.join(", ")} · {alert.header}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Leave-by timeline */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        <span>
          Leave by <span className="font-medium text-foreground">{route.leaveBy}</span>
          {" "}· Safe buffer: <span className="font-medium text-foreground">{route.leaveBySafe}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ModeIcon({ mode }: { mode: TransportMode }) {
  switch (mode) {
    case "transit":
      return <Train className="h-4 w-4" />;
    case "driving":
      return <Car className="h-4 w-4" />;
    case "walking":
      return <Footprints className="h-4 w-4" />;
  }
}

function ConfidenceBadge({ label }: { label: ConfidenceLabel }) {
  return (
    <span
      className={cn(
        "inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium",
        label === "on time" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        label === "tight" && "bg-amber-50 text-amber-700 border border-amber-200",
        label === "risky" && "bg-red-50 text-red-700 border border-red-200"
      )}
    >
      {label}
    </span>
  );
}

function modeLabel(mode: TransportMode): string {
  switch (mode) {
    case "transit": return "Subway";
    case "driving": return "Drive";
    case "walking": return "Walk";
  }
}

function modeColor(mode: TransportMode): string {
  switch (mode) {
    case "transit": return "bg-blue-100 text-blue-600";
    case "driving": return "bg-slate-100 text-slate-600";
    case "walking": return "bg-emerald-100 text-emerald-600";
  }
}
