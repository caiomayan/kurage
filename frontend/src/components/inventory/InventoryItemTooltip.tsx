"use client";

import React from "react";
import {
  CS2Economy,
  CS2EconomyItem,
  CS2InventoryItem,
  CS2Team,
} from "@ianlucas/cs2-lib";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { WEAR_NAMES } from "@/lib/inventory/economy";
import { parseItemName } from "@/lib/inventory/economy-naming";
import { PiSticker, PiSparkle, PiTag } from "react-icons/pi";

interface InventoryItemTooltipProps {
  itemData: TransformedInventoryItem;
}

export function InventoryItemTooltip({ itemData }: InventoryItemTooltipProps) {
  const { item, rarityColor, rarityName, wearName, isEquippedCT, isEquippedT, hasStickers, hasKeychain, hasStatTrak, hasNametag } = itemData;

  const parsed = parseItemName(item);
  const wearValue = item.wear;
  const isPainted = item.hasWear && item.hasWear();

  return (
    <div className="w-80 rounded-[10px] bg-[#080c10]/95 backdrop-blur-xl border border-white/[0.12] p-4 text-xs shadow-[0_16px_50px_rgba(0,0,0,0.9)] flex flex-col gap-2.5 z-50 pointer-events-none select-none">
      {/* Top Header: StatTrak / Nametag / Title */}
      <div className="flex flex-col gap-0.5">
        {hasNametag && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#facc15] font-semibold">
            <PiTag className="w-3 h-3" />
            <span>"{item.nameTag}"</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {hasStatTrak && (
            <span className="px-1.5 py-0.5 rounded bg-[#cf6a32]/20 border border-[#cf6a32]/40 text-[10px] font-mono font-bold text-[#cf6a32]">
              StatTrak™ {item.statTrak}
            </span>
          )}
          <span className="font-display text-[15px] font-bold text-white tracking-tight truncate">
            {parsed.skinName}
          </span>
        </div>
        <span className="text-[11px] font-sans text-stone-400">
          {parsed.weaponName}
        </span>
      </div>

      {/* Badges Strip: Rarity & Teams */}
      <div className="flex items-center justify-between py-1.5 border-y border-white/[0.06] text-[11px]">
        <span className="font-sans font-medium" style={{ color: rarityColor.hex }}>
          {rarityName}
        </span>

        <div className="flex items-center gap-1">
          {isEquippedCT && (
            <span className="px-1.5 py-0.5 rounded bg-[#92bce3]/15 text-[9px] font-mono font-bold text-[#92bce3]">
              CT
            </span>
          )}
          {isEquippedT && (
            <span className="px-1.5 py-0.5 rounded bg-[#e5c158]/15 text-[9px] font-mono font-bold text-[#e5c158]">
              TR
            </span>
          )}
        </div>
      </div>

      {/* Float / Wear Section with Spectrum Bar */}
      {isPainted && wearValue !== undefined && wearValue !== null && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-400 font-sans">{wearName || "Desgaste"}</span>
            <span className="font-mono font-semibold text-[#a9c8c0]">{wearValue.toFixed(6)}</span>
          </div>

          {/* Wear Spectrum Bar (FN -> MW -> FT -> WW -> BS) */}
          <div className="relative h-1.5 w-full rounded-full bg-stone-800 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: "7%" }} title="Factory New" />
            <div className="h-full bg-teal-400" style={{ width: "8%" }} title="Minimal Wear" />
            <div className="h-full bg-amber-400" style={{ width: "23%" }} title="Field-Tested" />
            <div className="h-full bg-orange-500" style={{ width: "7%" }} title="Well-Worn" />
            <div className="h-full bg-red-600" style={{ width: "55%" }} title="Battle-Scarred" />

            {/* Float Indicator Needle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_4px_#ffffff] -translate-x-1/2"
              style={{ left: `${Math.min(100, Math.max(0, wearValue * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Paint Seed */}
      {item.seed !== undefined && item.seed !== null && (
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.04]">
          <span className="text-stone-400">Padrão de Textura</span>
          <span className="font-mono text-white font-semibold">Seed #{item.seed}</span>
        </div>
      )}

      {/* Applied Stickers Section */}
      {hasStickers && item.stickers && (
        <div className="flex flex-col gap-1 pt-1.5 border-t border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase text-stone-500 font-semibold flex items-center gap-1">
            <PiSticker className="w-3 h-3 text-[#92bce3]" />
            <span>Adesivos Aplicados:</span>
          </span>

          <div className="flex flex-col gap-1 mt-0.5">
            {Array.from(item.stickers.entries()).map(([slot, stk]) => {
              if (!stk) return null;
              const econ = CS2Economy.getById(stk.id);
              const stickerName = econ?.name || `Adesivo #${slot + 1}`;
              const stickerWear = stk.wear ? `${(stk.wear * 100).toFixed(0)}% desgastado` : "0% desgastado";
              return (
                <div key={slot} className="flex items-center justify-between text-[10px] text-stone-300">
                  <span className="truncate max-w-[170px] text-[#92bce3]">{stickerName}</span>
                  <span className="font-mono text-stone-500 text-[9px]">{stickerWear}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applied Keychain Section */}
      {hasKeychain && item.keychains && (
        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-1 text-[#e5c158]">
            <PiSparkle className="w-3 h-3" />
            <span className="text-[10px] font-sans">Chaveiro Anexado</span>
          </div>
          {Array.from(item.keychains.values())[0]?.seed && (
            <span className="font-mono text-[10px] text-stone-400">
              Seed: {Array.from(item.keychains.values())[0].seed}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
