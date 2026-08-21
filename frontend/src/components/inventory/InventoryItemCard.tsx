"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react";
import {
  PiDotsThreeVertical,
  PiSparkle,
  PiEye,
  PiPencilSimple,
  PiTrash,
  PiCheck,
  PiSticker,
  PiTag,
  PiCopy,
  PiFiles,
} from "react-icons/pi";
import { CS2Team, CS2ItemType } from "@ianlucas/cs2-lib";
import { generateInspectLink } from "@ianlucas/cs2-lib-inspect";
import { cn } from "@/lib/utils";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { InventoryItemTooltip } from "./InventoryItemTooltip";
import { parseItemName } from "@/lib/inventory/economy-naming";
import { toast } from "sonner";

interface InventoryItemCardProps {
  itemData: TransformedInventoryItem;
  onInspect: (itemData: TransformedInventoryItem) => void;
  onEdit: (itemData: TransformedInventoryItem) => void;
  onApplySticker: (itemData: TransformedInventoryItem) => void;
  onApplyKeychain: (itemData: TransformedInventoryItem) => void;
}

export function InventoryItemCard({
  itemData,
  onInspect,
  onEdit,
  onApplySticker,
  onApplyKeychain,
}: InventoryItemCardProps) {
  const { equip, unequip, remove, craft } = useKurageInventory();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    item,
    imageUrl,
    rarityColor,
    wearShort,
    isEquippedCT,
    isEquippedT,
    hasStickers,
    hasKeychain,
    hasStatTrak,
    hasNametag,
  } = itemData;

  const parsed = parseItemName(item);

  // Floating UI Tooltip Setup
  const { refs, floatingStyles, context } = useFloating({
    open: isTooltipOpen && !isMenuOpen,
    onOpenChange: setIsTooltipOpen,
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
    placement: "top",
  });

  const hover = useHover(context, { delay: { open: 220, close: 100 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Close context menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

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
  const canHaveStickers = item.type === CS2ItemType.Weapon;
  const canHaveKeychain = item.type === CS2ItemType.Weapon;

  // Handle Copy in-game CS2 command (!i)
  const handleCopyInspect = () => {
    try {
      const inspectCommand = generateInspectLink(item);
      navigator.clipboard.writeText(inspectCommand);
      toast.success("Comando CS2 copiado!", {
        description:
          "Cole no chat do jogo ou console para inspecionar no servidor.",
      });
    } catch {
      toast.error("Não foi possível gerar o comando de inspeção.");
    }
    setIsMenuOpen(false);
  };

  // Handle Duplicate Item
  const handleDuplicate = () => {
    craft(item, {
      wear: item.wear,
      seed: item.seed,
      stattrak: hasStatTrak,
      nameTag: item.nameTag,
      stickers: item.stickers
        ? (Object.fromEntries(item.stickers) as any)
        : undefined,
      keychains: item.keychains
        ? (Object.fromEntries(item.keychains) as any)
        : undefined,
    });
    toast.success("Item duplicado no inventário!");
    setIsMenuOpen(false);
  };

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={cn(
          "group relative rounded-[10px] bg-[#070b0e] border transition-all duration-200 flex flex-col overflow-hidden select-none hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] min-h-[190px]",
          isEquippedCT || isEquippedT
            ? "border-[#a9c8c0]/40 shadow-[0_0_15px_rgba(169,200,192,0.06)]"
            : "border-white/[0.08] hover:border-white/20",
          isMenuOpen && "z-40",
        )}
        style={{ overflow: isMenuOpen ? "visible" : "hidden" }}
      >
        {/* Top Hairline Rarity Accent */}
        <div
          className="h-[2px] w-full"
          style={{
            backgroundColor: rarityColor.hex,
            boxShadow: `0 0 8px ${rarityColor.hex}`,
          }}
        />

        {/* Top Indicators Bar */}
        <div className="p-2.5 pb-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-1">
            {/* StatTrak Badge */}
            {hasStatTrak && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-[#cf6a32]/15 border border-[#cf6a32]/30 text-[9px] font-mono font-bold text-[#cf6a32] tracking-wider">
                ST {item.statTrak}
              </span>
            )}

            {/* Wear Short */}
            {wearShort && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-white/[0.04] text-[9px] font-mono text-stone-400 font-semibold">
                {wearShort}
              </span>
            )}
          </div>

          {/* Equipped Team Badges */}
          <div className="flex items-center gap-1">
            {isEquippedCT && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-[#92bce3]/15 border border-[#92bce3]/30 text-[9px] font-mono font-bold text-[#92bce3]">
                CT
              </span>
            )}
            {isEquippedT && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-[#e5c158]/15 border border-[#e5c158]/30 text-[9px] font-mono font-bold text-[#e5c158]">
                TR
              </span>
            )}

            {/* Context Menu Trigger */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1 rounded text-stone-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Ações do Item"
              >
                <PiDotsThreeVertical className="w-3.5 h-3.5" />
              </button>

              {/* Context Dropdown */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-48 rounded-[8px] bg-[#0c1216] border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.9)] z-50 py-1 flex flex-col text-[12px] font-sans"
                  >
                    {/* Equip CT */}
                    {canEquip && canEquipCT && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isEquippedCT) unequip(item.uid, CS2Team.CT);
                          else equip(item.uid, CS2Team.CT);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                      >
                        <span>
                          {isEquippedCT ? "Desequipar CT" : "Equipar CT"}
                        </span>
                        {isEquippedCT && (
                          <PiCheck className="w-3.5 h-3.5 text-[#92bce3]" />
                        )}
                      </button>
                    )}

                    {/* Equip TR */}
                    {canEquip && canEquipT && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isEquippedT) unequip(item.uid, CS2Team.T);
                          else equip(item.uid, CS2Team.T);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                      >
                        <span>
                          {isEquippedT ? "Desequipar TR" : "Equipar TR"}
                        </span>
                        {isEquippedT && (
                          <PiCheck className="w-3.5 h-3.5 text-[#e5c158]" />
                        )}
                      </button>
                    )}

                    {canEquip && (canEquipCT || canEquipT) && (
                      <div className="h-[1px] bg-white/[0.06] my-1" />
                    )}

                    {/* Inspect 3D */}
                    <button
                      type="button"
                      onClick={() => {
                        onInspect(itemData);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <PiEye className="w-3.5 h-3.5 text-[#a9c8c0]" />
                      <span>Inspecionar 3D</span>
                    </button>

                    {/* Copy CS2 !i command */}
                    <button
                      type="button"
                      onClick={handleCopyInspect}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <PiCopy className="w-3.5 h-3.5 text-[#e5c158]" />
                      <span>Copiar Comando CS2 (!i)</span>
                    </button>

                    {/* Edit / Crafting Studio */}
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(itemData);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <PiPencilSimple className="w-3.5 h-3.5 text-stone-400" />
                      <span>Editar Customização</span>
                    </button>

                    {/* Duplicate Skin */}
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <PiFiles className="w-3.5 h-3.5 text-stone-400" />
                      <span>Duplicar Skin</span>
                    </button>

                    {/* Apply Sticker */}
                    {canHaveStickers && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplySticker(itemData);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                      >
                        <PiSticker className="w-3.5 h-3.5 text-[#92bce3]" />
                        <span>Aplicar Adesivo</span>
                      </button>
                    )}

                    {/* Apply Keychain */}
                    {canHaveKeychain && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyKeychain(itemData);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-stone-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                      >
                        <PiSparkle className="w-3.5 h-3.5 text-[#e5c158]" />
                        <span>Aplicar Chaveiro</span>
                      </button>
                    )}

                    <div className="h-[1px] bg-white/[0.06] my-1" />

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => {
                        remove(item.uid);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                    >
                      <PiTrash className="w-3.5 h-3.5" />
                      <span>Excluir do Inventário</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Center Image with subtle hover zoom */}
        <div
          onClick={() => onInspect(itemData)}
          className="relative h-28 w-full flex items-center justify-center p-3 cursor-pointer group-hover:scale-105 transition-transform duration-200 shrink-0"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={item.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
            />
          ) : (
            <div className="text-stone-600 text-[12px]">Sem imagem</div>
          )}

          {/* Applied Stickers Preview Strip */}
          {hasStickers && item.stickers && (
            <div className="absolute bottom-1 right-2 flex items-center gap-1 z-10">
              {Array.from(item.stickers.values()).map((stk, idx) => {
                if (!stk) return null;
                return (
                  <div
                    key={idx}
                    className="w-5 h-5 rounded bg-black/60 border border-white/20 p-0.5 flex items-center justify-center"
                    title={`Adesivo #${idx + 1}`}
                  >
                    <PiSticker className="w-3 h-3 text-[#92bce3]" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Applied Keychain Badge */}
          {hasKeychain && (
            <div className="absolute bottom-1 left-2 flex items-center gap-1 z-10">
              <div className="px-1.5 py-0.5 rounded bg-black/70 border border-[#e5c158]/30 flex items-center gap-1 text-[9px] font-mono text-[#e5c158]">
                <PiSparkle className="w-2.5 h-2.5" />
                <span>Chaveiro</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Name & Details */}
        <div className="p-3 pt-1 border-t border-white/[0.04] bg-white/[0.01] flex flex-col gap-0.5 mt-auto">
          {/* Nametag if custom */}
          {hasNametag && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#facc15] truncate">
              <PiTag className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">"{item.nameTag}"</span>
            </div>
          )}

          {/* Skin Name */}
          <span
            className="text-[13px] font-sans font-semibold text-white truncate tracking-tight leading-tight"
            title={item.name}
          >
            {parsed.skinName}
          </span>

          {/* Weapon Name & Rarity / Seed */}
          <div className="flex items-center justify-between text-[11px] font-sans text-stone-400">
            <span className="truncate" style={{ color: rarityColor.hex }}>
              {parsed.weaponName}
            </span>
            {item.seed !== undefined && item.seed !== null && (
              <span className="font-mono text-[10px] text-stone-500">
                #{item.seed}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      <FloatingPortal>
        <AnimatePresence>
          {isTooltipOpen && !isMenuOpen && (
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 4 }}
                transition={{ duration: 0.12 }}
              >
                <InventoryItemTooltip itemData={itemData} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
