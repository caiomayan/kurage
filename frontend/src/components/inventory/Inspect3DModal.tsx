"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PiX,
  PiEye,
  PiSticker,
  PiSparkle,
  PiTag,
  PiCheck,
  PiPencilSimple,
  PiCopy,
} from "react-icons/pi";
import { CS2Team, CS2ItemType, CS2Economy } from "@ianlucas/cs2-lib";
import { generateInspectLink } from "@ianlucas/cs2-lib-inspect";
import { cn } from "@/lib/utils";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { parseItemName, getItemImage } from "@/lib/inventory/economy-naming";
import { toast } from "sonner";

interface Inspect3DModalProps {
  itemData: TransformedInventoryItem | null;
  onClose: () => void;
  onEdit?: (itemData: TransformedInventoryItem) => void;
}

export function Inspect3DModal({
  itemData,
  onClose,
  onEdit,
}: Inspect3DModalProps) {
  const { equip, unequip } = useKurageInventory();
  const [copied, setCopied] = useState(false);

  if (!itemData) return null;

  const {
    item,
    imageUrl,
    rarityColor,
    rarityName,
    isEquippedCT,
    isEquippedT,
    hasStickers,
    hasKeychain,
    hasStatTrak,
    hasNametag,
  } = itemData;
  const parsed = parseItemName(item);
  const canEquip =
    item.type === CS2ItemType.Weapon ||
    item.type === CS2ItemType.Melee ||
    item.type === CS2ItemType.Gloves ||
    item.type === CS2ItemType.Agent ||
    item.type === CS2ItemType.MusicKit;
  const supportedTeams = item.teams as CS2Team[] | undefined;
  const canEquipCT =
    !supportedTeams ||
    supportedTeams.length === 0 ||
    supportedTeams.includes(CS2Team.CT);
  const canEquipT =
    !supportedTeams ||
    supportedTeams.length === 0 ||
    supportedTeams.includes(CS2Team.T);

  const handleCopyInspect = () => {
    try {
      const inspectCommand = generateInspectLink(item);
      navigator.clipboard.writeText(inspectCommand);
      setCopied(true);
      toast.success("Comando CS2 copiado com sucesso!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível gerar o comando de inspeção.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-3xl max-h-[90vh] rounded-[16px] bg-[#070b0e] border border-white/[0.1] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PiEye className="w-5 h-5 text-[#a9c8c0]" />
            <h2 className="font-display text-[18px] font-bold text-white tracking-tight">
              Inspeção de Skin
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <PiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          data-lenis-prevent
          className="p-6 sm:p-8 flex flex-col items-center overflow-y-auto overscroll-contain min-h-0 flex-1"
        >
          {/* Main Visual Display */}
          <div className="relative w-full h-64 sm:h-72 flex items-center justify-center rounded-[12px] bg-white/[0.015] border border-white/[0.06] overflow-hidden group">
            {/* Atmospheric Glow */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-44 opacity-20 blur-3xl pointer-events-none rounded-full"
              style={{
                background: `radial-gradient(circle, ${rarityColor.hex}, transparent 70%)`,
              }}
            />

            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={item.name}
                className="max-h-56 max-w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="text-stone-600">Sem imagem disponível</div>
            )}
          </div>

          {/* Identity & Nametag */}
          <div className="flex flex-col items-center text-center mt-6">
            {hasNametag && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#facc15]/10 border border-[#facc15]/30 text-[12px] font-mono text-[#facc15] mb-2">
                <PiTag className="w-3.5 h-3.5" />
                <span>"{item.nameTag}"</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {hasStatTrak && (
                <span className="px-2 py-0.5 rounded bg-[#cf6a32]/15 border border-[#cf6a32]/30 text-[11px] font-mono font-bold text-[#cf6a32]">
                  StatTrak™ {item.statTrak}
                </span>
              )}
              <h3 className="font-display text-[22px] font-bold text-white tracking-tight">
                {parsed.skinName}
              </h3>
            </div>

            <span className="text-[13px] font-sans font-medium text-stone-400 mt-0.5">
              {parsed.weaponName}
            </span>

            <span
              className="text-[12px] font-sans font-semibold mt-1"
              style={{ color: rarityColor.hex }}
            >
              {rarityName}
            </span>
          </div>

          {/* Telemetry & Specifications Grid */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.06]">
            {/* Float / Wear */}
            <div className="flex flex-col p-3 rounded-[8px] bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] font-mono uppercase text-mute">
                Desgaste (Float)
              </span>
              <span className="text-[13px] font-mono font-semibold text-[#a9c8c0] mt-0.5">
                {item.wear !== undefined && item.wear !== null
                  ? item.wear.toFixed(6)
                  : "N/A"}
              </span>
              <span className="text-[10px] font-sans text-stone-500">
                {itemData.wearName || "Padrão"}
              </span>
            </div>

            {/* Paint Seed */}
            <div className="flex flex-col p-3 rounded-[8px] bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] font-mono uppercase text-mute">
                Paint Seed
              </span>
              <span className="text-[13px] font-mono font-semibold text-white mt-0.5">
                {item.seed !== undefined && item.seed !== null
                  ? `#${item.seed}`
                  : "N/A"}
              </span>
              <span className="text-[10px] font-sans text-stone-500">
                Padrão de Textura
              </span>
            </div>

            {/* Stickers Count */}
            <div className="flex flex-col p-3 rounded-[8px] bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] font-mono uppercase text-mute">
                Adesivos
              </span>
              <span className="text-[13px] font-sans font-semibold text-[#92bce3] mt-0.5">
                {hasStickers && item.stickers
                  ? `${item.stickers.size}/5 Aplicados`
                  : "Nenhum"}
              </span>
              <span className="text-[10px] font-sans text-stone-500">
                Customização
              </span>
            </div>

            {/* Keychain */}
            <div className="flex flex-col p-3 rounded-[8px] bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] font-mono uppercase text-mute">
                Chaveiro (Charm)
              </span>
              <span className="text-[13px] font-sans font-semibold text-[#e5c158] mt-0.5">
                {hasKeychain ? "Anexado" : "Nenhum"}
              </span>
              <span className="text-[10px] font-sans text-stone-500">
                Acessório
              </span>
            </div>
          </div>

          {/* Stickers Detailed Strip (if applied) */}
          {hasStickers && item.stickers && (
            <div className="w-full flex flex-col gap-2 mt-4 p-3 rounded-[8px] bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[11px] font-mono uppercase text-stone-400 font-semibold flex items-center gap-1.5">
                <PiSticker className="w-3.5 h-3.5 text-[#92bce3]" />
                <span>Adesivos Aplicados na Arma:</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1">
                {Array.from(item.stickers.entries()).map(([slot, stk]) => {
                  if (!stk) return null;
                  const econ = CS2Economy.getById(stk.id);
                  const stkImg = getItemImage(econ);
                  return (
                    <div
                      key={slot}
                      className="p-2 rounded bg-white/[0.03] border border-white/[0.06] flex flex-col items-center text-center gap-1"
                    >
                      {stkImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={stkImg}
                          alt={econ?.name || "Adesivo"}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <PiSticker className="w-8 h-8 text-[#92bce3]" />
                      )}
                      <span className="text-[10px] font-sans text-stone-300 truncate w-full">
                        {econ?.name || `Slot #${slot + 1}`}
                      </span>
                      <span className="text-[9px] font-mono text-stone-500">
                        {stk.wear
                          ? `${(stk.wear * 100).toFixed(0)}% desgaste`
                          : "0% desgaste"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-white/[0.06]">
            {/* Left: Equip CT / TR & Copy CS2 !i */}
            <div className="flex items-center gap-2 flex-wrap">
              {canEquip && (
                <>
                  {canEquipCT && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEquippedCT) unequip(item.uid, CS2Team.CT);
                        else equip(item.uid, CS2Team.CT);
                      }}
                      className={cn(
                        "px-3.5 py-2 rounded-[6px] text-[12px] font-sans font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border",
                        isEquippedCT
                          ? "bg-[#92bce3]/20 border-[#92bce3]/50 text-[#92bce3]"
                          : "bg-white/[0.04] border-white/[0.08] text-stone-300 hover:text-white",
                      )}
                    >
                      {isEquippedCT && <PiCheck className="w-3.5 h-3.5" />}
                      <span>{isEquippedCT ? "Equipado CT" : "Equipar CT"}</span>
                    </button>
                  )}

                  {canEquipT && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEquippedT) unequip(item.uid, CS2Team.T);
                        else equip(item.uid, CS2Team.T);
                      }}
                      className={cn(
                        "px-3.5 py-2 rounded-[6px] text-[12px] font-sans font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border",
                        isEquippedT
                          ? "bg-[#e5c158]/20 border-[#e5c158]/50 text-[#e5c158]"
                          : "bg-white/[0.04] border-white/[0.08] text-stone-300 hover:text-white",
                      )}
                    >
                      {isEquippedT && <PiCheck className="w-3.5 h-3.5" />}
                      <span>{isEquippedT ? "Equipado TR" : "Equipar TR"}</span>
                    </button>
                  )}
                </>
              )}

              {/* Copy CS2 Command (!i) */}
              <button
                type="button"
                onClick={handleCopyInspect}
                className="px-3.5 py-2 rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-sans font-medium text-stone-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar comando CS2 para o console ou chat"
              >
                {copied ? (
                  <PiCheck className="w-3.5 h-3.5 text-[#11ff99]" />
                ) : (
                  <PiCopy className="w-3.5 h-3.5 text-[#e5c158]" />
                )}
                <span>{copied ? "Copiado!" : "Copiar Comando CS2 (!i)"}</span>
              </button>
            </div>

            {/* Right: Edit & Close */}
            <div className="flex items-center gap-3">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(itemData);
                  }}
                  className="px-4 py-2 rounded-[6px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[13px] font-sans font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PiPencilSimple className="w-3.5 h-3.5 text-[#a9c8c0]" />
                  <span>Editar no Estúdio</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[6px] bg-white text-black text-[13px] font-sans font-semibold hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
