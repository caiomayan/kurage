"use client";

import React, { useCallback, useRef } from "react";
import { useResolvedAccent, useVisibleAnimationFrame } from "@/lib/motion";

/**
 * The submerged light behind a profile.
 *
 * Replaces a stack of thirteen concurrent infinite animations — three morphing
 * SVG paths, three blurred `mix-blend-screen` halos and seven particle divs —
 * with a single canvas driven by one animation frame loop. docs/pt/19 §7.6 is
 * explicit that the richness should come from form, light and movement rather
 * than from the number of filters, and §7.2 named those halos and the path
 * morphing as the things to remove.
 *
 * The composition is light filtered through a moving surface: a fixed depth
 * wash, a few caustic bands that drift and refract, and slow motes suspended in
 * the water. Nothing is blurred by the compositor and nothing blends across
 * layers, so the cost is one draw of a resolution-capped buffer per frame.
 *
 * The accent is resolved from the CSS token and re-read when the identity theme
 * changes, so the field is painted in the profile owner's colour rather than a
 * hardcoded blue.
 */

/**
 * Shafts of surface light. Each is a soft wedge that sways; drawn as a gradient
 * fill rather than a stroke, because a 1px stroke reads as a stray wire across
 * the page instead of light in water.
 */
const SHAFTS = [
  { x: 0.16, width: 0.20, tilt: -0.10, speed: 0.09, alpha: 0.055, phase: 0.0 },
  { x: 0.38, width: 0.14, tilt: 0.06, speed: 0.13, alpha: 0.040, phase: 1.9 },
  { x: 0.63, width: 0.24, tilt: -0.05, speed: 0.07, alpha: 0.050, phase: 3.4 },
  { x: 0.86, width: 0.16, tilt: 0.09, speed: 0.11, alpha: 0.035, phase: 5.1 },
];

/**
 * The rippling caustic web, confined to the top of the frame and drawn with a
 * wide, very low-alpha stroke so it glows instead of drawing a line.
 */
const RIPPLES = [
  { depth: 0.10, amplitude: 18, frequency: 1.6, speed: 0.05, width: 26, alpha: 0.030 },
  { depth: 0.19, amplitude: 24, frequency: 1.1, speed: -0.037, width: 34, alpha: 0.022 },
  { depth: 0.28, amplitude: 20, frequency: 2.2, speed: 0.029, width: 22, alpha: 0.016 },
];

const MOTES = Array.from({ length: 14 }, (_, i) => {
  // Deterministic placement: a golden-ratio walk spreads the motes without the
  // clumping that Math.random gives, and keeps every render identical.
  const golden = 0.6180339887;
  return {
    x: (i * golden) % 1,
    y: ((i * golden * 2.3) % 1) * 0.9 + 0.05,
    radius: 0.7 + ((i * 7) % 5) * 0.28,
    drift: 0.006 + ((i * 3) % 4) * 0.004,
    phase: i * 1.7,
  };
});

/** Above this the buffer stops following the device pixel ratio: a retina
 *  profile page would otherwise paint four times the pixels for a backdrop. */
const MAX_PIXEL_RATIO = 1.5;

export function ProfileDepthField() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const accentRef = useRef<[number, number, number]>([169, 200, 192]);
  const sizeRef = useRef({ width: 0, height: 0, ratio: 1 });

  useResolvedAccent((rgb) => {
    accentRef.current = rgb;
  });

  const resize = useCallback((canvas: HTMLCanvasElement) => {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const current = sizeRef.current;
    if (current.width === width && current.height === height && current.ratio === ratio) {
      return;
    }
    sizeRef.current = { width, height, ratio };
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
  }, []);

  useVisibleAnimationFrame(hostRef, (elapsed) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resize(canvas);

    const context = canvas.getContext("2d");
    if (!context) return;

    const { width, height, ratio } = sizeRef.current;
    if (width === 0 || height === 0) return;

    const [r, g, b] = accentRef.current;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    // Depth wash: brightest just under the surface, fading into the abyss.
    const wash = context.createRadialGradient(
      width * 0.5, height * 0.05, 0,
      width * 0.5, height * 0.05, Math.max(width, height) * 0.95
    );
    wash.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.13)`);
    wash.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.04)`);
    wash.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);

    // Light shafts. Fading them out by 55% of the height keeps the composition
    // in the upper frame, so nothing crosses the avatar or the reading area.
    const reach = height * 0.55;
    for (const shaft of SHAFTS) {
      const sway = Math.sin(elapsed * shaft.speed + shaft.phase) * width * 0.03;
      const topX = shaft.x * width + sway;
      const halfTop = shaft.width * width * 0.5;
      const halfBottom = halfTop * 2.1;
      const bottomX = topX + shaft.tilt * width;

      const beam = context.createLinearGradient(0, 0, 0, reach);
      beam.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${shaft.alpha})`);
      beam.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${shaft.alpha * 0.32})`);
      beam.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      context.beginPath();
      context.moveTo(topX - halfTop, -10);
      context.lineTo(topX + halfTop, -10);
      context.lineTo(bottomX + halfBottom, reach);
      context.lineTo(bottomX - halfBottom, reach);
      context.closePath();
      context.fillStyle = beam;
      context.fill();
    }

    // Ripples: wide and faint, so the surface reads as refracted light. Sampled
    // every 10px, which is a few hundred lineTo calls per frame and no path
    // parsing.
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const ripple of RIPPLES) {
      const baseY = height * ripple.depth;
      const travel = elapsed * ripple.speed;
      context.beginPath();
      for (let x = -30; x <= width + 30; x += 10) {
        const u = x / Math.max(width, 1);
        const y =
          baseY +
          Math.sin((u * ripple.frequency + travel) * Math.PI * 2) * ripple.amplitude +
          Math.sin((u * ripple.frequency * 2.7 - travel * 1.6) * Math.PI * 2) * (ripple.amplitude * 0.3);
        if (x === -30) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      const shimmer = context.createLinearGradient(0, 0, width, 0);
      shimmer.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      shimmer.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${ripple.alpha})`);
      shimmer.addColorStop(0.72, `rgba(${r}, ${g}, ${b}, ${ripple.alpha * 0.5})`);
      shimmer.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      context.strokeStyle = shimmer;
      context.lineWidth = ripple.width;
      context.stroke();
    }

    // Suspended motes, rising slowly and breathing in brightness.
    for (const mote of MOTES) {
      const y = ((mote.y - elapsed * mote.drift) % 1 + 1) % 1;
      const breath = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(elapsed * 0.6 + mote.phase));
      const sway = Math.sin(elapsed * 0.25 + mote.phase) * 8;
      context.beginPath();
      context.arc(mote.x * width + sway, y * height, mote.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${breath * 0.5})`;
      context.fill();
    }
  });

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 select-none bg-canvas"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
