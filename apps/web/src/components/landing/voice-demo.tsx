"use client";

import { cn } from "@roleproof/ui/lib/utils";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Line = {
  time: string;
  who: "Interviewer" | "You";
  text: string;
  // Part of the candidate's answer that the next question picks up on
  trigger?: string;
  // Why the interviewer asked this, shown under the question
  note?: string;
};

const lines: Line[] = [
  {
    time: "00:04",
    who: "Interviewer",
    text: "Tell me about the payment webhook you built at your last job.",
  },
  {
    time: "00:09",
    who: "You",
    text: "It receives events from Stripe, saves them to Postgres, and if processing fails we just retry it a few times.",
    trigger: "we just retry it a few times",
  },
  {
    time: "00:21",
    who: "Interviewer",
    text: "You said you just retry. What stops a retried event from charging the customer twice?",
    note: "Follows up on “we just retry it a few times”",
  },
  {
    time: "00:30",
    who: "You",
    text: "Every event has an ID. We store the ones we've processed, so a duplicate gets skipped.",
    trigger: "We store the ones we've processed",
  },
  {
    time: "00:41",
    who: "Interviewer",
    text: "Good. And if two copies of the same event arrive at the same moment, before either is stored?",
    note: "Answer was solid, so it goes one level deeper",
  },
];

// Fixed bar heights in whole percents, so server and client render identical styles
const WAVE = Array.from({ length: 56 }, (_, i) =>
  Math.round(25 + 75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45))),
);

function Text({ line }: { line: Line }) {
  if (!line.trigger) return <>{line.text}</>;
  const [before, after] = line.text.split(line.trigger);
  return (
    <>
      {before}
      <span className="underline decoration-terracotta decoration-2 underline-offset-4">{line.trigger}</span>
      {after}
    </>
  );
}

export function VoiceDemo() {
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);
  // Bumped on every play/stop so callbacks from a cancelled run are ignored
  const run = useRef(0);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function stop() {
    run.current++;
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  function speak(i: number, id: number) {
    if (id !== run.current) return;
    if (i >= lines.length) {
      setPlaying(false);
      setCurrent(-1);
      return;
    }
    setCurrent(i);
    const line = lines[i]!;
    const next = () => setTimeout(() => speak(i + 1, id), 450);

    const synth = window.speechSynthesis;
    if (!synth) {
      setTimeout(next, line.text.length * 55);
      return;
    }
    const voices = synth.getVoices().filter((v) => v.lang.startsWith("en"));
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.voice = (line.who === "Interviewer" ? voices[0] : voices[1]) ?? null;
    utterance.rate = 1.02;
    utterance.onend = next;
    synth.speak(utterance);
  }

  function playFrom(i: number) {
    stop();
    const id = ++run.current;
    setPlaying(true);
    speak(i, id);
  }

  const progress = current < 0 ? 0 : (current + 1) / lines.length;

  return (
    <figure className="rounded-3xl border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => (playing ? stop() : playFrom(current < 0 ? 0 : current))}
          aria-label={playing ? "Pause example interview" : "Play example interview"}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </button>
        <div aria-hidden className="flex h-10 flex-1 items-center gap-0.75 overflow-hidden">
          {WAVE.map((h, i) => {
            const filled = i / WAVE.length < progress;
            return (
              <span
                key={i}
                className={cn(
                  "w-0.75 shrink-0 rounded-full transition-colors duration-300",
                  filled ? "bg-terracotta" : "bg-wash/25",
                  playing && filled && i / WAVE.length > progress - 1 / lines.length && "level-bar",
                )}
                style={{ height: `${h}%`, animationDelay: `${(i % 7) * 90}ms` }}
              />
            );
          })}
        </div>
      </div>
      <figcaption className="mt-4 text-xs text-muted-foreground">
        Example interview · Backend engineer, mid-level · press play or click a line
      </figcaption>

      <ol className="mt-8 flex flex-col gap-2">
        {lines.map((line, i) => (
          <li key={line.time}>
            <button
              onClick={() => playFrom(i)}
              className={cn(
                "grid w-full grid-cols-[3.25rem_1fr] gap-x-4 rounded-2xl px-3 py-3 text-left transition-all duration-300 sm:grid-cols-[3.25rem_6rem_1fr]",
                i === current ? "bg-wash/8" : "hover:bg-wash/5",
                playing && i !== current && "opacity-40",
              )}
            >
              <span className="pt-1 font-mono text-xs text-muted-foreground">{line.time}</span>
              <span className="pt-0.5 text-sm text-muted-foreground max-sm:col-start-2">{line.who}</span>
              <span className="max-sm:col-start-2">
                <span className={cn("block leading-relaxed", line.who === "Interviewer" && "font-serif text-xl")}>
                  <Text line={line} />
                </span>
                {line.note && <span className="mt-1.5 block text-xs text-brand-ink">↳ {line.note}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </figure>
  );
}
