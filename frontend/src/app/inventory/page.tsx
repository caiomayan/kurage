"use client";

import React, { useState, useMemo } from "react";
import {
  PiSparkle,
  PiPlus,
  PiLockKeyOpen,
  PiSpinnerGap,
  PiDownloadSimple,
} from "react-icons/pi";
import { CS2EconomyItem, CS2BaseInventoryItem } from "@ianlucas/cs2-lib";
import { InventoryProvider, useKurageInventory } from "@/lib/inventory/inventory-context";
import { TransformedInventoryItem, sortInventoryItems } from "@/lib/inventory/inventory-transform";
import { InventoryHeader, InventoryCategory, InventoryViewMode } from "@/components/inventory/InventoryHeader";
import { InventoryItemCard } from "@/components/inventory/InventoryItemCard";
import { LoadoutViewer } from "@/components/inventory/LoadoutViewer";
import { CraftModal } from "@/components/inventory/CraftModal";
import { Inspect3DModal } from "@/components/inventory/Inspect3DModal";
import { CaseOpeningModal } from "@/components/inventory/CaseOpeningModal";
import { ImportInspectModal } from "@/components/inventory/ImportInspectModal";

export default function InventoryPage() {
  const { items, isLoading, itemCount } = useKurageInventory();

  // View mode (Grid vs Loadout)
  const [viewMode, setViewMode] = useState<InventoryViewMode>("grid");

  // Filters & Sorting state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("all");
  const [sortBy, setSortBy] = useState<"equipped" | "newest" | "rarity" | "name" | "type">("equipped");

  // Modals state
  const [isCraftOpen, setIsCraftOpen] = useState(false);
  const [isCaseOpen, setIsCaseOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<TransformedInventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<TransformedInventoryItem | null>(null);
  const [preselectedEconomyItem, setPreselectedEconomyItem] = useState<CS2EconomyItem | null>(null);
  const [preselectedAttributes, setPreselectedAttributes] = useState<Partial<CS2BaseInventoryItem> | null>(null);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = items;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (it) =>
          it.item.name.toLowerCase().includes(q) ||
          (it.item.nameTag && it.item.nameTag.toLowerCase().includes(q))
      );
    }

    // Category filter using cs2-lib type predicates
    if (category !== "all") {
      result = result.filter((it) => {
        const item = it.item;
        if (category === "pistol") return item.isPistol();
        if (category === "rifle") return item.isRifle();
        if (category === "smg") return item.isSMG();
        if (category === "heavy") return item.isHeavy();
        if (category === "knife") return item.isMelee();
        if (category === "glove") return item.isGloves();
        if (category === "sticker") return item.isSticker();
        if (category === "keychain") return item.isKeychain();
        if (category === "agent") return item.isAgent();
        if (category === "musickit") return item.isMusicKit();
        if (category === "case") return item.isContainer();
        return true;
      });
    }

    return sortInventoryItems(result, sortBy);
  }, [items, search, category, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020507] flex items-center justify-center text-ink">
        <PiSpinnerGap className="w-8 h-8 animate-spin text-[#a9c8c0]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020507] font-sans text-ink pb-36 pt-24 sm:pt-32">
      {/* ── SUBTLE OCEANIC ATMOSPHERE ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.05] blur-[160px]"
          style={{ background: "radial-gradient(circle, #a9c8c0 0%, #92bce3 50%, transparent 70%)" }}
        />
      </div>

      {/* ── MAIN CONTAINER ── */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Toolbar */}
        <InventoryHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onOpenCraft={() => {
            setEditingItem(null);
            setPreselectedEconomyItem(null);
            setPreselectedAttributes(null);
            setIsCraftOpen(true);
          }}
          onOpenCase={() => setIsCaseOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
        />

        {/* ── MAIN CONTENT: GRID vs LOADOUT ── */}
        <div className="mt-8">
          {viewMode === "loadout" ? (
            /* Loadout Active View */
            <LoadoutViewer
              onInspect={(it) => setInspectingItem(it)}
              onEdit={(it) => {
                setEditingItem(it);
                setPreselectedEconomyItem(null);
                setPreselectedAttributes(null);
                setIsCraftOpen(true);
              }}
              onOpenCraft={(_category) => {
                setEditingItem(null);
                setPreselectedEconomyItem(null);
                setPreselectedAttributes(null);
                setIsCraftOpen(true);
              }}
            />
          ) : filteredItems.length > 0 ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 animate-in fade-in">
              {filteredItems.map((itemData) => (
                <InventoryItemCard
                  key={itemData.uid}
                  itemData={itemData}
                  onInspect={(it) => setInspectingItem(it)}
                  onEdit={(it) => {
                    setEditingItem(it);
                    setPreselectedEconomyItem(null);
                    setPreselectedAttributes(null);
                    setIsCraftOpen(true);
                  }}
                  onApplySticker={(it) => {
                    setEditingItem(it);
                    setPreselectedEconomyItem(null);
                    setPreselectedAttributes(null);
                    setIsCraftOpen(true);
                  }}
                  onApplyKeychain={(it) => {
                    setEditingItem(it);
                    setPreselectedEconomyItem(null);
                    setPreselectedAttributes(null);
                    setIsCraftOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="py-24 rounded-[16px] bg-white/[0.015] border border-white/[0.06] flex flex-col items-center justify-center text-center p-6 gap-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-[#a9c8c0]/10 border border-[#a9c8c0]/20 flex items-center justify-center text-[#a9c8c0]">
                <PiSparkle className="w-6 h-6" />
              </div>

              <div className="flex flex-col gap-1 max-w-md">
                <h3 className="font-display text-[20px] font-bold text-white tracking-tight">
                  {itemCount === 0 ? "Seu inventário está vazio" : "Nenhum item encontrado"}
                </h3>
                <p className="text-[13px] font-sans text-stone-400 leading-relaxed">
                  {itemCount === 0
                    ? "Crie sua primeira skin personalizada no Estúdio de Crafting, importe um link de inspeção ou abra caixas gratuitamente."
                    : "Tente ajustar seus filtros de categoria ou termo de busca acima."}
                </p>
              </div>

              {itemCount === 0 && (
                <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setPreselectedEconomyItem(null);
                      setPreselectedAttributes(null);
                      setIsCraftOpen(true);
                    }}
                    className="h-10 px-5 rounded-[8px] bg-white text-black font-sans font-semibold text-[13px] hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <PiPlus className="w-4 h-4" />
                    <span>Criar Primeira Skin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="h-10 px-4 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-sans font-medium text-[13px] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <PiDownloadSimple className="w-4 h-4 text-[#a9c8c0]" />
                    <span>Importar !i / Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCaseOpen(true)}
                    className="h-10 px-4 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-sans font-medium text-[13px] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <PiLockKeyOpen className="w-4 h-4 text-[#e5c158]" />
                    <span>Abrir Caixa</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {/* 1. Crafting Studio Modal */}
      <CraftModal
        isOpen={isCraftOpen}
        onClose={() => {
          setIsCraftOpen(false);
          setEditingItem(null);
          setPreselectedEconomyItem(null);
          setPreselectedAttributes(null);
        }}
        initialItemData={editingItem}
        preselectedItem={preselectedEconomyItem}
        initialAttributes={preselectedAttributes}
      />

      {/* 2. Inspect 3D Modal */}
      <Inspect3DModal
        itemData={inspectingItem}
        onClose={() => setInspectingItem(null)}
        onEdit={(it) => {
          setInspectingItem(null);
          setEditingItem(it);
          setIsCraftOpen(true);
        }}
      />

      {/* 3. Case Opening Modal */}
      <CaseOpeningModal
        isOpen={isCaseOpen}
        onClose={() => setIsCaseOpen(false)}
      />

      {/* 4. Import Inspect Link Modal */}
      <ImportInspectModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onOpenCraftWithItem={(econItem, attrs) => {
          setIsImportOpen(false);
          setEditingItem(null);
          setPreselectedEconomyItem(econItem);
          setPreselectedAttributes(attrs);
          setIsCraftOpen(true);
        }}
      />
    </div>
  );
}
