"use client";

import { useEffect, useState } from "react";

const words = ["listens.", "reads your code.", "knows your level.", "checks your resume."];

export function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setI((n) => (n + 1) % words.length), 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Screen readers get one stable sentence instead of a changing word */}
      <span className="sr-only">listens.</span>
      <em
        key={i}
        aria-hidden
        className="inline-block text-brand-ink animate-in fade-in slide-in-from-bottom-3 duration-500"
      >
        {words[i]}
      </em>
    </>
  );
}
