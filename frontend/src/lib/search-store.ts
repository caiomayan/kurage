"use client";

import { useEffect } from "react";

// Event bus for global search focus
type Listener = () => void;
const listeners = new Set<Listener>();

export const searchEvents = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emitFocus: () => {
    listeners.forEach((listener) => listener());
  },
};

/**
 * Global Keyboard Shortcut hook (⌘K / Ctrl+K / slash)
 */
export function useSearchShortcut() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchEvents.emitFocus();
        return;
      }

      if (event.key === "/" && !isInput) {
        event.preventDefault();
        searchEvents.emitFocus();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
