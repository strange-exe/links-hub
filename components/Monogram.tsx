"use client";

import { useEffect, useRef } from "react";

// AG monogram: flat-topped A beside a geometric G, a plain stroke in the text colour.
// Motion (CSS in globals.css): both letters draw in together at one pen speed, hold, then the strokes erase and
// redraw, on a loop. The strokes are fully drawn in the server HTML; the loop class is added
// only once the browser's animation clock is running (two frames fired and document.timeline has advanced): on a
// cold start the clock stalled for 1-3 s, and a draw-in starting from hidden strokes showed an empty tile.
// Reduced motion skips it; the Pause control stops it with the mark fully drawn (CSS, so it follows toggles).
export default function Monogram() {
  const mark = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = mark.current;
    if (!svg) return;
    // data-draw records the decision (tests wait on it): skip-motion | skip-clock | looping
    const set = (state: string) => (svg.dataset.draw = state);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void set("skip-motion");

    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const t = document.timeline?.currentTime;
        if (typeof t !== "number" || t <= 0) return void set("skip-clock"); // clock not running: keep the static mark
        svg.classList.add("looping");
        set("looping");
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      svg.classList.remove("looping");
    };
  }, []);

  return (
    // viewBox cropped to the letters (no tile since the 2026-10-15 redesign).
    <svg ref={mark} className="mark" viewBox="8 18 104 66" role="img" aria-label="AG monogram">
      {/* One path per letter: the A's crossbar is a subpath, so it draws alongside the first leg. */}
      <g className="strokes">
        <path d="M14 78 L30 24 H38 L54 78 M21 60 H47" />
        <path d="M99.2 35.9 A25 25 0 1 0 105 52 H87" />
      </g>
    </svg>
  );
}
