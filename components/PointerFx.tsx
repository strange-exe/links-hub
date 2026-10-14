"use client";

import { useEffect } from "react";

/**
 * One delegated pointer listener for two effects, batched to one update per animation frame (pointer events can
 * fire several times per frame):
 * - Tilt: feeds --tx/--ty (-1..1, pointer position across the element) to the `.tilt` element under the cursor
 *   and resets the previous one to 0. The CSS turns them into a small perspective rotation.
 * - Magnet: while the pointer is within 40 px of a `.magnet` element, feeds --mx/--my (px, clamped to 8 / 6) so
 *   it leans toward the cursor; it settles back when the pointer leaves.
 * Pause turns both off in CSS. Fine pointers only; nothing runs under reduced motion.
 */
export default function PointerFx() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    let frame = 0;
    let pending: { tilt: HTMLElement | null; x: number; y: number } | null = null;
    let tilted: HTMLElement | null = null;
    const magnets = [...document.querySelectorAll<HTMLElement>(".magnet")];

    const untilt = () => {
      tilted?.style.setProperty("--tx", "0");
      tilted?.style.setProperty("--ty", "0");
      tilted = null;
    };
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { tilt, x, y } = pending;
      pending = null;
      if (tilt !== tilted) untilt();
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        tilt.style.setProperty("--tx", clamp(((x - r.left) / r.width) * 2 - 1, 1).toFixed(3));
        tilt.style.setProperty("--ty", clamp(((y - r.top) / r.height) * 2 - 1, 1).toFixed(3));
        tilted = tilt;
      }
      for (const m of magnets) {
        const r = m.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
        const near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 40;
        m.style.setProperty("--mx", near ? `${clamp(dx * 0.18, 8).toFixed(1)}px` : "0px");
        m.style.setProperty("--my", near ? `${clamp(dy * 0.3, 6).toFixed(1)}px` : "0px");
      }
    };

    const onMove = (e: PointerEvent) => {
      pending = { tilt: (e.target as Element | null)?.closest<HTMLElement>(".tilt") ?? null, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    // Leaving the window settles everything back.
    const onLeave = () => {
      pending = null;
      untilt();
      for (const m of magnets) { m.style.setProperty("--mx", "0px"); m.style.setProperty("--my", "0px"); }
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      onLeave();
    };
  }, []);

  return null;
}
