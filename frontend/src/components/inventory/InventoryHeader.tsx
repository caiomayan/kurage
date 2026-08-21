"use client";

import React from "react";
import {
  PiMagnifyingGlass,
  PiPlus,
  PiLockKeyOpen,
  PiArrowsClockwise,
  PiTrash,
  PiCaretDown,
  PiDownloadSimple,
  PiSquaresFour,
  PiShieldCheck,
} from "react-icons/pi";
import { cn } from "@/lib/utils";
import { useKurageInventory } from "@/lib/inventory/inventory-context";

export type InventoryCategory =
  | "all"
  | "pistol"
  | "rifle"
  | "smg"
  | "heavy"
  | "knife"
  | "glove"
  | "sticker"
  | "keychain"
  | "agent"
  | "musickit"
  | "case";

export type InventoryViewMode = "grid" | "loadout";

interface InventoryHeaderProps {
  viewMode: InventoryViewMode;
  onViewModeChange: (mode: InventoryViewMode) => void;
  search: string;
  onSearchChange: (val: string) => void;
  category: InventoryCategory;
  onCategoryChange: (cat: InventoryCategory) => void;
  sortBy: "equipped" | "newest" | "rarity" | "name" | "type";
  onSortChange: (sort: "equipped" | "newest" | "rarity" | "name" | "type") => void;
  onOpenCraft: () => void;
  onOpenCase: () => void;
  onOpenImport: () => void;
}

export function InventoryHeader({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sortBy,
  onSortChange,
  onOpenCraft,
  onOpenCase,
  onOpenImport,
}: InventoryHeaderProps) {
  const { itemCount, maxItems, isSyncing, clearInventory, syncNow } = useKurageInventory();

  const categories: Array<{ id: InventoryCategory; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "pistol", label: "Pistolas" },
    { id: "rifle", label: "Rifles" },
    { id: "smg", label: "SMGs" },
    { id: "heavy", label: "Pesadas" },
    { id: "knife", label: "Facas" },
    { id: "glove", label: "Luvas" },
    { id: "sticker", label: "Adesivos" },
    { id: "keychain", label: "Chaveiros" },
    { id: "agent", label: "Agentes" },
    { id: "musickit", label: "Músicas" },
    { id: "case", label: "Caixas" },
  ];

  return (
    <div className="flex flex-col gap-5 border-b border-white/[0.06] pb-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Inventory Title & Sync indicator */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[24px] sm:text-[28px] font-bold text-white tracking-tight leading-none">
                Simulador de Inventário & Craft
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#a9c8c0]/15 border border-[#a9c8c0]/30 text-[11px] font-mono font-bold text-[#a9c8c0]">
                {itemCount} / {maxItems}
              </span>
            </div>
            <span className="text-[12px] font-sans text-stone-400 mt-1">
              Customização completa de skins CS2 sincronizada com o servidor O Mar.
            </span>
          </div>
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sync Status Button */}
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing}
            className="h-9 px-3 rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-sans text-stone-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sincronizar com o Servidor"
          >
            <PiArrowsClockwise className={cn("w-3.5 h-3.5 text-[#a9c8c0]", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizado"}</span>
          </button>

          {/* Import !i / Link Button */}
          <button
            type="button"
            onClick={onOpenImport}
            className="h-9 px-3.5 rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-sans font-medium text-stone-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PiDownloadSimple className="w-3.5 h-3.5 text-[#a9c8c0]" />
            <span>Importar !i</span>
          </button>

          {/* Open Case Button */}
          <button
            type="button"
            onClick={onOpenCase}
            className="h-9 px-3.5 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[13px] font-sans font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PiLockKeyOpen className="w-4 h-4 text-[#e5c158]" />
            <span>Abrir Caixa</span>
          </button>

          {/* Craft Skin Button */}
          <button
            type="button"
            onClick={onOpenCraft}
            className="h-9 px-4 rounded-[6px] bg-white text-black text-[13px] font-sans font-semibold hover:bg-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <PiPlus className="w-4 h-4" />
            <span>Criar Skin (Craft)</span>
          </button>
        </div>
      </div>

      {/* ── VIEW MODE SWITCHER (GRID vs LOADOUT) ── */}
      <div className="flex items-center gap-2 pt-1">
        <div className="inline-flex items-center p-1 rounded-[8px] bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-[12px] font-sans font-semibold transition-all cursor-pointer",
              viewMode === "grid"
                ? "bg-white text-black shadow-sm"
                : "text-stone-400 hover:text-white"
            )}
          >
            <PiSquaresFour className="w-4 h-4" />
            <span>Todas as Skins (Grade)</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("loadout")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-[12px] font-sans font-semibold transition-all cursor-pointer",
              viewMode === "loadout"
                ? "bg-[#a9c8c0] text-black shadow-sm font-bold"
                : "text-stone-400 hover:text-white"
            )}
          >
            <PiShieldCheck className="w-4 h-4" />
            <span>Loadout Ativo (CT / TR)</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar (Only shown in Grid Mode) */}
      {viewMode === "grid" && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 animate-in fade-in">
          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-[6px] text-[12px] font-sans font-medium transition-colors cursor-pointer shrink-0",
                  category === cat.id
                    ? "bg-white/[0.1] text-white font-semibold border border-white/[0.15]"
                    : "bg-transparent text-stone-400 hover:text-stone-200 hover:bg-white/[0.03]"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filtrar inventário..."
                className="w-full h-8 pl-8 pr-3 rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[12px] font-sans text-white placeholder:text-stone-500 focus:outline-none focus:border-[#a9c8c0]/50"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as any)}
                className="h-8 appearance-none pl-3 pr-7 rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[12px] font-sans text-stone-300 focus:outline-none cursor-pointer"
              >
                <option value="equipped" className="bg-[#0c1216]">Equipados Primeiro</option>
                <option value="newest" className="bg-[#0c1216]">Mais Recentes</option>
                <option value="rarity" className="bg-[#0c1216]">Por Raridade</option>
                <option value="name" className="bg-[#0c1216]">Por Nome</option>
                <option value="type" className="bg-[#0c1216]">Por Tipo</option>
              </select>
              <PiCaretDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
            </div>

            {/* Clear inventory button if items exist */}
            {itemCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Deseja realmente limpar todos os itens do inventário?")) {
                    clearInventory();
                  }
                }}
                className="p-2 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                title="Limpar Inventário Completo"
              >
                <PiTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
