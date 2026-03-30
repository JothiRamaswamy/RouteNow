"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { RouteResult } from "@/types";

interface ClaudeExplanationProps {
  routes: RouteResult[];
  recommendedRoute: RouteResult;
}

export function ClaudeExplanation({ routes, recommendedRoute }: ClaudeExplanationProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request when routes change
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routes }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error("Failed to stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [routes]);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Smart summary
        </span>
      </div>

      {loading && !text && (
        <div className="flex gap-1 items-center">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
        </div>
      )}

      {error && !text && (
        <p className="text-sm text-muted-foreground">
          Couldn't load explanation — but the route cards above have everything you need.
        </p>
      )}

      {text && (
        <p className="text-sm text-foreground leading-relaxed">
          {text}
          {loading && (
            <span className="inline-block w-1 h-3.5 ml-0.5 bg-primary/60 animate-pulse rounded-sm" />
          )}
        </p>
      )}
    </div>
  );
}
