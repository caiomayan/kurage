"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PiArrowsOut, PiArrowCounterClockwise, PiCheck, PiMinus, PiPlus, PiX } from "react-icons/pi";
import { cn } from "@/lib/utils";

export type AvatarCrop = {
  zoom: number;
  positionX: number;
  positionY: number;
};

interface AvatarCropDialogProps {
  imageUrl: string;
  sourceLabel: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (crop: AvatarCrop) => void;
}

const INITIAL_CROP: AvatarCrop = { zoom: 1, positionX: 0, positionY: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AvatarCropDialog({ imageUrl, sourceLabel, isSaving, onCancel, onSave }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<AvatarCrop>(INITIAL_CROP);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; crop: AvatarCrop } | null>(null);

  const updatePosition = (positionX: number, positionY: number) => {
    setCrop((current) => ({
      ...current,
      positionX: clamp(positionX, -1, 1),
      positionY: clamp(positionY, -1, 1),
    }));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isSaving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, crop };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    // Moving the image right reveals its left side, hence the inverse crop origin.
    updatePosition(start.crop.positionX + (event.clientX - start.x) / 124, start.crop.positionY + (event.clientY - start.y) / 124);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
  };

  const imageTranslateX = crop.positionX * (crop.zoom - 1) * 48;
  const imageTranslateY = crop.positionY * (crop.zoom - 1) * 48;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#020507]/90 backdrop-blur-md"
        onClick={() => !isSaving && onCancel()}
      />

      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        role="dialog"
        className="relative z-10 w-full max-w-[31rem] overflow-hidden rounded-[14px] border border-white/[0.1] bg-[#070b0e] shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 id="avatar-crop-title" className="text-[15px] font-semibold text-white">Ajustar enquadramento</h2>
            <p className="mt-1 text-xs text-stone-400">Arraste a foto e use o zoom. A área circular será seu avatar.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cancelar recorte"
            className="rounded-[6px] p-2 text-stone-400 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PiX className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5">
          <div
            className="relative mx-auto aspect-square w-full max-w-[360px] touch-none select-none overflow-hidden rounded-[10px] bg-[#020507] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* Native img is intentional: the cropper must support a temporary browser object URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={sourceLabel}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{
                objectPosition: `${50 - crop.positionX * 50}% ${50 - crop.positionY * 50}%`,
                transform: `translate(${imageTranslateX}%, ${imageTranslateY}%) scale(${crop.zoom})`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_49.5%,rgba(2,5,7,0.66)_50%,rgba(2,5,7,0.82)_100%)]" />
            <div className="pointer-events-none absolute inset-[8%] rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="mt-[calc(100%+1.9rem)] inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/50 px-2.5 py-1 text-[11px] text-stone-300 backdrop-blur-sm">
                <PiArrowsOut className="h-3.5 w-3.5" /> Arraste para reposicionar
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-[8px] border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-stone-300">Zoom</span>
              <span className="font-mono text-stone-500">{crop.zoom.toFixed(2)}×</span>
            </div>
            <div className="flex items-center gap-3">
              <PiMinus className="h-4 w-4 shrink-0 text-stone-500" />
              <input
                aria-label="Zoom do avatar"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={crop.zoom}
                onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
                disabled={isSaving}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.14] accent-[var(--kurage-accent)] disabled:cursor-not-allowed"
              />
              <PiPlus className="h-4 w-4 shrink-0 text-stone-500" />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCrop(INITIAL_CROP)}
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium text-stone-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PiArrowCounterClockwise className="h-4 w-4" />
              Redefinir
            </button>
            <button
              type="button"
              onClick={() => onSave(crop)}
              disabled={isSaving}
              className={cn("inline-flex h-10 items-center gap-2 rounded-[6px] bg-white px-4 text-[13px] font-medium text-black transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50")}
            >
              <PiCheck className="h-4 w-4" />
              {isSaving ? "Salvando…" : "Usar este recorte"}
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
