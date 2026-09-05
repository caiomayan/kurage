"use client";

import React from "react";
import { PiArrowUpRight, PiClockCounterClockwise, PiX } from "react-icons/pi";
import { cn } from "@/lib/utils";
import type { RecentSearch } from "@/lib/search-history";
import type { SearchShortcut } from "@/lib/search-shortcuts";

interface SearchEmptyStateProps {
  recents: RecentSearch[];
  shortcuts: SearchShortcut[];
  onPickRecent: (term: string) => void;
  onForgetRecent: (term: string) => void;
  onClearRecents: () => void;
  onPickShortcut: (href: string) => void;
}

/**
 * What the search panel shows before anything is typed.
 *
 * docs/pt/19 §8: private, erasable recents plus real destinations. Everything
 * here is already in memory when the panel opens — no request is made, because
 * suggestions must not make opening the box expensive or block typing.
 *
 * There is deliberately no "most searched" list. §8 permits one only with real
 * collection, a time window, a minimum sample and anti-manipulation, and forbids
 * fabricating popularity while traffic is small. Publishing terms other people
 * typed would also expose their words, which the same section rules out.
 */
export function SearchEmptyState({
  recents,
  shortcuts,
  onPickRecent,
  onForgetRecent,
  onClearRecents,
  onPickShortcut,
}: SearchEmptyStateProps) {
  return (
    <div className="flex flex-col gap-4">
      {recents.length > 0 && (
        <section aria-labelledby="search-recents-heading">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <h2
              id="search-recents-heading"
              className="text-[10px] font-semibold uppercase tracking-widest text-[var(--body)]"
            >
              Buscas recentes
            </h2>
            <button
              type="button"
              onClick={onClearRecents}
              className="rounded px-1.5 py-0.5 text-[11px] text-[var(--charcoal)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--kurage-accent)]"
            >
              Limpar
            </button>
          </div>

          <ul className="flex flex-col">
            {recents.map((recent) => (
              <li key={recent.term} className="group/recent flex items-center">
                <button
                  type="button"
                  onClick={() => onPickRecent(recent.term)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left",
                    "transition-colors hover:bg-[var(--surface-elevated)]",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--kurage-accent)]"
                  )}
                >
                  <PiClockCounterClockwise
                    className="h-3.5 w-3.5 shrink-0 text-[var(--charcoal)]"
                    aria-hidden
                  />
                  <span className="truncate text-[13px] text-[var(--body)]">{recent.term}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onForgetRecent(recent.term)}
                  aria-label={`Remover "${recent.term}" das buscas recentes`}
                  className={cn(
                    "ml-1 rounded p-1.5 text-[var(--charcoal)] transition-colors",
                    "hover:text-[var(--ink)] focus-visible:outline-none",
                    "focus-visible:ring-1 focus-visible:ring-[var(--kurage-accent)]",
                    // Revealed on hover, but always reachable by keyboard.
                    "opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100"
                  )}
                >
                  <PiX className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="search-shortcuts-heading">
        <h2
          id="search-shortcuts-heading"
          className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--body)]"
        >
          Ir para
        </h2>
        <ul className="flex flex-col">
          {shortcuts.map((shortcut) => (
            <li key={shortcut.id}>
              <button
                type="button"
                onClick={() => onPickShortcut(shortcut.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
                  "transition-colors hover:bg-[var(--surface-elevated)]",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--kurage-accent)]"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                    {shortcut.label}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--charcoal)]">
                    {shortcut.hint}
                  </span>
                </span>
                <PiArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-[var(--charcoal)]"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {recents.length === 0 && (
        <p className="px-1 pb-1 text-[11px] text-[var(--charcoal)]">
          Busque por jogadores, times ou um Kurage ID.
        </p>
      )}
    </div>
  );
}
