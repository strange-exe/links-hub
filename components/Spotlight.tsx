"use client";

import { useEffect } from "react";

/**
 * One delegated pointer listener for two effects, batched to one update per animation frame (pointer events can
 * fire several times per frame):
 * - Spotlight: feeds --mx/--my to the `.spot` panel under the cursor; the CSS moves the glow with `transform`.
 * - Tilt: feeds --tx/--ty (-1..1, pointer position across the element) to the `.tilt` element under the cursor
 *   and resets the previous one to 0. The CSS turns them into a small perspective rotation (and a parallax shift
 *   on the featured card's contents); Pause turns it off in CSS.
 * Fine pointers only; nothing runs under reduced motion.
 */
export default function Spotlight() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    let frame = 0;
    let pending: { spot: HTMLElement | null; tilt: HTMLElement | null; x: number; y: number } | null = null;
    let tilted: HTMLElement | null = null;

    const untilt = () => {
      tilted?.style.setProperty("--tx", "0");
      tilted?.style.setProperty("--ty", "0");
      tilted = null;
    };

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { spot, tilt, x, y } = pending;
      pending = null;
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${x - r.left}px`);
        spot.style.setProperty("--my", `${y - r.top}px`);
      }
      if (tilt !== tilted) untilt();
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        tilt.style.setProperty("--tx", clamp(((x - r.left) / r.width) * 2 - 1).toFixed(3));
        tilt.style.setProperty("--ty", clamp(((y - r.top) / r.height) * 2 - 1).toFixed(3));
        tilted = tilt;
      }
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const spot = target?.closest<HTMLElement>(".spot") ?? null;
      const tilt = target?.closest<HTMLElement>(".tilt") ?? null;
      if (!spot && !tilt && !tilted) return;
      pending = { spot, tilt, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    // Leaving the window (or the page losing the pointer) settles the tilted element back to flat.
    const onLeave = () => {
      pending = null;
      untilt();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      untilt();
    };
  }, []);

  return null;
}
