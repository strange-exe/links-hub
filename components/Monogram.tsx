import type { CSSProperties } from "react";

// AG monogram: flat-topped A beside a geometric G, metallic gradient stroke on a glass tile.
// Strokes draw in on load and a light sheen crosses on hover (CSS in globals.css, off under reduced motion).
export default function Monogram() {
  return (
    <svg className="mark" viewBox="0 0 120 100" role="img" aria-label="AG monogram">
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
      <g fill="none" stroke="url(#ag-stroke)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw" style={{ "--len": 140 } as CSSProperties} d="M14 78 L30 24 H38 L54 78 M21 60 H47" />
        <path className="draw" style={{ "--len": 160 } as CSSProperties} d="M99.2 35.9 A25 25 0 1 0 105 52 H87" />
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
