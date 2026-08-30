"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1,
    });

    let animationFrameId: number | null = null;
    let isActive = false;

    function raf(time: number) {
      if (!isActive) return;
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    function start() {
      if (isActive) return;
      isActive = true;
      animationFrameId = requestAnimationFrame(raf);
    }

    function stop() {
      isActive = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
