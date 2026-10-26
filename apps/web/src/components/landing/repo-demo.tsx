"use client";

import { cn } from "@roleproof/ui/lib/utils";
import { Mic, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

const files = [
  { path: "README.md", lines: 64 },
  { path: "src/server.ts", lines: 112 },
  { path: "src/orders/service.ts", lines: 203 },
  { path: "src/payments/webhook.ts", lines: 87 },
  { path: "src/cache/client.ts", lines: 41 },
  { path: "prisma/schema.prisma", lines: 58 },
];

const questions = [
  {
    ref: "src/orders/service.ts:88",
    text: "This line updates the order, but nothing clears the cached copy. How do you avoid showing a stale order?",
  },
  {
    ref: "src/payments/webhook.ts:31",
    text: "The handler writes to the database before it checks the Stripe signature. Why in that order?",
  },
  {
    ref: "prisma/schema.prisma:22",
    text: "There's no unique index on paymentIntentId. What stops the same payment from being saved twice?",
  },
];

const FILE_MS = 280;

type Mode = "voice" | "text";

export function RepoDemo() {
  // -1: not started, 0..files.length: files read so far
  const [read, setRead] = useState(-1);
  const done = read >= files.length;
  const [mode, setMode] = useState<Mode>("voice");
  const [speaking, setSpeaking] = useState<number | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function hear(i: number) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(questions[i]!.text);
    utterance.onend = () => setSpeaking(null);
    setSpeaking(i);
    synth.speak(utterance);
  }

  function chooseMode(m: Mode) {
    window.speechSynthesis?.cancel();
    setSpeaking(null);
    setMode(m);
  }

  useEffect(() => {
    if (read < 0 || done) return;
    const timer = setTimeout(() => setRead(read + 1), FILE_MS);
    return () => clearTimeout(timer);
  }, [read, done]);

  return (
    <figure className="rounded-3xl border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 font-mono text-sm">
          <span className="text-muted-foreground">github.com/</span>you/checkout-api
        </div>
        <button
          onClick={() => setRead(0)}
          disabled={read >= 0 && !done}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
        >
          {done ? "Read again" : read >= 0 ? "Reading…" : "Read repo"}
        </button>
      </div>
      <div aria-hidden className="mt-4 h-0.5 overflow-hidden rounded-full bg-wash/15">
        <div
          className="h-full bg-terracotta transition-[width] duration-300 ease-out"
          style={{ width: `${(Math.max(read, 0) / files.length) * 100}%` }}
        />
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        Example. Press the button to see what happens after you add a repo.
      </figcaption>

      {read >= 0 && (
        <ul className="mt-8 flex flex-col gap-1 font-mono text-xs">
          {files.map((f, i) => (
            <li
              key={f.path}
              className={cn(
                "flex justify-between transition-opacity duration-200",
                i < read ? "opacity-100" : "opacity-0",
              )}
            >
              <span>{f.path}</span>
              <span className="text-muted-foreground">{f.lines} lines</span>
            </li>
          ))}
        </ul>
      )}

      {done && (
        <div className="mt-10 animate-in fade-in duration-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Questions it asks about this repo:</p>
            <div role="radiogroup" aria-label="How you answer" className="flex rounded-full border p-0.5 text-sm">
              {(["voice", "text"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => chooseMode(m)}
                  className={cn(
                    "rounded-full px-3.5 py-1 transition-colors",
                    mode === m ? "bg-primary text-primary-foreground" : "hover:bg-wash/6",
                  )}
                >
                  {m === "voice" ? "Talk" : "Type"}
                </button>
              ))}
            </div>
          </div>
          <ol className="mt-6 flex flex-col gap-8">
            {questions.map((q, i) => (
              <li key={q.ref}>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-brand-ink">{q.ref}</span>
                  {mode === "voice" && (
                    <button
                      onClick={() => hear(i)}
                      className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Volume2 className="size-3.5" />
                      {speaking === i ? "Speaking…" : "Hear it"}
                    </button>
                  )}
                </div>
                <p className="mt-1.5 font-serif text-xl leading-relaxed">“{q.text}”</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex items-center gap-3 rounded-2xl bg-wash/6 px-4 py-3 text-sm text-muted-foreground">
            {mode === "voice" ? (
              <>
                <Mic className="size-4 shrink-0 text-brand-ink" />
                Each question is read aloud, then your mic turns on. Answer like you would in the
                room, and it follows up on what you said.
              </>
            ) : (
              <>
                <span className="font-mono text-brand-ink">_</span>
                Prefer typing? Same questions and follow-ups, answered in a text box.
              </>
            )}
          </div>
        </div>
      )}
    </figure>
  );
}
