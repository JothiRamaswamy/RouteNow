import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { RouteResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const client = new Anthropic();

interface ExplainRequest {
  routes: RouteResult[];
}

export async function POST(req: NextRequest) {
  try {
    const { routes }: ExplainRequest = await req.json();

    if (!routes || routes.length === 0) {
      return new Response("No routes provided", { status: 400 });
    }

    const recommended = routes.find((r) => r.recommended) ?? routes[0];
    const prompt = buildPrompt(routes, recommended);

    // Stream response back to the client
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("/api/explain error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a smart NYC commute assistant. You give brief, direct, conversational advice about getting around New York City.

Rules:
- 2-4 sentences max. Never use bullet points or headers.
- Lead with the recommended route and exact leave-by time.
- Mention any subway delays or alerts in plain language if they matter.
- If driving, note traffic conditions.
- Be practical and NYC-specific. Use first person ("you should leave by...").
- Don't hedge excessively. Be confident but honest about uncertainty.`;

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(routes: RouteResult[], recommended: RouteResult): string {
  const lines: string[] = [];

  lines.push("Current commute options:");

  for (const route of routes) {
    const flag = route.recommended ? " [RECOMMENDED]" : "";
    lines.push(
      `\n${route.mode.toUpperCase()}${flag}: ${route.summary}`
    );
    lines.push(`  Leave by: ${route.leaveBy} (safe: ${route.leaveBySafe})`);
    lines.push(`  Confidence: ${route.confidence}`);

    if (route.alerts.length > 0) {
      lines.push(`  MTA alerts (${route.alerts.length}):`);
      for (const alert of route.alerts.slice(0, 2)) {
        lines.push(`    - ${alert.affectedLines.join(",")} train: ${alert.header}`);
      }
    }
  }

  lines.push(
    `\nBased on these conditions, give me a brief 2-3 sentence explanation of what I should do and when to leave.`
  );

  return lines.join("\n");
}
