"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  PiX,
  PiDownloadSimple,
  PiCheck,
  PiWarningCircle,
  PiPencilSimple,
} from "react-icons/pi";
import { CS2Economy, CS2BaseInventoryItem, CS2EconomyItem } from "@ianlucas/cs2-lib";
import { parseInspectLink } from "@ianlucas/cs2-lib-inspect";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { RARITY_COLORS, getWearName } from "@/lib/inventory/economy";

interface ImportInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCraftWithItem?: (item: CS2EconomyItem, attributes: Partial<CS2BaseInventoryItem>) => void;
}

export function ImportInspectModal({
  isOpen,
  onClose,
  onOpenCraftWithItem,
}: ImportInspectModalProps) {
  const { craft } = useKurageInventory();
  const [inputLink, setInputLink] = useState("");
  const parseResult = useMemo<{
    data: { baseItem: CS2BaseInventoryItem; economyItem: CS2EconomyItem } | null;
    error: string | null;
  }>(() => {
    const raw = inputLink.trim();
    if (!raw) return { data: null, error: null };

    try {
      const baseItem = parseInspectLink(CS2Economy, raw);
      if (!baseItem || !baseItem.id) {
        return { data: null, error: "Link ou comando de inspeção inválido." };
      }
      const economyItem = CS2Economy.getById(baseItem.id);
      if (!economyItem) {
        return { data: null, error: "Item correspondente não encontrado na base de dados." };
      }
      return { data: { baseItem, economyItem }, error: null };
    } catch {
      return {
        data: null,
        error: "Formato não reconhecido. Use um comando de inspeção ou link da Steam.",
      };
    }
  }, [inputLink]);
  const parsedItemData = parseResult.data;
  const error = parseResult.error;

  const handleImport = async () => {
    if (!parsedItemData) return;
    const { baseItem, economyItem } = parsedItemData;
    const saved = await craft(economyItem, {
      wear: baseItem.wear,
      seed: baseItem.seed,
      stattrak: baseItem.statTrak !== undefined,
      nameTag: baseItem.nameTag,
      stickers: baseItem.stickers,
      keychains: baseItem.keychains,
    });
    if (!saved) return;
    setInputLink("");
    onClose();
  };

  const handleOpenInCraft = () => {
    if (!parsedItemData || !onOpenCraftWithItem) return;
    const { baseItem, economyItem } = parsedItemData;
    onOpenCraftWithItem(economyItem, baseItem);
    setInputLink("");
    onClose();
  };

  if (!isOpen) return null;

  const { economyItem, baseItem } = parsedItemData || {};
  const rarityKey = economyItem?.rarityColor || "default";
  const rarityColor = RARITY_COLORS[rarityKey] || RARITY_COLORS.default;

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
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-white/[0.1] bg-[#050708]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PiDownloadSimple className="w-5 h-5 text-[var(--kurage-accent)]" />
            <h2 className="font-display text-[18px] font-bold text-white tracking-tight">
              Importar Skin via Link ou Comando CS2
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
        <div data-lenis-prevent className="p-6 flex flex-col gap-5 overflow-y-auto overscroll-contain min-h-0 flex-1">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-sans text-stone-300">
              Cole o link de inspeção da Steam ou comando do jogo (!i, !gen):
            </label>

            <textarea
              rows={3}
              value={inputLink}
              onChange={(e) => setInputLink(e.target.value)}
              placeholder="Ex: !i CSGO-..."
              className="w-full p-3 rounded-[8px] bg-white/[0.04] border border-white/[0.08] text-[13px] font-mono text-white placeholder:text-stone-600 focus:outline-none focus:border-[var(--kurage-accent)]/50 resize-none"
              autoFocus
            />

            {error && (
              <div className="flex items-center gap-1.5 text-[12px] text-red-400 mt-1">
                <PiWarningCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Real-time Parsed Preview */}
          {parsedItemData && economyItem && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-[12px] bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3"
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 shrink-0 rounded-[8px] bg-white/[0.02] border border-white/[0.04] flex items-center justify-center p-2">
                  {economyItem.getImageUrl(baseItem?.wear) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={economyItem.getImageUrl(baseItem?.wear)}
                      alt={economyItem.name}
                      className="max-h-full max-w-full object-contain drop-shadow"
                    />
                  ) : (
                    <div className="text-[10px] text-stone-600">Sem imagem</div>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="font-display text-[16px] font-bold text-white truncate">
                    {economyItem.name}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: rarityColor.hex }}>
                    {economyItem.rarityColor || "Padrão"}
                  </span>
                  {baseItem?.wear !== undefined && (
                    <span className="text-[11px] font-mono text-[var(--kurage-accent)] mt-0.5">
                      Desgaste: {baseItem.wear.toFixed(6)} · {getWearName(baseItem.wear)}
                    </span>
                  )}
                  {baseItem?.seed !== undefined && (
                    <span className="text-[11px] font-mono text-stone-400">
                      Padrão: {baseItem.seed}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[6px] text-[13px] font-sans text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {onOpenCraftWithItem && (
              <button
                type="button"
                disabled={!parsedItemData}
                onClick={handleOpenInCraft}
                className="px-4 py-2 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white text-[13px] font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <PiPencilSimple className="w-3.5 h-3.5 text-[var(--kurage-accent)]" />
                <span>Abrir no Estúdio</span>
              </button>
            )}

            <button
              type="button"
              disabled={!parsedItemData}
              onClick={handleImport}
              className="px-5 py-2 rounded-[6px] bg-white text-black text-[13px] font-sans font-semibold hover:bg-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <PiCheck className="w-4 h-4" />
              <span>Importar para Inventário</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
