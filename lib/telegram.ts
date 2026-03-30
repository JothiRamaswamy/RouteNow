// Telegram Bot API helper
// Sends messages to YOUR Telegram account via a bot you control.
// Set up: https://core.telegram.org/bots#creating-a-new-bot

const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram not configured — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing");
    return;
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${body}`);
  }
}

// Build a nicely formatted leave-now message
export function buildLeaveNowMessage(params: {
  destination: string;
  leaveBySafe: string;
  mode: string;
  durationMins: number;
  confidence: string;
  hasAlerts: boolean;
}): string {
  const modeEmoji = params.mode === "transit" ? "🚇" : params.mode === "driving" ? "🚗" : "🚶";
  const confidenceEmoji =
    params.confidence === "on time" ? "✅" : params.confidence === "tight" ? "⚠️" : "🔴";

  let msg = `${modeEmoji} <b>Leave now</b> — or by <b>${params.leaveBySafe}</b> at the latest\n`;
  msg += `📍 Heading to: ${params.destination}\n`;
  msg += `⏱ ${params.durationMins} min trip · ${confidenceEmoji} ${params.confidence}`;

  if (params.hasAlerts) {
    msg += `\n⚠️ Active MTA delays on your route — give yourself extra time.`;
  }

  return msg;
}
