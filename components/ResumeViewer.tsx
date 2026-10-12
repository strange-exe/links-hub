"use client";

import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowsInLineHorizontalIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import ScrambleText from "@/components/ScrambleText";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "error";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;
/** Widest a page renders at 100% (fit), in CSS px. */
const MAX_PAGE_WIDTH = 860;
const pad = (n: number) => String(n).padStart(2, "0");

/** Renders one PDF page into a canvas sized for the current width and device pixel ratio. */
function PdfPage({ doc, number, cssWidth }: { doc: PDFDocumentProxy; number: number; cssWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414); // A4 until the real page size is known (avoids layout shift)

  useEffect(() => {
    let task: RenderTask | undefined;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(number);
      const base = page.getViewport({ scale: 1 });
      if (cancelled) return;
      setRatio(base.height / base.width);
      const canvas = canvasRef.current;
      if (!canvas || cssWidth <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      await task.promise.catch(() => undefined); // a cancelled render rejects; that's expected on resize/zoom
      if (!cancelled) canvas.dataset.rendered = "true";
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, cssWidth]);

  return (
    <canvas
      ref={canvasRef}
      className="pdf-canvas"
      style={{ width: cssWidth, height: cssWidth * ratio }}
      // The page is an image of text; the same text is provided to assistive tech beside it.
      aria-hidden="true"
    />
  );
}

export default function ResumeViewer({ src, fileName, title }: { src: string; fileName: string; title: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [texts, setTexts] = useState<string[]>([]);
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Load the document (and its text, for screen readers). Retry bumps `attempt`.
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | undefined;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Worker and font data are copied to versioned public paths by scripts/copy-pdfjs.mjs.
        pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/${pdfjs.version}/pdf.worker.min.mjs`;
        const task = pdfjs.getDocument({
          url: src,
          standardFontDataUrl: `/pdfjs/${pdfjs.version}/standard_fonts/`,
          enableXfa: false,
        });
        loaded = await task.promise;
        const pageTexts = await Promise.all(
          Array.from({ length: loaded.numPages }, async (_, i) => {
            const content = await (await loaded!.getPage(i + 1)).getTextContent();
            return content.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " ").trim();
          }),
        );
        if (cancelled) return;
        setDoc(loaded);
        setTexts(pageTexts);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      void loaded?.loadingTask.destroy();
    };
  }, [src, attempt]);

  // Fit-to-width follows the scroller's content width. Measured synchronously on mount, then on every resize:
  // relying on the observer's first callback alone left the width at 0 on phones (reproduced in headless
  // Chromium at 390 px; a later resize was the only thing that ever set it).
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setFitWidth(Math.min(Math.max(inner, 240), MAX_PAGE_WIDTH));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Page counter: the page most in view.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || status !== "ready") return;
    const io = new IntersectionObserver(
      (entries) => {
        const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) setCurrent(Number((best.target as HTMLElement).dataset.page));
      },
      { root: el, threshold: [0.25, 0.5, 0.75] },
    );
    el.querySelectorAll("[data-page]").forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [status, doc]);

  const zoomBy = useCallback((delta: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2)))), []);

  // Keyboard: + / - / 0, unless the visitor is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "+" || e.key === "=") zoomBy(ZOOM_STEP);
      else if (e.key === "-") zoomBy(-ZOOM_STEP);
      else if (e.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomBy]);

  // Same-origin blob from the bytes already loaded, so "Download" saves a file instead of opening a tab.
  const download = async () => {
    if (!doc) return;
    // Copy into a plain ArrayBuffer-backed array (getData may hand back a shared buffer view).
    const bytes = new Uint8Array(await doc.getData());
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pages = doc?.numPages ?? 0;
  const cssWidth = Math.round(fitWidth * zoom);

  return (
    <div className="viewer" data-state={status}>
      <header className="viewer-bar">
        {/* aria-labels keep a name when phones hide the text; they contain the visible word (WCAG 2.5.3). */}
        <Link className="vbtn" href="/" prefetch={false} aria-label="Back to links">
          <ArrowLeftIcon size={18} weight="light" aria-hidden="true" />
          <span>Links</span>
        </Link>
        <h1 className="viewer-title">
          <span className="bracket" aria-hidden="true">[ </span>
          <ScrambleText text={title} />
          <span className="bracket" aria-hidden="true"> ]</span>
        </h1>
        <div className="viewer-tools">
          <output className="readout" aria-live="polite">
            <span className="sr-only">Page </span>PG {pad(status === "ready" ? current : 0)} / {pad(pages)}
          </output>
          <div className="zoom" role="group" aria-label="Zoom">
            <button type="button" className="vbtn icon" onClick={() => zoomBy(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out">
              <MagnifyingGlassMinusIcon size={18} weight="light" aria-hidden="true" />
            </button>
            <output className="readout zoom-level" aria-live="polite">
              <span className="sr-only">Zoom </span>
              {Math.round(zoom * 100)}%
            </output>
            <button type="button" className="vbtn icon" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in">
              <MagnifyingGlassPlusIcon size={18} weight="light" aria-hidden="true" />
            </button>
            <button type="button" className="vbtn icon" onClick={() => setZoom(1)} aria-label="Fit to width">
              <ArrowsInLineHorizontalIcon size={18} weight="light" aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="vbtn primary" onClick={download} disabled={status !== "ready"} aria-label="Download resume">
            <DownloadSimpleIcon size={18} weight="bold" aria-hidden="true" />
            <span>Download</span>
          </button>
        </div>
      </header>

      <div className="viewer-scroll" ref={scrollerRef} tabIndex={0} aria-label={`${title}, document`} role="region">
        {status === "loading" && (
          <div className="pdf-stack" aria-busy="true">
            <p className="sr-only" role="status">
              Loading resume
            </p>
            {[0, 1].map((i) => (
              <div key={i} className="pdf-skeleton" style={{ width: fitWidth || "100%" }} aria-hidden="true" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="viewer-error" role="alert">
            <p className="readout">[ ERR ] COULD NOT LOAD THE PDF</p>
            <p>The resume didn&apos;t load here. You can open it directly instead.</p>
            <div className="viewer-error-actions">
              <a className="vbtn primary" href={src}>
                <ArrowSquareOutIcon size={18} weight="bold" aria-hidden="true" />
                Open the PDF
              </a>
              <button type="button" className="vbtn" onClick={() => { setStatus("loading"); setAttempt((a) => a + 1); }}>
                <ArrowClockwiseIcon size={18} weight="light" aria-hidden="true" />
                Try again
              </button>
            </div>
          </div>
        )}

        {status === "ready" && doc && (
          <div className="pdf-stack">
            {Array.from({ length: pages }, (_, i) => (
              <figure className="pdf-page" key={i} data-page={i + 1}>
                <PdfPage doc={doc} number={i + 1} cssWidth={cssWidth} />
                <figcaption className="readout">
                  PG {pad(i + 1)} / {pad(pages)}
                </figcaption>
                <div className="sr-only">{texts[i]}</div>
              </figure>
            ))}
            <p className="viewer-foot">
              <a href={src}>
                Open the original PDF <ArrowSquareOutIcon size={14} weight="light" aria-hidden="true" />
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
