/**
 * Shared motion primitives.
 *
 * Two rules from docs/pt/19 §7.6 drive this file: never drive an animation by
 * updating React state per frame, and pause work that nobody can see. Every
 * animated surface goes through these helpers so those guarantees hold in one
 * place instead of being re-implemented per component.
 */

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

/**
 * `useLayoutEffect` warns during SSR. The profile renders on the server, so use
 * the effect that exists on the current side.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Whether the viewer asked the system to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scopes a GSAP timeline to a container and reverts it on unmount, so leaving
 * the route cannot leave tweens running against detached nodes.
 *
 * Under reduced motion the builder still runs, but GSAP is told to finish
 * instantly: the end state is always applied, so the page is never left half
 * transparent or offset.
 */
export function useGsapScope(
  scope: RefObject<HTMLElement | null>,
  build: (context: gsap.Context) => void,
  deps: unknown[] = []
) {
  useIsomorphicLayoutEffect(() => {
    if (!scope.current) return;
    const reduced = prefersReducedMotion();
    const context = gsap.context((self) => {
      if (reduced) {
        // globalTimeline.timeScale would still animate; jumping the timeline to
        // its end is what actually removes the motion while keeping the result.
        gsap.defaults({ duration: 0, ease: "none" });
      }
      build(self);
    }, scope);

    return () => {
      gsap.defaults({ duration: 0.5, ease: "power2.out" });
      context.revert();
    };
  }, deps);
}

/**
 * Runs `frame` on an animation loop that is suspended whenever the element
 * leaves the viewport or the tab is hidden, and never starts under reduced
 * motion — `frame` is then called exactly once so a static composition is still
 * painted.
 *
 * Returns nothing: the caller draws into its own ref, never into React state.
 */
export function useVisibleAnimationFrame(
  target: RefObject<HTMLElement | null>,
  frame: (elapsedSeconds: number) => void
) {
  const frameRef = useRef(frame);
  // Assigned in an effect, not during render: React treats a ref written while
  // rendering as a side effect, and the loop only ever reads it from a callback.
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    if (prefersReducedMotion()) {
      frameRef.current(0);
      return;
    }

    let handle = 0;
    let running = false;
    let onScreen = false;
    let startedAt = 0;
    let elapsed = 0;

    const tick = (now: number) => {
      elapsed = (now - startedAt) / 1000;
      frameRef.current(elapsed);
      handle = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      // Resume from where the loop stopped instead of snapping the composition
      // back to zero every time the tab regains focus.
      startedAt = performance.now() - elapsed * 1000;
      handle = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(handle);
    };

    const sync = () => {
      if (onScreen && document.visibilityState === "visible") start();
      else stop();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { threshold: 0 }
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);

    // Paint one frame immediately so the surface is never blank before the
    // observer reports.
    frameRef.current(0);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [target]);
}

/**
 * Reads a CSS custom property as a concrete value.
 *
 * A canvas or WebGL context cannot interpret `var(--token)` (docs/pt/19 §2.2),
 * so anything painted outside the DOM has to resolve the token first.
 */
export function readCssVariable(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Calls `onChange` with the resolved accent whenever the active identity theme
 * changes, so a canvas repaints in the profile owner's colour instead of
 * freezing on the value it read at mount.
 */
export function useResolvedAccent(onChange: (rgb: [number, number, number]) => void) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const read = () => {
      const raw = readCssVariable("--kurage-accent-rgb", "169, 200, 192");
      const parts = raw.split(",").map((part) => Number(part.trim()));
      const rgb: [number, number, number] =
        parts.length === 3 && parts.every((n) => Number.isFinite(n))
          ? [parts[0], parts[1], parts[2]]
          : [169, 200, 192];
      handler.current(rgb);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-kurage-theme"],
    });
    return () => observer.disconnect();
  }, []);
}
