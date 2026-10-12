"use client";

import { useEffect, useRef } from "react";

// AG monogram: flat-topped A beside a geometric G, metallic gradient stroke on a glass tile.
// The strokes are fully drawn in the server HTML. The draw-in is an enhancement added only once the browser's
// animation clock is running (two frames fired and document.timeline has advanced): on a cold start the clock
// stalled for 1-3 s, and a draw-in starting from hidden strokes showed an empty tile. It is skipped under reduced
// motion and when the visitor paused animation, and the class is removed when the draw finishes, so the resting
// state never depends on an animation. A light sheen crosses after the draw and on hover (CSS in globals.css).
export default function Monogram() {
  const strokes = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = strokes.current;
    if (!g) return;
    // data-draw records the decision (tests wait on it): skip-motion | skip-paused | skip-clock | drawing | done
    const set = (state: string) => (g.dataset.draw = state);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void set("skip-motion");
    if (document.documentElement.dataset.motion === "paused") return void set("skip-paused");

    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const t = document.timeline?.currentTime;
        if (typeof t !== "number" || t <= 0) return void set("skip-clock"); // clock not running: keep the static mark
        set("drawing");
        g.classList.add("drawing");
      });
    });
    const done = (e: AnimationEvent) => {
      if (e.animationName !== "draw" || e.target !== g.lastElementChild) return;
      g.classList.remove("drawing");
      set("done");
    };
    g.addEventListener("animationend", done);
    return () => {
      cancelAnimationFrame(raf);
      g.removeEventListener("animationend", done);
      g.classList.remove("drawing");
    };
  }, []);

  return (
    <svg className="mark" viewBox="0 0 120 100" role="img" aria-label="AG monogram">
      <defs>
        <linearGradient id="ag-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--text)" />
          <stop offset="0.45" stopColor="var(--accent)" />
          <stop offset="0.8" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--sun)" />
        </linearGradient>
        {/* The A's crossbar is a horizontal line with a zero-height bounding box, which an objectBoundingBox
            gradient cannot paint. This copy maps the same stops onto the A's box (x 14-54, y 24-78) in user
            space, so both A paths keep the colours the single A path had. */}
        <linearGradient id="ag-stroke-a" href="#ag-stroke" gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(40 0 0 54 14 24)" x1="0" y1="0" x2="1" y2="1" />
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
      {/* pathLength="1" normalises each path, so the dash maths needs no measured lengths. The A's crossbar is its
          own path: dash patterns restart at every subpath, so in one path it drew alongside the first leg. The G
          stays last: its animationend ends the draw. */}
      <g ref={strokes} fill="none" stroke="url(#ag-stroke)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path pathLength={1} stroke="url(#ag-stroke-a)" d="M14 78 L30 24 H38 L54 78" />
        <path pathLength={1} stroke="url(#ag-stroke-a)" d="M21 60 H47" />
        <path pathLength={1} d="M99.2 35.9 A25 25 0 1 0 105 52 H87" />
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
