"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiX,
  PiSparkle,
  PiMagnifyingGlass,
  PiArrowsClockwise,
  PiSticker,
  PiTag,
  PiPlus,
  PiTrash,
  PiArrowLeft,
  PiDownloadSimple,
  PiCaretRight,
} from "react-icons/pi";
import {
  CS2Economy,
  CS2EconomyItem,
  CS2_MAX_SEED,
  CS2BaseInventoryItem,
} from "@ianlucas/cs2-lib";
import { cn } from "@/lib/utils";
import {
  useKurageInventory,
  CraftAttributes,
} from "@/lib/inventory/inventory-context";
import {
  RARITY_COLORS,
  WEAR_NAMES,
  getWearName,
} from "@/lib/inventory/economy";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import {
  ECONOMY_CATEGORIES,
  EconomyFilterCategory,
  getBaseItems,
  getPaidItems,
  getAllPaidItems,
} from "@/lib/inventory/economy-filters";
import { parseItemName, getItemImage } from "@/lib/inventory/economy-naming";
import { toast } from "sonner";
import { ImportInspectModal } from "./ImportInspectModal";

interface CraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemData?: TransformedInventoryItem | null;
  preselectedItem?: CS2EconomyItem | null;
  initialAttributes?: Partial<CS2BaseInventoryItem> | null;
}

export function CraftModal({
  isOpen,
  onClose,
  initialItemData,
  preselectedItem,
  initialAttributes,
}: CraftModalProps) {
  const { craft, edit } = useKurageInventory();

  const isEditing = Boolean(initialItemData);

  // Selected Category & Model state
  const [selectedCategory, setSelectedCategory] =
    useState<EconomyFilterCategory>(() => ECONOMY_CATEGORIES[1]); // Default Rifles
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null);
  const [selectedModelName, setSelectedModelName] = useState<string | null>(
    null,
  );

  // Selected Item to customize
  const [selectedItem, setSelectedItem] = useState<CS2EconomyItem | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Customization parameters
  const [wear, setWear] = useState<number>(0.01);
  const [seed, setSeed] = useState<number>(() =>
    Math.floor(Math.random() * 1000),
  );
  const [hasStatTrak, setHasStatTrak] = useState<boolean>(false);
  const [statTrakCount, setStatTrakCount] = useState<number>(0);
  const [nametag, setNametag] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Import Modal trigger
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Stickers state (up to 5 slots)
  const [stickers, setStickers] = useState<
    Array<{
      id: number;
      name: string;
      imageUrl?: string;
      wear?: number;
      slot: number;
    } | null>
  >([null, null, null, null, null]);

  // Keychain state
  const [keychain, setKeychain] = useState<{
    id: number;
    name: string;
    imageUrl?: string;
    seed?: number;
  } | null>(null);

  // Sub-pickers
  const [isPickingStickerSlot, setIsPickingStickerSlot] = useState<
    number | null
  >(null);
  const [isPickingKeychain, setIsPickingKeychain] = useState(false);
  const [stickerSearch, setStickerSearch] = useState("");
  const [keychainSearch, setKeychainSearch] = useState("");

  // Reset or initialize state when opening modal
  useEffect(() => {
    if (!isOpen) return;

    if (initialItemData) {
      const econ = CS2Economy.getById(initialItemData.item.id);
      if (econ) {
        setSelectedItem(econ);
        setWear(initialItemData.item.wear ?? (econ.wearMin || 0) + 0.01);
        setSeed(initialItemData.item.seed ?? 420);
        setHasStatTrak(initialItemData.hasStatTrak);
        setStatTrakCount(initialItemData.item.statTrak ?? 0);
        setNametag(initialItemData.item.nameTag ?? "");

        // Load stickers
        if (initialItemData.item.stickers) {
          const arr = [null, null, null, null, null] as any[];
          Object.entries(
            Object.fromEntries(initialItemData.item.stickers),
          ).forEach(([slotStr, s]: [string, any]) => {
            if (!s) return;
            const slot = parseInt(slotStr, 10);
            const stEcon = CS2Economy.getById(s.id);
            arr[slot] = {
              id: s.id,
              name: stEcon?.name || "Adesivo",
              imageUrl: getItemImage(stEcon) || undefined,
              wear: s.wear || 0,
              slot,
            };
          });
          setStickers(arr);
        }

        // Load keychain
        if (initialItemData.item.keychains) {
          const first = Object.values(
            Object.fromEntries(initialItemData.item.keychains),
          )[0] as any;
          if (first) {
            const kEcon = CS2Economy.getById(first.id);
            setKeychain({
              id: first.id,
              name: kEcon?.name || "Chaveiro",
              imageUrl: getItemImage(kEcon) || undefined,
              seed: first.seed,
            });
          }
        }
      }
    } else if (preselectedItem) {
      setSelectedItem(preselectedItem);
      if (initialAttributes) {
        if (initialAttributes.wear !== undefined)
          setWear(initialAttributes.wear);
        if (initialAttributes.seed !== undefined)
          setSeed(initialAttributes.seed);
        if (initialAttributes.nameTag !== undefined)
          setNametag(initialAttributes.nameTag);
        if (initialAttributes.statTrak !== undefined) {
          setHasStatTrak(true);
          setStatTrakCount(initialAttributes.statTrak);
        }
      }
    } else {
      // Clean new craft state
      setSelectedItem(null);
      setSelectedModelKey(null);
      setSelectedModelName(null);
      setSearchQuery("");
      setWear(0.01);
      setSeed(Math.floor(Math.random() * 1000));
      setHasStatTrak(false);
      setStatTrakCount(0);
      setNametag("");
      setQuantity(1);
      setStickers([null, null, null, null, null]);
      setKeychain(null);
    }
  }, [isOpen, initialItemData, preselectedItem, initialAttributes]);

  // Current items to display
  const displayItems = useMemo(() => {
    if (!isOpen) return [];

    // 1. Universal search takes precedence if >= 2 characters
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      return getAllPaidItems()
        .filter((it) => it.name.toLowerCase().includes(q))
        .slice(0, 120);
    }

    // 2. Step 2: When a weapon model is selected (e.g. "ak47"), return all skins for that model
    if (selectedModelKey) {
      return getPaidItems(selectedCategory, selectedModelKey);
    }

    // 3. Step 1: Return base weapon models (e.g. AK-47, M4A4, Karambit) or items for non-model categories
    return getBaseItems(selectedCategory);
  }, [isOpen, searchQuery, selectedCategory, selectedModelKey]);

  // Filter stickers for sticker picker
  const availableStickers = useMemo(() => {
    if (isPickingStickerSlot === null) return [];
    return CS2Economy.itemsAsArray
      .filter((it) => {
        if (!it.isSticker()) return false;
        if (stickerSearch.trim()) {
          return it.name.toLowerCase().includes(stickerSearch.toLowerCase());
        }
        return true;
      })
      .slice(0, 100);
  }, [isPickingStickerSlot, stickerSearch]);

  // Filter keychains for keychain picker
  const availableKeychains = useMemo(() => {
    if (!isPickingKeychain) return [];
    return CS2Economy.itemsAsArray
      .filter((it) => {
        if (!it.isKeychain()) return false;
        if (keychainSearch.trim()) {
          return it.name.toLowerCase().includes(keychainSearch.toLowerCase());
        }
        return true;
      })
      .slice(0, 80);
  }, [isPickingKeychain, keychainSearch]);

  // Randomize Seed
  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * (CS2_MAX_SEED + 1)));
  };

  // Submit Craft / Edit
  const handleSave = () => {
    if (!selectedItem) return;

    const formattedStickers: Record<string, any> = {};
    stickers.forEach((s, idx) => {
      if (!s) return;
      formattedStickers[idx] = {
        id: s.id,
        wear: s.wear,
      };
    });

    const formattedKeychains: Record<string, any> = {};
    if (keychain) {
      formattedKeychains[0] = {
        id: keychain.id,
        seed: keychain.seed ?? 100,
      };
    }

    const attributes: Partial<CraftAttributes> = {
      wear: selectedItem.hasWear() ? parseFloat(wear.toFixed(6)) : undefined,
      seed: selectedItem.hasSeed() ? seed : undefined,
      stattrak: hasStatTrak,
      nameTag: nametag.trim().length > 0 ? nametag.trim() : undefined,
      stickers: formattedStickers,
      keychains: formattedKeychains,
      quantity,
    };

    if (isEditing && initialItemData) {
      edit(initialItemData.uid, attributes);
      toast.success("Skin atualizada com sucesso!");
    } else {
      craft(selectedItem, attributes);
      toast.success(
        quantity > 1
          ? `${quantity}x skins adicionadas ao inventário!`
          : "Skin adicionada ao inventário com sucesso!",
      );
    }

    onClose();
  };

  if (!isOpen) return null;

  const parsedSelected = selectedItem ? parseItemName(selectedItem) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Main Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl h-[88vh] max-h-[88vh] rounded-[16px] bg-[#070b0e] border border-white/[0.1] shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PiSparkle className="w-5 h-5 text-[#a9c8c0]" />
            <h2 className="font-display text-[18px] font-bold text-white tracking-tight">
              {isEditing
                ? "Editar Customização da Skin"
                : "Estúdio de Criação de Skins (Craft)"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="h-8 px-3 rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-sans text-stone-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Importar link de inspeção ou comando !i"
              >
                <PiDownloadSimple className="w-3.5 h-3.5 text-[#a9c8c0]" />
                <span>Importar Link / !i</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <PiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BREADCRUMB & NAVIGATION BAR ── */}
        <div className="px-6 py-3 bg-white/[0.015] border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-[12px] font-sans shrink-0">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1.5 text-stone-400 font-medium">
            <button
              type="button"
              onClick={() => {
                setSelectedItem(null);
                setSelectedModelKey(null);
                setSelectedModelName(null);
                setSearchQuery("");
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {selectedCategory.label}
            </button>

            {selectedModelName && (
              <>
                <PiCaretRight className="w-3 h-3 text-stone-600" />
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className={cn(
                    "transition-colors cursor-pointer",
                    selectedItem
                      ? "hover:text-white"
                      : "text-white font-semibold",
                  )}
                >
                  {selectedModelName}
                </button>
              </>
            )}

            {parsedSelected && (
              <>
                <PiCaretRight className="w-3 h-3 text-stone-600" />
                <span className="text-[#a9c8c0] font-semibold">
                  {parsedSelected.skinName}
                </span>
              </>
            )}
          </div>

          {/* Quick Back Action */}
          {selectedItem && !isEditing ? (
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="px-3 py-1 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PiArrowLeft className="w-3.5 h-3.5 text-[#a9c8c0]" />
              <span>Escolher Outra Skin / Arma</span>
            </button>
          ) : selectedModelKey && !searchQuery.trim() ? (
            <button
              type="button"
              onClick={() => {
                setSelectedModelKey(null);
                setSelectedModelName(null);
              }}
              className="px-3 py-1 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PiArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Modelos de {selectedCategory.label}</span>
            </button>
          ) : null}
        </div>

        {/* ── MODAL CONTENT AREA (SCROLLABLE) ── */}
        <div
          data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto p-6 overscroll-contain"
        >
          {!selectedItem ? (
            /* ── ITEM & SKIN SELECTION BROWSER ── */
            <div className="flex flex-col gap-5">
              {/* Search Bar & Categories */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search input */}
                <div className="relative flex-1 w-full">
                  <PiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar arma ou skin (ex: Asiimov, Dragon Lore, Doppler, Fade)..."
                    className="w-full h-10 pl-10 pr-4 rounded-[8px] bg-white/[0.04] border border-white/[0.08] text-[13px] font-sans text-white placeholder:text-stone-500 focus:outline-none focus:border-[#a9c8c0]/50"
                  />
                </div>

                {/* Back to Models button when inside a model */}
                {selectedModelKey && !searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModelKey(null);
                      setSelectedModelName(null);
                    }}
                    className="h-10 px-4 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[13px] font-sans text-white flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                  >
                    <PiArrowLeft className="w-4 h-4 text-[#a9c8c0]" />
                    <span>Voltar para Armas</span>
                  </button>
                )}
              </div>

              {/* Category Pills (Visible when not actively searching) */}
              {!searchQuery.trim() && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {ECONOMY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedModelKey(null);
                        setSelectedModelName(null);
                      }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-[6px] text-[12px] font-sans font-medium transition-colors cursor-pointer shrink-0",
                        selectedCategory.id === cat.id
                          ? "bg-white text-black font-semibold shadow-sm"
                          : "bg-white/[0.04] text-stone-400 hover:text-white hover:bg-white/[0.08]",
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid Header Info */}
              <div className="flex items-center justify-between text-[12px] font-sans text-stone-400 px-1">
                <span>
                  {searchQuery.trim()
                    ? `Resultados da busca para "${searchQuery}" (${displayItems.length} skins encontradas):`
                    : selectedModelName
                      ? `Acabamentos e skins disponíveis para ${selectedModelName} (${displayItems.length}):`
                      : selectedCategory.hasModel
                        ? `Selecione um modelo de arma para ver suas skins:`
                        : `Itens disponíveis em ${selectedCategory.label} (${displayItems.length}):`}
                </span>
              </div>

              {/* Robust, High-Fidelity Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {displayItems.map((item) => {
                  const isModelTile =
                    selectedCategory.hasModel &&
                    !selectedModelKey &&
                    !searchQuery.trim() &&
                    item.isBase;
                  const parsed = parseItemName(item);
                  const itemImg = getItemImage(item);
                  const rKey = item.rarityColor || "default";
                  const rColor = RARITY_COLORS[rKey] || RARITY_COLORS.default;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isModelTile && item.modelKey) {
                          // Step 1 -> Step 2: Open all skins for this weapon model
                          setSelectedModelKey(item.modelKey);
                          setSelectedModelName(parsed.weaponName);
                        } else {
                          // Select skin and advance to customization
                          setSelectedItem(item);
                          if (item.hasWear()) {
                            setWear((item.wearMin || 0) + 0.005);
                          }
                        }
                      }}
                      className={cn(
                        "group relative rounded-[10px] bg-[#0c1216] border transition-all duration-200 cursor-pointer flex flex-col overflow-hidden min-h-[160px] p-3 text-center select-none",
                        isModelTile
                          ? "border-white/[0.08] hover:border-[#a9c8c0]/50 hover:bg-white/[0.04]"
                          : "border-white/[0.08] hover:border-white/20 hover:shadow-[0_8px_25px_rgba(0,0,0,0.8)]",
                      )}
                    >
                      {/* Top Rarity / Accent Line */}
                      <div
                        className="absolute top-0 inset-x-0 h-[2px]"
                        style={{
                          backgroundColor: isModelTile ? "#a9c8c0" : rColor.hex,
                        }}
                      />

                      {/* Image Frame */}
                      <div className="h-24 w-full flex items-center justify-center shrink-0 my-1 group-hover:scale-105 transition-transform duration-200">
                        {itemImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={itemImg}
                            alt={item.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                          />
                        ) : (
                          <div className="text-stone-600 text-[11px] font-mono">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="w-full flex flex-col justify-end mt-auto pt-2 border-t border-white/[0.04]">
                        {/* Title */}
                        <span
                          className="text-[13px] font-sans font-semibold text-white truncate leading-tight"
                          title={item.name}
                        >
                          {isModelTile ? parsed.weaponName : parsed.skinName}
                        </span>

                        {/* Subtitle */}
                        <span
                          className="text-[10px] font-mono mt-0.5 truncate"
                          style={{
                            color: isModelTile ? "#a9c8c0" : rColor.hex,
                          }}
                        >
                          {isModelTile
                            ? "Ver todas as skins →"
                            : parsed.weaponName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── STEP 3: CUSTOMIZATION STUDIO LAYOUT ── */
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_390px] gap-8">
              {/* Left Column: Hero Weapon Display & Attachments */}
              <div className="flex flex-col gap-6">
                {/* Hero Item Card */}
                <div className="relative rounded-[16px] bg-white/[0.02] border border-white/[0.08] p-8 flex flex-col items-center justify-center text-center overflow-hidden">
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-44 opacity-20 blur-3xl pointer-events-none rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, #a9c8c0 0%, transparent 70%)",
                    }}
                  />

                  <div className="h-52 w-full flex items-center justify-center">
                    {getItemImage(selectedItem, wear) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getItemImage(selectedItem, wear)!}
                        alt={selectedItem.name}
                        className="max-h-full max-w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
                      />
                    ) : (
                      <div className="text-stone-600">
                        Sem imagem disponível
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center mt-4 z-10">
                    <span className="font-display text-[22px] font-bold text-white tracking-tight">
                      {selectedItem.name}
                    </span>
                    <span className="text-[12px] font-sans text-stone-400 mt-0.5">
                      {selectedItem.categoryName || selectedItem.type}
                    </span>
                  </div>
                </div>

                {/* Stickers & Keychain Customization (if applicable) */}
                {selectedItem.isWeapon() && (
                  <div className="flex flex-col gap-5">
                    {/* Stickers Row */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-sans font-medium text-white flex items-center gap-1.5">
                          <PiSticker className="w-4 h-4 text-[#92bce3]" />
                          <span>Adesivos Aplicados (Até 5 Slots)</span>
                        </label>
                        <span className="text-[11px] font-mono text-stone-500">
                          {stickers.filter(Boolean).length}/5
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2.5">
                        {stickers.map((stk, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-[10px] bg-white/[0.02] border border-white/[0.08] p-2 flex flex-col items-center justify-center h-24 group hover:border-white/20 transition-colors"
                          >
                            {stk ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                {stk.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={stk.imageUrl}
                                    alt={stk.name}
                                    className="w-12 h-12 object-contain drop-shadow"
                                  />
                                ) : (
                                  <PiSticker className="w-8 h-8 text-[#92bce3]" />
                                )}
                                <span className="text-[9px] font-sans text-stone-300 truncate max-w-[65px]">
                                  {stk.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...stickers];
                                    next[idx] = null;
                                    setStickers(next);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                                  title="Remover adesivo"
                                >
                                  <PiTrash className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsPickingStickerSlot(idx)}
                                className="w-full h-full flex flex-col items-center justify-center text-stone-500 hover:text-[#a9c8c0] transition-colors cursor-pointer"
                                title={`Adicionar Adesivo no Slot #${idx + 1}`}
                              >
                                <PiPlus className="w-4 h-4" />
                                <span className="text-[9px] font-sans mt-1">
                                  Slot {idx + 1}
                                </span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Keychain Row */}
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[13px] font-sans font-medium text-white flex items-center gap-1.5">
                        <PiSparkle className="w-4 h-4 text-[#e5c158]" />
                        <span>Chaveiro (Charm)</span>
                      </label>

                      <div className="p-3.5 rounded-[10px] bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                        {keychain ? (
                          <div className="flex items-center gap-3">
                            {keychain.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={keychain.imageUrl}
                                alt={keychain.name}
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <PiSparkle className="w-6 h-6 text-[#e5c158]" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-[13px] font-sans font-medium text-white">
                                {keychain.name}
                              </span>
                              <span className="text-[11px] font-mono text-stone-400">
                                Seed: {keychain.seed ?? 100}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] font-sans text-stone-500">
                            Nenhum chaveiro anexado
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          {keychain && (
                            <button
                              type="button"
                              onClick={() => setKeychain(null)}
                              className="text-[11px] font-sans text-red-400 hover:text-red-300 p-1.5 cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsPickingKeychain(true)}
                            className="px-3 py-1.5 rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-sans text-white transition-colors cursor-pointer"
                          >
                            {keychain ? "Trocar Chaveiro" : "Escolher Chaveiro"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Customization Controls (Float, Seed, StatTrak, Nametag, Quantity) */}
              <div className="flex flex-col gap-5 bg-white/[0.015] border border-white/[0.06] rounded-[16px] p-6 h-fit">
                <span className="text-[14px] font-sans font-semibold text-white border-b border-white/[0.06] pb-3">
                  Parâmetros de Customização
                </span>

                {/* 1. Float / Wear Slider */}
                {selectedItem.hasWear() && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-sans font-medium text-white">
                        Desgaste / Float
                      </label>
                      <span className="text-[11px] font-mono font-bold text-[#a9c8c0]">
                        {wear.toFixed(6)} ({getWearName(wear)})
                      </span>
                    </div>

                    <input
                      type="range"
                      min={selectedItem.wearMin ?? 0.000001}
                      max={selectedItem.wearMax ?? 0.999999}
                      step="0.001"
                      value={wear}
                      onChange={(e) => setWear(parseFloat(e.target.value))}
                      className="w-full accent-[#a9c8c0] cursor-pointer"
                    />

                    {/* Wear Category Quick Buttons */}
                    <div className="grid grid-cols-5 gap-1 mt-1">
                      {WEAR_NAMES.map((w) => {
                        const isDisabled =
                          (selectedItem.wearMin !== undefined &&
                            w.max < selectedItem.wearMin) ||
                          (selectedItem.wearMax !== undefined &&
                            w.min > selectedItem.wearMax);
                        return (
                          <button
                            key={w.short}
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                              setWear(
                                Math.max(
                                  selectedItem.wearMin || 0,
                                  Math.min(
                                    selectedItem.wearMax || 1,
                                    w.min + 0.005,
                                  ),
                                ),
                              )
                            }
                            className={cn(
                              "py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer text-center disabled:opacity-20",
                              wear >= w.min && wear <= w.max
                                ? "bg-[#a9c8c0]/20 text-[#a9c8c0] border border-[#a9c8c0]/40"
                                : "bg-white/[0.02] text-stone-500 hover:text-stone-300",
                            )}
                            title={w.name}
                          >
                            {w.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Paint Seed (Pattern Index) */}
                {selectedItem.hasSeed() && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-sans font-medium text-white">
                        Paint Seed (Padrão)
                      </label>
                      <button
                        type="button"
                        onClick={handleRandomSeed}
                        className="text-[11px] font-sans text-[#a9c8c0] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <PiArrowsClockwise className="w-3 h-3" />
                        <span>Randomizar</span>
                      </button>
                    </div>

                    <input
                      type="number"
                      min="0"
                      max={CS2_MAX_SEED}
                      value={seed}
                      onChange={(e) =>
                        setSeed(
                          Math.max(
                            0,
                            Math.min(
                              CS2_MAX_SEED,
                              parseInt(e.target.value) || 0,
                            ),
                          ),
                        )
                      }
                      className="w-full h-9 px-3 rounded-[6px] bg-white/[0.04] border border-white/[0.08] font-mono text-[13px] text-white focus:outline-none focus:border-[#a9c8c0]/50"
                    />
                  </div>
                )}

                {/* 3. StatTrak Toggle & Counter */}
                {selectedItem.hasStatTrak() && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-sans font-medium text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#cf6a32]" />
                        <span>Tecnologia StatTrak™</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={hasStatTrak}
                        onChange={(e) => setHasStatTrak(e.target.checked)}
                        className="accent-[#cf6a32] w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {hasStatTrak && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-sans text-stone-400">
                          Contador Inicial:
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={statTrakCount}
                          onChange={(e) =>
                            setStatTrakCount(
                              Math.max(0, parseInt(e.target.value) || 0),
                            )
                          }
                          className="w-24 h-7 px-2 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[12px] text-[#cf6a32] text-right focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Custom Nametag */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  <label className="text-[13px] font-sans font-medium text-white flex items-center gap-1.5">
                    <PiTag className="w-3.5 h-3.5 text-[#facc15]" />
                    <span>Etiqueta de Nome (Nametag)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={nametag}
                    onChange={(e) => setNametag(e.target.value)}
                    placeholder="Nome customizado..."
                    className="w-full h-9 px-3 rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[13px] font-sans text-[#facc15] placeholder:text-stone-500 focus:outline-none focus:border-[#facc15]/50"
                  />
                  <span className="text-[10px] font-mono text-stone-500 text-right">
                    {nametag.length}/20 caracteres
                  </span>
                </div>

                {/* 5. Quantity (for consumables) */}
                {!isEditing && !selectedItem.hasWear() && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <label className="text-[13px] font-sans font-medium text-white">
                      Quantidade a Criar:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(
                            1,
                            Math.min(20, parseInt(e.target.value) || 1),
                          ),
                        )
                      }
                      className="w-16 h-8 px-2 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[13px] text-white text-center focus:outline-none"
                    />
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-[6px] text-[13px] font-sans font-medium text-stone-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-2 rounded-[6px] bg-white text-black text-[13px] font-sans font-semibold hover:bg-stone-200 transition-colors cursor-pointer shadow-md"
                  >
                    {isEditing ? "Salvar Customização" : "Criar no Inventário"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── IMPORT INSPECT LINK MODAL ── */}
      <ImportInspectModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onOpenCraftWithItem={(item, attrs) => {
          setIsImportOpen(false);
          setSelectedItem(item);
          if (attrs.wear !== undefined) setWear(attrs.wear);
          if (attrs.seed !== undefined) setSeed(attrs.seed);
          if (attrs.nameTag !== undefined) setNametag(attrs.nameTag);
          if (attrs.statTrak !== undefined) {
            setHasStatTrak(true);
            setStatTrakCount(attrs.statTrak);
          }
        }}
      />

      {/* ── STICKER PICKER POPUP ── */}
      <AnimatePresence>
        {isPickingStickerSlot !== null && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPickingStickerSlot(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg rounded-[12px] bg-[#0c1216] border border-white/[0.1] p-5 shadow-2xl flex flex-col gap-4 max-h-[80vh] min-h-0"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[14px] font-sans font-semibold text-white">
                  Escolher Adesivo para Slot #{isPickingStickerSlot + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPickingStickerSlot(null)}
                  className="text-stone-400 hover:text-white cursor-pointer"
                >
                  <PiX className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={stickerSearch}
                  onChange={(e) => setStickerSearch(e.target.value)}
                  placeholder="Buscar adesivo..."
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded bg-white/[0.04] border border-white/[0.08] text-[13px] text-white focus:outline-none"
                />
              </div>

              <div
                data-lenis-prevent
                className="grid grid-cols-4 gap-2 overflow-y-auto max-h-72 p-1 overscroll-contain"
              >
                {availableStickers.map((stk) => {
                  const sImg = getItemImage(stk);
                  return (
                    <div
                      key={stk.id}
                      onClick={() => {
                        const next = [...stickers];
                        next[isPickingStickerSlot] = {
                          id: stk.id,
                          name: stk.name,
                          imageUrl: sImg || undefined,
                          wear: 0,
                          slot: isPickingStickerSlot,
                        };
                        setStickers(next);
                        setIsPickingStickerSlot(null);
                      }}
                      className="p-2 rounded bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer flex flex-col items-center text-center gap-1"
                    >
                      {sImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sImg}
                          alt={stk.name}
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <PiSticker className="w-8 h-8 text-[#92bce3]" />
                      )}
                      <span className="text-[10px] font-sans text-stone-300 truncate w-full">
                        {stk.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── KEYCHAIN PICKER POPUP ── */}
      <AnimatePresence>
        {isPickingKeychain && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPickingKeychain(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg rounded-[12px] bg-[#0c1216] border border-white/[0.1] p-5 shadow-2xl flex flex-col gap-4 max-h-[80vh] min-h-0"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[14px] font-sans font-semibold text-white">
                  Escolher Chaveiro (Charm)
                </span>
                <button
                  type="button"
                  onClick={() => setIsPickingKeychain(false)}
                  className="text-stone-400 hover:text-white cursor-pointer"
                >
                  <PiX className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={keychainSearch}
                  onChange={(e) => setKeychainSearch(e.target.value)}
                  placeholder="Buscar chaveiro..."
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded bg-white/[0.04] border border-white/[0.08] text-[13px] text-white focus:outline-none"
                />
              </div>

              <div
                data-lenis-prevent
                className="grid grid-cols-3 gap-2 overflow-y-auto max-h-72 p-1 overscroll-contain"
              >
                {availableKeychains.map((k) => {
                  const kImg = getItemImage(k);
                  return (
                    <div
                      key={k.id}
                      onClick={() => {
                        setKeychain({
                          id: k.id,
                          name: k.name,
                          imageUrl: kImg || undefined,
                          seed: Math.floor(Math.random() * 1000),
                        });
                        setIsPickingKeychain(false);
                      }}
                      className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer flex flex-col items-center text-center gap-1.5"
                    >
                      {kImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={kImg}
                          alt={k.name}
                          className="w-14 h-14 object-contain"
                        />
                      ) : (
                        <PiSparkle className="w-8 h-8 text-[#e5c158]" />
                      )}
                      <span className="text-[11px] font-sans text-stone-300 truncate w-full">
                        {k.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
