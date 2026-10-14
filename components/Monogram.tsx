"use client";

import { useEffect, useRef } from "react";

// AG monogram: flat-topped A beside a geometric G, metallic gradient stroke on a glass tile.
// Motion (CSS in globals.css): both letters draw in together at one pen speed, hold, a sheen crosses, then the
// strokes erase and redraw, on a loop. The strokes are fully drawn in the server HTML; the loop class is added
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
    <svg ref={mark} className="mark tilt" viewBox="0 0 120 100" role="img" aria-label="AG monogram">
      <defs>
        <linearGradient id="ag-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--text)" />
          <stop offset="0.45" stopColor="var(--accent)" />
          <stop offset="0.8" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--sun)" />
        </linearGradient>
        <linearGradient id="ag-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="ag-clip">
          <rect x="1" y="1" width="118" height="98" rx="30" />
        </clipPath>
      </defs>
      <rect className="mark-bg" x="1" y="1" width="118" height="98" rx="30" />
      {/* One path per letter, as originally: the A's crossbar is a subpath, so it draws alongside the first leg. */}
      <g className="strokes" fill="none" stroke="url(#ag-stroke)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 78 L30 24 H38 L54 78 M21 60 H47" />
        <path d="M99.2 35.9 A25 25 0 1 0 105 52 H87" />
      </g>
      {/* Skew lives on a wrapper so the CSS sweep transform on the rect doesn't replace it. */}
      <g clipPath="url(#ag-clip)">
        <g transform="skewX(-18)">
          <rect className="sheen" x="-40" y="0" width="40" height="100" fill="url(#ag-sheen)" />
        </g>
      </g>
    </svg>
  );
}
