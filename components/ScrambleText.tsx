"use client";

import { useEffect, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>";
const TICK_MS = 40;

/**
 * Port of Aceternity UI's "Encrypted Text" idea, reimplemented without dependencies: characters show as
 * random glyphs and resolve left to right on mount. Assistive tech always gets the real text (the animated
 * copy is aria-hidden), and reduced motion or a paused page shows the final text immediately.
 */
export default function ScrambleText({ text, durationMs = 800 }: { text: string; durationMs?: number }) {
  const [shown, setShown] = useState(text); // server render and no-JS show the real text

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || document.documentElement.dataset.motion === "paused") return;
    const steps = Math.max(1, Math.round(durationMs / TICK_MS));
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      const solved = Math.floor((step / steps) * text.length);
      setShown(
        [...text]
          .map((ch, i) => (i < solved || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (step >= steps) {
        window.clearInterval(id);
        setShown(text);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [text, durationMs]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="scramble">
        {shown}
      </span>
    </>
  );
}
