import type { ConfidenceLabel, LeaveByResult, MtaAlert } from "@/types";

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_BUFFER_MINUTES = 10;
const MTA_ALERT_EXTRA_BUFFER_MINUTES = 5;
const TIGHT_THRESHOLD_MINUTES = 5; // buffer left after removing alerts
const RISKY_THRESHOLD_MINUTES = 2;

// ─── Core leave-by engine ─────────────────────────────────────────────────────

export function computeLeaveBy(
  arrivalTime: Date,
  durationSeconds: number,
  alerts: MtaAlert[],
  options?: {
    bufferMinutes?: number;
    alertBufferMinutes?: number;
  }
): LeaveByResult {
  const bufferMinutes = options?.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  const alertBuffer =
    alerts.length > 0
      ? (options?.alertBufferMinutes ?? MTA_ALERT_EXTRA_BUFFER_MINUTES)
      : 0;

  const totalBufferMinutes = bufferMinutes + alertBuffer;

  // Ideal leave-by: just arrival - travel time
  const leaveBy = new Date(
    arrivalTime.getTime() - durationSeconds * 1000
  );

  // Safe leave-by: arrival - travel time - buffer
  const leaveBySafe = new Date(
    leaveBy.getTime() - totalBufferMinutes * 60 * 1000
  );

  // Confidence: how much slack is there?
  const slackMinutes = totalBufferMinutes;
  const confidence = computeConfidence(slackMinutes, alerts.length > 0);

  return {
    leaveBy,
    leaveBySafe,
    leaveByFormatted: formatTime(leaveBy),
    leaveBySafeFormatted: formatTime(leaveBySafe),
    confidence,
    bufferMinutes: totalBufferMinutes,
  };
}

// ─── Rank routes and pick recommended ─────────────────────────────────────────

// Lower score = better option
export function scoreRoute(
  durationSeconds: number,
  mode: string,
  alerts: MtaAlert[]
): number {
  let score = durationSeconds;

  // Penalize for active alerts
  score += alerts.length * 5 * 60; // 5 min per alert

  // Walking penalty beyond 20 min — prefer transit
  if (mode === "walking" && durationSeconds > 20 * 60) {
    score += 20 * 60;
  }

  return score;
}

// ─── Confidence label ─────────────────────────────────────────────────────────

function computeConfidence(
  bufferMinutes: number,
  hasAlerts: boolean
): ConfidenceLabel {
  // Alerts reduce effective confidence even with buffer
  const effectiveBuffer = hasAlerts
    ? bufferMinutes - MTA_ALERT_EXTRA_BUFFER_MINUTES
    : bufferMinutes;

  if (effectiveBuffer > TIGHT_THRESHOLD_MINUTES) return "on time";
  if (effectiveBuffer > RISKY_THRESHOLD_MINUTES) return "tight";
  return "risky";
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function minsUntil(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 60000);
}
