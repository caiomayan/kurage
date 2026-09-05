"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";

export interface ProfileTab<T extends string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProfileTabsProps<T extends string> {
  tabs: readonly ProfileTab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

/**
 * The profile's section switcher.
 *
 * Replaces three copy-pasted buttons that each had their own selected
 * treatment — two turned white, one turned accent — with a single language for
 * selected, hover, focus and pressed, which is what docs/pt/19 §7.3 asks for.
 * The moving indicator is one GSAP tween on a single element rather than a
 * transition per button, so only the pill animates and the labels never reflow.
 *
 * Selection is not carried by colour alone: the selected tab also owns
 * `aria-selected`, and the pill sits behind text that stays legible without it.
 */
export function ProfileTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: ProfileTabsProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());

  const moveIndicator = useCallback(
    (id: T, animate: boolean) => {
      const list = listRef.current;
      const indicator = indicatorRef.current;
      const button = buttonRefs.current.get(id);
      if (!list || !indicator || !button) return;

      const target = {
        x: button.offsetLeft,
        width: button.offsetWidth,
      };

      if (!animate || prefersReducedMotion()) {
        gsap.set(indicator, { ...target, autoAlpha: 1 });
        return;
      }
      gsap.to(indicator, {
        ...target,
        autoAlpha: 1,
        duration: 0.42,
        ease: "power3.out",
      });
    },
    []
  );

  // Position without animating on mount and on resize, animate on selection.
  useEffect(() => {
    moveIndicator(active, false);
  }, [moveIndicator, active]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => moveIndicator(active, false));
    observer.observe(list);
    return () => observer.disconnect();
  }, [moveIndicator, active]);

  const select = (id: T) => {
    if (id === active) return;
    moveIndicator(id, true);
    onChange(id);
  };

  // Roving arrow-key navigation, which a tablist is expected to provide.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const order = tabs.map((tab) => tab.id);
    const index = order.indexOf(active);
    let next: T | null = null;
    if (event.key === "ArrowRight") next = order[(index + 1) % order.length];
    if (event.key === "ArrowLeft") next = order[(index - 1 + order.length) % order.length];
    if (event.key === "Home") next = order[0];
    if (event.key === "End") next = order[order.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next);
    buttonRefs.current.get(next)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--surface-card)]/80 p-1 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-1 bottom-1 rounded-lg bg-[var(--surface-elevated)] ring-1 ring-[var(--hairline-strong)] opacity-0"
      />
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) buttonRefs.current.set(tab.id, node);
              else buttonRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={`profile-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`profile-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(tab.id)}
            className={cn(
              "relative z-10 flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium sm:px-4",
              "transition-colors duration-200 outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--kurage-accent)] focus-visible:ring-offset-0",
              selected
                ? "text-[var(--ink)]"
                : "text-[var(--body)] hover:text-[var(--ink)]"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                selected ? "text-[var(--kurage-accent)]" : "text-[var(--charcoal)]"
              )}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
