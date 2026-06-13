import { useEffect, useRef } from "react";

interface ShortcutHandlers {
  onFocusInput?: () => void;
  onFocusSearch?: () => void;
  onGridView?: () => void;
  onListView?: () => void;
  onFocusView?: () => void;
  onShowShortcuts?: () => void;
  onFocusRoulette?: () => void;
  onSmartSplit?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const lastKey = useRef("");
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape always works, even while typing
      if (e.key === "Escape") {
        handlers.onEscape?.();
        return;
      }

      // Smart Split while focused on create input
      if (isTyping && e.ctrlKey && e.shiftKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        handlers.onSmartSplit?.();
        return;
      }

      if (isTyping) return;

      if (e.key === "?") {
        e.preventDefault();
        handlers.onShowShortcuts?.();
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handlers.onFocusInput?.();
        lastKey.current = "";
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        handlers.onFocusSearch?.();
        lastKey.current = "";
        return;
      }

      // Two-key sequences: g → b / g → l / g → f / g → r
      if (lastKey.current === "g" || lastKey.current === "G") {
        if (e.key === "b" || e.key === "B") {
          handlers.onGridView?.();
          lastKey.current = "";
          return;
        }
        if (e.key === "l" || e.key === "L") {
          handlers.onListView?.();
          lastKey.current = "";
          return;
        }
        if (e.key === "f" || e.key === "F") {
          handlers.onFocusView?.();
          lastKey.current = "";
          return;
        }
        if (e.key === "r" || e.key === "R") {
          handlers.onFocusRoulette?.();
          lastKey.current = "";
          return;
        }
      }

      lastKey.current = e.key;
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        lastKey.current = "";
      }, 600);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout.current);
    };
  }, [handlers]);
}
