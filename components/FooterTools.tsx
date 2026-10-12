"use client";

import Image from "next/image";
import { CopyIcon, PauseIcon, PlayIcon, QrCodeIcon } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getMotion, getTheme, serverMotion, serverTheme, setPref, subscribe, type Theme } from "@/lib/prefs";
import { SITE_URL, profile } from "@/lib/profile";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function FooterTools() {
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const theme = useSyncExternalStore(subscribe, getTheme, serverTheme);
  const paused = useSyncExternalStore(subscribe, getMotion, serverMotion) === "paused";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (text: string, kind: "ok" | "error") => {
    setToast({ text, kind });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      show(`Copied ${profile.email}`, "ok");
    } catch {
      show(`Couldn't copy. The address is ${profile.email}`, "error");
    }
  };

  return (
    <div className="tools">
      <div className="tool-row">
        <button type="button" className="pill small" onClick={copyEmail}>
          <CopyIcon size={18} weight="light" aria-hidden="true" />
          Copy email
        </button>
        <button type="button" className="pill small" onClick={() => dialogRef.current?.showModal()}>
          <QrCodeIcon size={18} weight="light" aria-hidden="true" />
          Show QR code
        </button>
      </div>
      <p className="toast" role="status" data-kind={toast?.kind}>
        {toast?.text}
      </p>

      <div className="prefs">
        <div className="modes" role="group" aria-label="Colour mode">
          {THEMES.map((t) => (
            <button key={t.value} type="button" aria-pressed={theme === t.value} onClick={() => setPref("theme", t.value)}>
              {t.label}
            </button>
          ))}
        </div>
        {/* WCAG 2.2.2: the aurora moves for longer than 5 s, so visitors can stop it. */}
        <button type="button" className="motion" aria-pressed={paused} onClick={() => setPref("motion", paused ? "on" : "paused")}>
          {paused ? <PlayIcon size={16} weight="light" aria-hidden="true" /> : <PauseIcon size={16} weight="light" aria-hidden="true" />}
          Pause<span className="sr-only"> background animation</span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="qr-dialog"
        aria-labelledby="qr-title"
        // A click on the backdrop lands on the dialog element itself: close it.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <h2 id="qr-title">Scan to open this page</h2>
        <div className="qr-frame">
          <Image src="/qr.svg" alt={`QR code for ${SITE_URL}`} width={220} height={220} unoptimized />
        </div>
        <p className="qr-url">{SITE_URL.replace("https://", "")}</p>
        <form method="dialog">
          <button type="submit" className="pill" autoFocus>
            Close
          </button>
        </form>
      </dialog>
    </div>
  );
}
