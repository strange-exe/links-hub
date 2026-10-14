"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; z: number };
type Edge = { l: number; i: number; j: number; w: number };

/**
 * Decorative 3D background: a small neural network training. Five layers stand as columns from input to output and
 * sway gently in 3D. Each training step (about 6 s) a forward pass sweeps left to right in the accent colour,
 * lighting nodes by their activation; a fainter backward pass returns right to left; then the connection
 * strengths shift a little, as weights do after an update. A fine pointer leans the camera.
 *
 * Costs and guards:
 * - Canvas 2D (no three.js): about 30 nodes and 120 connections; DPR capped at 2.
 * - Runs only while the page is visible, motion isn't paused (data-motion="paused", the Pause control) and the
 *   animation clock is running; otherwise one still frame. Reduced motion: one still frame only.
 * - Colours come from the --dot and --mark tokens, re-read when the theme changes.
 * - data-field on the canvas records the state for tests: still | running.
 */
export default function Field() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");

    let w = 0, h = 0, raf = 0, start = 0;
    let ink = "237 237 237", accent = "#7c9cff";
    let aimX = 0, aimY = 0, leanX = 0, leanY = 0, last = 0;
    let layers: Node[][] = [];
    let edges: Edge[] = [];
    let act: number[][] = [];
    let step = -1;

    // Deterministic (seeded), so the still frame and tests are stable.
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    const build = () => {
      const sizes = w < 700 ? [3, 5, 6, 4, 2] : [4, 7, 8, 6, 3];
      seed = 11;
      // Each layer is a vertical column (input on the left, output on the right) with a little depth.
      layers = sizes.map((n, li) =>
        Array.from({ length: n }, (_, i) => ({
          x: (li / (sizes.length - 1)) * 2.4 - 1.2,
          y: (n === 1 ? 0 : i / (n - 1) - 0.5) * (0.25 + n * 0.11),
          z: Math.sin(i * 1.7 + li) * 0.22,
        })),
      );
      edges = [];
      for (let l = 0; l < layers.length - 1; l++)
        for (let i = 0; i < layers[l].length; i++)
          for (let j = 0; j < layers[l + 1].length; j++) edges.push({ l, i, j, w: 0.2 + rand() * 0.8 });
      step = -1;
    };
    const newStep = () => {
      act = layers.map((col) => col.map(() => 0.25 + rand() * 0.75));
      for (const e of edges) e.w = Math.max(0.1, Math.min(1, e.w + (rand() - 0.5) * 0.25)); // the "weight update"
    };

    const readColours = () => {
      const cs = getComputedStyle(root);
      ink = cs.getPropertyValue("--dot").trim() || ink;
      accent = cs.getPropertyValue("--mark").trim() || accent;
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const dot = (x: number, y: number, r: number, fill: string, alpha: number) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };

    const draw = (t: number) => {
      const T = 6200, k = Math.floor(t / T), ph = (t % T) / T;
      if (k !== step) { step = k; newStep(); }
      ctx.clearRect(0, 0, w, h);

      // Camera: a gentle sway (not a spin, so the columns stay readable), leaning toward a fine pointer.
      const ay = Math.sin(t * 0.00035) * 0.55 + leanX * 0.35, ax = 0.22 + leanY * 0.2;
      const sy = Math.sin(ay), cy = Math.cos(ay), sx = Math.sin(ax), cx = Math.cos(ax);
      const R = Math.min(Math.max(w, h) * 0.4, 820), ox = w * 0.5, oy = h * 0.52, D = 3;
      const P = layers.map((col) => col.map((n) => {
        const x1 = n.x * cy + n.z * sy, z1 = -n.x * sy + n.z * cy;
        const y2 = n.y * cx - z1 * sx, z2 = n.y * sx + z1 * cx;
        const s = D / (D + z2);
        return { x: ox + x1 * s * R, y: oy + y2 * s * R, d: Math.max(0, Math.min(1, (1 - z2) / 2)) };
      }));

      const nl = layers.length - 1;
      const fwd = ph < 0.5 ? (ph / 0.5) * nl : ph < 0.55 ? nl : -1; // forward pass position (in layers)
      const bwd = ph >= 0.55 && ph < 0.95 ? nl - ((ph - 0.55) / 0.4) * nl : -1; // backward pass position

      // Connections are batched into a few opacity buckets: one path and one stroke per bucket instead of one per
      // line (measured: 120 separate strokes halved the frame rate under a 4x CPU throttle).
      const BUCKETS = 6;
      const paths = Array.from({ length: BUCKETS }, () => new Path2D());
      for (const e of edges) {
        const a = P[e.l][e.i], b = P[e.l + 1][e.j], d = (a.d + b.d) / 2;
        const alpha = 0.04 + e.w * 0.11 + d * 0.08; // 0.04 .. 0.23
        const path = paths[Math.min(BUCKETS - 1, Math.floor(((alpha - 0.04) / 0.19) * BUCKETS))];
        path.moveTo(a.x, a.y); path.lineTo(b.x, b.y);
      }
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
      paths.forEach((path, i) => {
        ctx.strokeStyle = `rgb(${ink} / ${(0.04 + ((i + 0.5) / BUCKETS) * 0.19).toFixed(3)})`;
        ctx.stroke(path);
      });
      for (const e of edges) {
        const a = P[e.l][e.i], b = P[e.l + 1][e.j], d = (a.d + b.d) / 2;
        if (fwd >= e.l && fwd < e.l + 1) {
          const f = fwd - e.l;
          dot(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 2.2 + e.w * 1.6, accent, 0.45 + e.w * 0.55);
        }
        if (bwd > e.l && bwd <= e.l + 1) {
          const f = bwd - e.l;
          dot(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 1.3, `rgb(${ink})`, 0.2 + d * 0.4);
        }
      }
      P.forEach((col, li) => col.forEach((p, i) => {
        dot(p.x, p.y, 3.5 + p.d * 3, `rgb(${ink})`, 0.35 + p.d * 0.5);
        const lit = fwd >= li ? act[li][i] * Math.max(0, 1 - (fwd - li) * 0.35) : 0;
        if (lit > 0.05) {
          dot(p.x, p.y, 3.5 + p.d * 3, accent, lit);
          ctx.globalAlpha = lit * 0.5; ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, 7 + lit * 6, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
        }
      }));
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      leanX += (aimX - leanX) * Math.min(1, dt * 0.004);
      leanY += (aimY - leanY) * Math.min(1, dt * 0.004);
      draw(now - start);
      raf = requestAnimationFrame(frame);
    };
    const canRun = () => !reduce.matches && !document.hidden && root.dataset.motion !== "paused";
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
    // The still frame shows the forward pass mid-way, so a paused page still reads as a network training.
    const still = () => { stop(); draw(1700); cv.dataset.field = "still"; };
    const run = () => {
      if (!canRun()) return still();
      if (raf) return;
      start = performance.now();
      raf = requestAnimationFrame(frame);
      cv.dataset.field = "running";
    };

    readColours();
    size();
    still();
    // Start only once the animation clock runs (two frames fired, document.timeline advanced), as the monogram does.
    let boot = requestAnimationFrame(() => {
      boot = requestAnimationFrame(() => {
        const t = document.timeline?.currentTime;
        if (typeof t === "number" && t > 0) run();
      });
    });

    const onMove = (e: PointerEvent) => { aimX = (e.clientX / w) * 2 - 1; aimY = (e.clientY / h) * 2 - 1; };
    const onLeave = () => { aimX = aimY = 0; };
    const onResize = () => { size(); if (!raf) draw(1700); };
    const onVisibility = () => (document.hidden ? stop() : run());
    // Theme (data-theme) changes the colours; data-motion pauses and resumes.
    const prefs = new MutationObserver(() => { readColours(); if (canRun()) run(); else still(); });
    prefs.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => { readColours(); if (!raf) draw(1700); };

    if (fine.matches) {
      window.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    scheme.addEventListener("change", onScheme);
    return () => {
      cancelAnimationFrame(boot);
      stop();
      prefs.disconnect();
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      scheme.removeEventListener("change", onScheme);
    };
  }, []);

  return <canvas ref={ref} className="field" aria-hidden="true" data-testid="field" />;
}
