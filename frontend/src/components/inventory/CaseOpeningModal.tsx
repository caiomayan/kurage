"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  PiX,
  PiLockKeyOpen,
  PiArrowsClockwise,
} from "react-icons/pi";
import { CS2Economy, CS2EconomyItem, CS2ItemType } from "@ianlucas/cs2-lib";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { RARITY_COLORS, ensureEconomyLoaded } from "@/lib/inventory/economy";
import { parseItemName, getItemImage } from "@/lib/inventory/economy-naming";

interface CaseOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CaseOpeningModal({ isOpen, onClose }: CaseOpeningModalProps) {
  const { craft } = useKurageInventory();
  ensureEconomyLoaded();

  // All official CS2 containers/cases
  const allCases = useMemo(() => {
    if (!isOpen) return [];
    ensureEconomyLoaded();
    return CS2Economy.filterItems({
      type: CS2ItemType.Container,
    });
  }, [isOpen]);

  const [selectedCase, setSelectedCase] = useState<CS2EconomyItem | null>(() => allCases[0] || null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonItem, setWonItem] = useState<CS2EconomyItem | null>(null);
  const [reelItems, setReelItems] = useState<CS2EconomyItem[]>([]);
  const reelRef = useRef<HTMLDivElement>(null);

  // When a case is selected, prepare contents
  const caseContents = useMemo(() => {
    if (!selectedCase || !selectedCase.contents) return [];
    ensureEconomyLoaded();
    return selectedCase.contents.filter(Boolean) as CS2EconomyItem[];
  }, [selectedCase]);

  // Handle case opening animation
  const handleOpenCase = () => {
    if (!selectedCase || isSpinning) return;

    setIsSpinning(true);
    setWonItem(null);

    // Pick random winner based on case contents
    const contents = caseContents;
    if (contents.length === 0) {
      setIsSpinning(false);
      return;
    }

    const winner = contents[Math.floor(Math.random() * contents.length)];

    // Generate 45 items reel with the winner positioned at index 38
    const reel: CS2EconomyItem[] = [];
    for (let i = 0; i < 45; i++) {
      if (i === 38) {
        reel.push(winner);
      } else {
        reel.push(contents[Math.floor(Math.random() * contents.length)]);
      }
    }

    setReelItems(reel);

    // Spin reel animation duration 5.5s
    setTimeout(() => {
      setIsSpinning(false);
      setWonItem(winner);

      // Add to inventory with random float
      const minW = winner.wearMin ?? 0.0;
      const maxW = winner.wearMax ?? 1.0;
      const randomWear = minW + Math.random() * (maxW - minW);

      craft(winner, {
        wear: winner.hasWear() ? parseFloat(randomWear.toFixed(6)) : undefined,
        seed: Math.floor(Math.random() * 1000),
        stattrak: Math.random() < 0.1, // 10% chance StatTrak
      });
    }, 5500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!isSpinning) onClose();
        }}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-[16px] bg-[#070b0e] border border-white/[0.1] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PiLockKeyOpen className="w-5 h-5 text-[#e5c158]" />
            <h2 className="font-display text-[18px] font-bold text-white tracking-tight">
              Simulador de Abertura de Caixa (Case Opening)
            </h2>
          </div>

          <button
            type="button"
            disabled={isSpinning}
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40"
          >
            <PiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div data-lenis-prevent className="p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto overscroll-contain min-h-0 flex-1">
          {/* Case Selector Dropdown */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-sans text-stone-400">Caixa Selecionada:</span>
              <select
                disabled={isSpinning}
                value={selectedCase?.id || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  const found = allCases.find((c) => c.id === id);
                  if (found) {
                    setSelectedCase(found);
                    setWonItem(null);
                  }
                }}
                className="h-10 px-3 rounded-[8px] bg-white/[0.04] border border-white/[0.1] text-white font-sans text-[13px] focus:outline-none focus:border-[#e5c158]/50 min-w-[260px] cursor-pointer"
              >
                {allCases.map((c) => {
                  const parsed = parseItemName(c);
                  return (
                    <option key={c.id} value={c.id} className="bg-[#0c1216]">
                      {parsed.fullName}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedCase && (
              <div className="flex items-center gap-3">
                {getItemImage(selectedCase) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getItemImage(selectedCase)!} alt={selectedCase.name} className="w-12 h-12 object-contain" />
                ) : null}
                <div className="flex flex-col">
                  <span className="font-sans font-semibold text-[14px] text-white">
                    {parseItemName(selectedCase).fullName}
                  </span>
                  <span className="text-[11px] font-sans text-stone-400">
                    {caseContents.length} skins possíveis
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── SPINNING WHEEL / REEL DISPLAY ── */}
          <div className="relative w-full h-44 rounded-[12px] bg-white/[0.015] border border-white/[0.08] overflow-hidden flex items-center justify-center">
            {/* Center Pointer Indicator */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-[#e5c158] z-30 shadow-[0_0_12px_#e5c158]" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#e5c158] z-30" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-[#e5c158] z-30" />

            {/* Horizontal Reel */}
            {isSpinning ? (
              <motion.div
                ref={reelRef}
                initial={{ x: 0 }}
                animate={{ x: -1 * (38 * 140 - 200 + Math.random() * 40 - 20) }}
                transition={{ duration: 5.5, ease: [0.1, 0.9, 0.2, 1] }}
                className="flex items-center gap-3 absolute left-1/2"
              >
                {reelItems.map((item, idx) => {
                  const rKey = item.rarityColor;
                  const rColor = RARITY_COLORS[rKey] || RARITY_COLORS.default;
                  const itemImg = getItemImage(item);
                  const parsed = parseItemName(item);

                  return (
                    <div
                      key={idx}
                      className="w-32 h-36 rounded-[8px] bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center p-2 text-center shrink-0 relative overflow-hidden"
                    >
                      <div
                        className="absolute bottom-0 inset-x-0 h-1"
                        style={{ backgroundColor: rColor.hex }}
                      />
                      {itemImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={itemImg} alt={item.name} className="h-16 object-contain drop-shadow" />
                      ) : (
                        <div className="h-16" />
                      )}
                      <span className="text-[10px] font-sans font-semibold text-white truncate w-full mt-2">
                        {parsed.skinName}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            ) : wonItem ? (
              /* Celebration Winner Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center p-4 z-20"
              >
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#11ff99] font-bold">
                  ★ Novo Item Desbloqueado!
                </span>
                {getItemImage(wonItem) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getItemImage(wonItem)!} alt={wonItem.name} className="h-20 object-contain my-2 drop-shadow-2xl" />
                )}
                <span className="font-display text-[18px] font-bold text-white">
                  {parseItemName(wonItem).fullName}
                </span>
                <span className="text-[11px] font-sans text-stone-400">
                  Adicionado automaticamente ao seu inventário ativo.
                </span>
              </motion.div>
            ) : (
              /* Idle Standby Screen */
              <div className="flex flex-col items-center gap-2 text-stone-500">
                <PiLockKeyOpen className="w-8 h-8 text-stone-600" />
                <span className="text-[13px] font-sans">
                  Pressione o botão abaixo para rodar a roleta da caixa
                </span>
              </div>
            )}
          </div>

          {/* Open Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleOpenCase}
              disabled={isSpinning}
              className="h-12 px-8 rounded-[8px] bg-[#e5c158] hover:bg-[#ebd074] text-black font-display font-bold text-[15px] shadow-[0_0_25px_rgba(229,193,88,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSpinning ? (
                <PiArrowsClockwise className="w-5 h-5 animate-spin" />
              ) : (
                <PiLockKeyOpen className="w-5 h-5" />
              )}
              <span>{isSpinning ? "Girando Roleta..." : "Abrir Caixa (Grátis)"}</span>
            </button>
          </div>

          {/* Case Contents Showcase */}
          <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
            <span className="text-[13px] font-sans font-semibold text-white">
              Itens Contidos nesta Caixa:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {caseContents.map((cItem) => {
                const rKey = cItem.rarityColor;
                const rColor = RARITY_COLORS[rKey] || RARITY_COLORS.default;
                const cImg = getItemImage(cItem);
                const parsed = parseItemName(cItem);
                return (
                  <div
                    key={cItem.id}
                    className="p-2 rounded-[6px] bg-white/[0.02] border border-white/[0.06] flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div
                      className="absolute bottom-0 inset-x-0 h-0.5"
                      style={{ backgroundColor: rColor.hex }}
                    />
                    {cImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cImg} alt={cItem.name} className="h-12 object-contain" />
                    ) : (
                      <div className="h-12" />
                    )}
                    <span className="text-[10px] font-sans text-stone-300 truncate w-full mt-1">
                      {parsed.skinName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
