"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; z: number };
type Pulse = { edge: number; t: number; speed: number };

/**
 * Decorative 3D background: a neuron-style network. Nodes sit in a slowly turning 3D volume (rotation about Y and
 * X, perspective projection), neighbours are linked, and blue signals travel along random links like
 * firing neurons. A fine pointer turns the network slightly toward it.
 *
 * Costs and guards:
 * - Canvas 2D (no three.js): about 90 nodes and their links; links are found once, because a rigid rotation
 *   keeps every distance the same. DPR capped at 2.
 * - Runs only while the page is visible, motion isn't paused (data-motion="paused", the Pause control) and the
 *   animation clock is running; otherwise one still frame. Reduced motion: one still frame only.
 * - Colours come from the --dot and --wipe tokens, re-read when the theme changes.
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

    let w = 0, h = 0, raf = 0, start = 0, last = 0;
    let ink = "237 237 237", signal = "#7c9cff";
    let aimX = 0, aimY = 0, tiltX = 0, tiltY = 0;
    let nodes: Node[] = [];
    let edges: [number, number][] = [];
    let pulses: Pulse[] = [];

    // Deterministic layout (seeded), so the still frame and tests are stable.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    const build = () => {
      const count = w < 700 ? 56 : 92;
      seed = 7;
      nodes = Array.from({ length: count }, () => {
        // Points in a flattened ellipsoid, denser towards the middle.
        const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.cbrt(rand());
        const s = Math.sqrt(1 - u * u);
        return { x: r * s * Math.cos(th) * 1.25, y: r * u * 0.8, z: r * s * Math.sin(th) };
      });
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        const near = nodes
          .map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 + (n.z - nodes[i].z) ** 2 }))
          .filter((o) => o.j > i && o.d < 0.16)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3);
        for (const o of near) edges.push([i, o.j]);
      }
      pulses = Array.from({ length: 6 }, () => ({ edge: Math.floor(rand() * edges.length), t: rand(), speed: 0.25 + rand() * 0.35 }));
    };

    const readColours = () => {
      const cs = getComputedStyle(root);
      ink = cs.getPropertyValue("--dot").trim() || ink;
      signal = cs.getPropertyValue("--wipe").trim() || signal;
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(Math.max(w, h) * 0.42, 620);
      const cx = w < 1024 ? w * 0.5 : w * 0.62, cy = h * 0.48;
      const ay = t * 0.00006 + tiltX * 0.5, ax = 0.35 + tiltY * 0.35;
      const sinY = Math.sin(ay), cosY = Math.cos(ay), sinX = Math.sin(ax), cosX = Math.cos(ax);
      const D = 2.6;
      const P = nodes.map((n) => {
        const x1 = n.x * cosY + n.z * sinY, z1 = -n.x * sinY + n.z * cosY;
        const y2 = n.y * cosX - z1 * sinX, z2 = n.y * sinX + z1 * cosX;
        const s = D / (D + z2);
        return { x: cx + x1 * s * R, y: cy + y2 * s * R, depth: (1 - z2) / 2, s };
      });
      ctx.lineWidth = 1;
      for (const [a, b] of edges) {
        const d = (P[a].depth + P[b].depth) / 2;
        ctx.strokeStyle = `rgb(${ink} / ${(0.04 + d * 0.16).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
      }
      for (const p of P) {
        const r = 1 + p.depth * 1.8;
        ctx.fillStyle = `rgb(${ink} / ${(0.18 + p.depth * 0.5).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = signal;
      for (const q of pulses) {
        const [a, b] = edges[q.edge] ?? [0, 0];
        const x = P[a].x + (P[b].x - P[a].x) * q.t, y = P[a].y + (P[b].y - P[a].y) * q.t;
        ctx.globalAlpha = 0.35 + ((P[a].depth + P[b].depth) / 2) * 0.65;
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      tiltX += (aimX - tiltX) * Math.min(1, dt * 0.004);
      tiltY += (aimY - tiltY) * Math.min(1, dt * 0.004);
      if (!edges.length) return;
      for (const q of pulses) {
        q.t += (dt / 1000) * q.speed;
        if (q.t >= 1) {
          // Fire onward from the node it reached, so signals travel through the network.
          const [, end] = edges[q.edge];
          const next = edges.map((e, i) => ({ e, i })).filter(({ e }) => e[0] === end || e[1] === end);
          const pick = next.length ? next[Math.floor(rand() * next.length)] : { i: Math.floor(rand() * edges.length), e: edges[0] };
          if (pick.e[1] === end) edges[pick.i] = [pick.e[1], pick.e[0]];
          q.edge = pick.i; q.t = 0;
        }
      }
    };
    const frame = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      step(dt);
      draw(now - start);
      raf = requestAnimationFrame(frame);
    };
    const canRun = () => !reduce.matches && !document.hidden && root.dataset.motion !== "paused";
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
    const still = () => { stop(); draw(0); cv.dataset.field = "still"; };
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
    const onResize = () => { size(); if (!raf) draw(0); };
    const onVisibility = () => (document.hidden ? stop() : run());
    // Theme (data-theme) changes the colours; data-motion pauses and resumes.
    const prefs = new MutationObserver(() => { readColours(); if (canRun()) run(); else still(); });
    prefs.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => { readColours(); if (!raf) draw(0); };

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
