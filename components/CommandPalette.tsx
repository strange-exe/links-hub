"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMotion, setPref } from "@/lib/prefs";
import { featured, groups, profile } from "@/lib/profile";

/** Asks FooterTools to run one of its actions, so their feedback (toast, dialog) lives in one place. */
export const TOOLS_EVENT = "tools:run";
export type ToolAction = "copy-email" | "qr";

type Command = { id: string; label: string; detail: string } & ({ href: string } | { run: () => void });

const runTool = (action: ToolAction) => window.dispatchEvent(new CustomEvent<ToolAction>(TOOLS_EVENT, { detail: action }));

const COMMANDS: Command[] = [
  { id: "resume", label: "Open resume", detail: "page", href: "/resume/" },
  { id: "email", label: "Email Abhinesh", detail: profile.email, href: `mailto:${profile.email}` },
  { id: "copy", label: "Copy email address", detail: "action", run: () => runTool("copy-email") },
  { id: "demo", label: `${featured.title}: live demo`, detail: "project", href: featured.live },
  { id: "source", label: `${featured.title}: source`, detail: "project", href: featured.source },
  ...groups.flatMap((g) => g.links.map((l) => ({ id: l.key, label: l.label, detail: l.handle, href: l.href }))),
  { id: "qr", label: "Show QR code", detail: "action", run: () => runTool("qr") },
  { id: "light", label: "Theme: light", detail: "action", run: () => setPref("theme", "light") },
  { id: "dark", label: "Theme: dark", detail: "action", run: () => setPref("theme", "dark") },
  { id: "system", label: "Theme: system", detail: "action", run: () => setPref("theme", "system") },
  {
    id: "motion",
    label: "Pause or resume motion",
    detail: "action",
    run: () => setPref("motion", getMotion() === "paused" ? "on" : "paused"),
  },
];

const TYPED = ["open resume", "email abhinesh", "view revlens-ai", "open github"];

/**
 * The command bar in the identity sheet and the command menu it opens (also Ctrl/Cmd+K).
 * - Menu: a native <dialog> (modal focus containment, Escape, focus returns to the opener) holding a WAI-ARIA APG
 *   combobox (the input) that owns a listbox through aria-activedescendant. Up/Down/Home/End move, Enter runs.
 * - Only Ctrl/Cmd+K is a global shortcut: single-letter shortcuts would fail WCAG 2.1.4 (no way to turn them off).
 * - The bar's typed text is decorative and written straight to the DOM (no React render per letter); it only
 *   types while motion runs (not paused, no reduced motion, tab visible).
 */
export default function CommandPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => `${c.label} ${c.detail}`.toLowerCase().includes(q)) : COMMANDS;
  }, [query]);
  const current = Math.min(active, shown.length - 1);

  const open = useCallback(() => {
    setQuery("");
    setActive(0);
    dialog.current?.showModal();
    input.current?.focus();
  }, []);
  const run = (c: Command) => {
    dialog.current?.close();
    if ("run" in c) c.run();
    else window.location.href = c.href;
  };

  // Ctrl/Cmd+K toggles the menu from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    document.getElementById(`cmd-${current}`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  // Decorative typing in the command bar.
  useEffect(() => {
    const el = typed.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let word = 0, chars = TYPED[0].length, dir = -1, hold = 20;
    const id = window.setInterval(() => {
      if (reduce.matches || getMotion() === "paused" || document.hidden) return;
      if (hold > 0) return void hold--;
      chars += dir;
      if (chars <= 0) { dir = 1; word = (word + 1) % TYPED.length; }
      if (chars >= TYPED[word].length) { dir = -1; hold = 24; }
      el.textContent = TYPED[word].slice(0, Math.max(chars, 0));
    }, 70);
    return () => window.clearInterval(id);
  }, []);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = shown.length;
    if (!n) return;
    const move: Record<string, number> = { ArrowDown: (current + 1) % n, ArrowUp: (current - 1 + n) % n, Home: 0, End: n - 1 };
    if (e.key in move) {
      e.preventDefault();
      setActive(move[e.key]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(shown[current]);
    }
  };

  return (
    <>
      <button type="button" className="cmd" onClick={open} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
        <span aria-hidden="true">&gt;</span>
        <span className="typed" ref={typed} aria-hidden="true">
          {TYPED[0]}
        </span>
        <span className="caret" aria-hidden="true" />
        <span className="sr-only">Open command menu</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialog}
        className="palette"
        aria-label="Command menu"
        // A click on the backdrop lands on the dialog element itself: close it.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="palette-in">
          <MagnifyingGlassIcon size={18} weight="regular" aria-hidden="true" />
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            aria-autocomplete="list"
            aria-activedescendant={shown.length ? `cmd-${current}` : undefined}
            aria-label="Search commands"
            placeholder="Type a command or a profile"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
          />
          <kbd aria-hidden="true">Esc</kbd>
        </div>
        <ul id="cmd-list" role="listbox" aria-label="Commands">
          {shown.length ? (
            shown.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${i}`}
                role="option"
                aria-selected={i === current}
                onMouseMove={() => i !== current && setActive(i)}
                onClick={() => run(c)}
              >
                <span>{c.label}</span>
                <span className="detail">{c.detail}</span>
              </li>
            ))
          ) : (
            <li className="empty" role="option" aria-selected="false" aria-disabled="true">
              No match. Try resume, email or GitHub.
            </li>
          )}
        </ul>
        <p className="palette-hint" aria-hidden="true">
          <span>Up/Down to move</span>
          <span>Enter to open</span>
        </p>
      </dialog>
    </>
  );
}
