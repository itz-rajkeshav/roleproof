"use client";

import { cn } from "@roleproof/ui/lib/utils";
import { useState } from "react";

const code = [
  { n: 39, text: "export async function retry(event: WebhookEvent) {" },
  { n: 40, text: "  for (let attempt = 1; attempt <= 3; attempt++) {" },
  { n: 41, text: "    try { return await deliver(event); }" },
  { n: 42, text: "    catch { await sleep(attempt * 1000); }" },
  { n: 43, text: "  }" },
  { n: 44, text: "}" },
];

const FLAGGED = 42;

export function ClaimCheck() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-serif text-2xl">
          <span className="text-band-foreground/60">You said: </span>“I added exponential backoff.”
        </p>
        <button
          onClick={() => setChecked(!checked)}
          className="rounded-full bg-mauve px-5 py-2 text-sm font-medium text-plum transition-transform hover:scale-[1.03] active:scale-95"
        >
          {checked ? "Reset" : "Check the code"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-band-foreground/15 bg-black/20 font-mono text-xs leading-7">
        <div className="flex items-center justify-between border-b border-band-foreground/15 px-4 py-2 text-band-foreground/60">
          <span>src/payments/webhook.ts</span>
          {checked && <span className="text-[#e8907a] animate-in fade-in">line {FLAGGED}</span>}
        </div>
        <pre className="overflow-x-auto py-3">
          {code.map((line) => (
            <div
              key={line.n}
              className={cn(
                "border-l-2 px-4 transition-colors duration-500",
                checked && line.n === FLAGGED ? "border-terracotta bg-terracotta/25" : "border-transparent",
              )}
            >
              <span className="mr-4 inline-block w-5 text-band-foreground/40">{line.n}</span>
              {line.text}
              {checked && line.n === FLAGGED && (
                <span className="ml-4 text-[#e8907a] animate-in fade-in slide-in-from-left-2 duration-500">
                  ← 1s, 2s, 3s
                </span>
              )}
            </div>
          ))}
        </pre>
      </div>

      <p
        className={cn(
          "min-h-[4.5em] font-serif text-xl leading-relaxed transition-all duration-500 sm:text-2xl",
          checked ? "opacity-100" : "translate-y-2 opacity-0",
        )}
        aria-live="polite"
      >
        {checked &&
          "“Line 42 waits one, two, then three seconds. That grows linearly. Walk me through why you called it exponential.”"}
      </p>
    </div>
  );
}
