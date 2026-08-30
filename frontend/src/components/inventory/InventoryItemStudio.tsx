"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { PiArrowLeft, PiCursorClick, PiSparkle, PiX } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { Inventory3DViewer } from "@/components/inventory/Inventory3DViewer";
import type { ViewerApi, ViewerItemInput } from "@/lib/inventory/viewer-api";

interface InventoryItemStudioProps {
  ariaLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  imageAlt: string;
  accentColor: string;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  actions?: ReactNode;
  viewerItem?: ViewerItemInput;
  onViewerApi?: (api: ViewerApi | null) => void;
  stageOverlay?: ReactNode;
}

export function InventoryItemStudio({
  ariaLabel,
  eyebrow,
  title,
  subtitle,
  imageUrl,
  imageAlt,
  accentColor,
  leftPanel,
  rightPanel,
  onClose,
  onBack,
  actions,
  viewerItem,
  onViewerApi,
  stageOverlay,
}: InventoryItemStudioProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[80] overflow-hidden bg-[#020303] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_45%,rgba(var(--kurage-accent-rgb),.09),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(146,188,227,.07),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#061012]/55 to-transparent" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.055]" aria-hidden="true">
        <defs><filter id="inventory-studio-blur"><feGaussianBlur stdDeviation="18" /></filter></defs>
        <path d="M-120 70 C 220 260, 420 -30, 760 150 S 1320 230, 1660 10" fill="none" stroke="var(--kurage-accent)" strokeWidth="25" filter="url(#inventory-studio-blur)" />
        <path d="M-80 690 C 280 500, 540 810, 900 620 S 1430 540, 1740 740" fill="none" stroke="#92bce3" strokeWidth="18" filter="url(#inventory-studio-blur)" />
      </svg>

      <header className="relative z-20 flex h-[72px] items-center justify-between gap-4 border-b border-white/[0.06] px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && <StudioActionButton title="Voltar ao catálogo" onClick={onBack}><PiArrowLeft /></StudioActionButton>}
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--kurage-accent)]">{eyebrow}</p>
            <h2 className="mt-1 truncate font-display text-base font-semibold text-stone-100 sm:text-lg">{title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <StudioActionButton title="Fechar" onClick={onClose}><PiX className="size-5" /></StudioActionButton>
        </div>
      </header>

      <main data-lenis-prevent className="relative z-10 grid h-[calc(100%-72px)] min-h-0 overflow-y-auto overscroll-contain lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:overflow-hidden xl:grid-cols-[330px_minmax(0,1fr)_350px]">
        <aside className="order-2 border-t border-white/[0.06] p-5 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-t-0 lg:p-7">
          {leftPanel}
        </aside>

        <section
          onPointerMove={(event) => {
            if (event.pointerType === "touch") return;
            const box = event.currentTarget.getBoundingClientRect();
            setRotation({
              x: ((event.clientY - box.top) / box.height - 0.5) * -8,
              y: ((event.clientX - box.left) / box.width - 0.5) * 12,
            });
          }}
          onPointerLeave={() => setRotation({ x: 0, y: 0 })}
          className="relative order-1 flex min-h-[50vh] items-center justify-center overflow-hidden lg:order-2 lg:min-h-0"
        >
          <div className="pointer-events-none absolute h-[44%] w-[58%] rounded-full opacity-20 blur-[100px]" style={{ backgroundColor: accentColor }} />
          <div className="relative size-full">
            {viewerItem ? (
              <Inventory3DViewer
                item={viewerItem}
                onApi={onViewerApi}
                fallback={(
                  <motion.div animate={{ rotateX: rotation.x, rotateY: rotation.y, scale: rotation.x || rotation.y ? 1.025 : 1 }} transition={{ type: "spring", stiffness: 130, damping: 20 }} style={{ transformPerspective: 1100, transformStyle: "preserve-3d" }} className="flex h-[70%] w-[86%] items-center justify-center">
                    {imageUrl ? <img src={imageUrl} alt={imageAlt} className="max-h-full max-w-full object-contain drop-shadow-[0_42px_70px_rgba(0,0,0,.8)]" /> : <PiSparkle className="size-16 text-stone-700" />}
                  </motion.div>
                )}
              />
            ) : (
              <motion.div animate={{ rotateX: rotation.x, rotateY: rotation.y, scale: rotation.x || rotation.y ? 1.025 : 1 }} transition={{ type: "spring", stiffness: 130, damping: 20 }} style={{ transformPerspective: 1100, transformStyle: "preserve-3d" }} className="flex size-full items-center justify-center">
                {imageUrl ? <img src={imageUrl} alt={imageAlt} className="max-h-[70%] max-w-[86%] object-contain drop-shadow-[0_42px_70px_rgba(0,0,0,.8)]" /> : <PiSparkle className="size-16 text-stone-700" />}
              </motion.div>
            )}
            {stageOverlay}
          </div>
          {subtitle && <p className="pointer-events-none absolute left-5 top-5 max-w-[70%] truncate text-xs text-stone-500 lg:left-7 lg:top-7">{subtitle}</p>}
          <div className="pointer-events-none absolute bottom-5 flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/35 px-3 py-1.5 text-[10px] text-stone-500 backdrop-blur-md"><PiCursorClick /> {viewerItem ? "Arraste para girar · role para aproximar" : "Mova o cursor para inspecionar"}</div>
        </section>

        <aside className="order-3 border-t border-white/[0.06] p-5 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-7">
          {rightPanel}
        </aside>
      </main>
    </motion.section>
  );
}

export function StudioActionButton({ title, onClick, active, disabled, children }: { title: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} title={title} aria-label={title} className={cn("grid size-9 shrink-0 place-items-center rounded-lg border text-stone-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-wait disabled:opacity-50", active ? "border-[var(--kurage-accent)]/35 text-[var(--kurage-accent)]" : "border-white/[0.08]")}>{children}</button>;
}
