// Visitor preferences live as data attributes on <html> (set before paint by the script in layout.tsx)
// and in localStorage. Components read them with useSyncExternalStore, so the DOM is the single source of truth.

export type Theme = "system" | "light" | "dark";
export type Motion = "on" | "paused";

const DEFAULTS = { theme: "system", motion: "on" } as const;
type Key = keyof typeof DEFAULTS;

export function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
  return () => observer.disconnect();
}

export const getTheme = (): Theme => (document.documentElement.dataset.theme as Theme | undefined) ?? "system";
export const getMotion = (): Motion => (document.documentElement.dataset.motion as Motion | undefined) ?? "on";
export const serverTheme = (): Theme => "system";
export const serverMotion = (): Motion => "on";

export function setPref(key: Key, value: string) {
  const root = document.documentElement;
  const isDefault = value === DEFAULTS[key];
  if (isDefault) delete root.dataset[key];
  else root.dataset[key] = value;
  try {
    if (isDefault) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode): the choice still applies for this visit.
  }
}
