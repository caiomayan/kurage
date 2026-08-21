"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  PiShield,
  PiSkull,
  PiSword,
  PiHand,
  PiUser,
  PiMusicNotes,
  PiMedal,
  PiSparkle,
  PiEye,
  PiCopy,
  PiPlus,
  PiSpinnerGap,
  PiSquaresFour,
  PiShieldCheck,
  PiCheck,
} from "react-icons/pi";
import { CS2Inventory, CS2Team } from "@ianlucas/cs2-lib";
import { generateInspectLink } from "@ianlucas/cs2-lib-inspect";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { TransformedInventoryItem, transformItem } from "@/lib/inventory/inventory-transform";
import { parseItemName, getItemImage } from "@/lib/inventory/economy-naming";
import { Inspect3DModal } from "@/components/inventory/Inspect3DModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlayerInventoryShowcaseProps {
  steamId64: string;
  isOwner?: boolean;
}

export function PlayerInventoryShowcase({ steamId64, isOwner = false }: PlayerInventoryShowcaseProps) {
  const { isAuthenticated } = useAuth();
  const { craft, items: localOwnerItems } = useKurageInventory();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransformedInventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<"loadout" | "grid">("loadout");
  const [selectedTeam, setSelectedTeam] = useState<CS2Team>(CS2Team.CT);
  const [inspectingItem, setInspectingItem] = useState<TransformedInventoryItem | null>(null);
  const [copiedUid, setCopiedUid] = useState<number | null>(null);

  useEffect(() => {
    async function loadShowcase() {
      // If profile owner and we already have items locally, use them
      if (isOwner && localOwnerItems.length > 0) {
        setItems(localOwnerItems);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.get<any>(`/inventory/${steamId64}`);
        if (data && ((Array.isArray(data) && data.length > 0) || (typeof data === "object" && Object.keys(data).length > 0))) {
          const inv = new CS2Inventory({ data, maxItems: 1000 });
          const rawItems = inv.getAll();
          const transformed = rawItems.map(transformItem);
          setItems(transformed);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    if (steamId64) {
      loadShowcase();
    }
  }, [steamId64, isOwner, localOwnerItems]);

  // Copy inspect command to clipboard
  const handleCopyInspect = (itemData: TransformedInventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const inspectCommand = generateInspectLink(itemData.item);
      navigator.clipboard.writeText(inspectCommand);
      setCopiedUid(itemData.uid);
      setTimeout(() => setCopiedUid(null), 2000);
      toast.success("Comando !i copiado para a área de transferência!");
    } catch {
      toast.error("Erro ao gerar link de inspeção.");
    }
  };

  // Clone skin to visitor's own inventory
  const handleCloneSkin = (itemData: TransformedInventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Faça login com a Steam para adicionar skins ao seu inventário.");
      return;
    }

    try {
      const parsed = parseItemName(itemData.item);
      craft(itemData.item, {
        wear: itemData.item.wear,
        seed: itemData.item.seed,
        stattrak: itemData.item.statTrak !== undefined,
        nameTag: itemData.item.nameTag,
      });
      toast.success(`${parsed.weaponName} | ${parsed.skinName} clonada para o seu inventário!`);
    } catch {
      toast.error("Erro ao clonar skin.");
    }
  };

  // Group items by team for loadout
  const ctItems = useMemo(() => items.filter((i) => i.isEquippedCT), [items]);
  const tItems = useMemo(() => items.filter((i) => i.isEquippedT), [items]);
  const currentTeamItems = selectedTeam === CS2Team.CT ? ctItems : tItems;

  const knives = useMemo(() => currentTeamItems.filter((i) => i.item.isMelee()), [currentTeamItems]);
  const gloves = useMemo(() => currentTeamItems.filter((i) => i.item.isGloves()), [currentTeamItems]);
  const agents = useMemo(() => currentTeamItems.filter((i) => i.item.isAgent()), [currentTeamItems]);
  const rifles = useMemo(
    () => currentTeamItems.filter((i) => i.item.isInRifles() || i.item.isRifle() || i.item.isSniperRifle()),
    [currentTeamItems]
  );
  const pistols = useMemo(() => currentTeamItems.filter((i) => i.item.isPistol()), [currentTeamItems]);
  const midTiers = useMemo(
    () => currentTeamItems.filter((i) => i.item.isInMidTiers() || i.item.isSMG() || i.item.isHeavy()),
    [currentTeamItems]
  );

  if (loading) {
    return (
      <div className="py-24 rounded-[24px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] flex flex-col items-center justify-center gap-3">
        <PiSpinnerGap className="w-7 h-7 animate-spin text-[#a9c8c0]" />
        <span className="text-[13px] font-sans text-stone-400">Carregando inventário de skins...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 rounded-[24px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] p-8 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-stone-400">
          <PiSparkle className="w-6 h-6 text-[#a9c8c0]" />
        </div>
        <div className="flex flex-col gap-1 max-w-md">
          <h3 className="font-display text-[18px] font-bold text-white tracking-tight">
            Nenhuma skin personalizada encontrada
          </h3>
          <p className="text-[13px] font-sans text-stone-400">
            {isOwner
              ? "Você ainda não criou nenhuma skin no Simulador de Inventário."
              : "Este jogador ainda não configurou seu inventário personalizado no Kurage."}
          </p>
        </div>
        {isOwner && (
          <a
            href="/inventory"
            className="mt-2 h-9 px-4 rounded-[8px] bg-white text-black font-sans font-semibold text-[13px] hover:bg-stone-200 transition-colors flex items-center gap-2 shadow-md"
          >
            <PiPlus className="w-4 h-4" />
            <span>Abrir Simulador de Inventário</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── TOP CONTROLS & LOADOUT BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[20px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] shadow-xl">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-[10px] bg-black/40 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode("loadout")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-[7px] text-[12px] font-sans font-semibold transition-all cursor-pointer",
                viewMode === "loadout"
                  ? "bg-[#a9c8c0] text-black shadow-sm font-bold"
                  : "text-stone-400 hover:text-white"
              )}
            >
              <PiShieldCheck className="w-4 h-4" />
              <span>Loadout Oficial</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-[7px] text-[12px] font-sans font-semibold transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-white text-black shadow-sm"
                  : "text-stone-400 hover:text-white"
              )}
            >
              <PiSquaresFour className="w-4 h-4" />
              <span>Todas as Skins ({items.length})</span>
            </button>
          </div>
        </div>

        {/* Right: Team Toggle (in Loadout mode) or Stats summary */}
        {viewMode === "loadout" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTeam(CS2Team.CT)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] text-[12px] font-sans font-semibold transition-all cursor-pointer",
                selectedTeam === CS2Team.CT
                  ? "bg-[#92bce3]/20 border border-[#92bce3]/50 text-[#92bce3]"
                  : "bg-white/[0.02] border border-white/[0.06] text-stone-400 hover:text-white"
              )}
            >
              <PiShield className="w-3.5 h-3.5 text-[#92bce3]" />
              <span>CT ({ctItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTeam(CS2Team.T)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] text-[12px] font-sans font-semibold transition-all cursor-pointer",
                selectedTeam === CS2Team.T
                  ? "bg-[#e5c158]/20 border border-[#e5c158]/50 text-[#e5c158]"
                  : "bg-white/[0.02] border border-white/[0.06] text-stone-400 hover:text-white"
              )}
            >
              <PiSkull className="w-3.5 h-3.5 text-[#e5c158]" />
              <span>TR ({tItems.length})</span>
            </button>
          </div>
        ) : (
          <div className="text-[12px] font-sans text-stone-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#a9c8c0]" />
            <span>{items.length} skins personalizadas no Kurage</span>
          </div>
        )}
      </div>

      {/* ── LOADOUT VIEW ── */}
      {viewMode === "loadout" ? (
        <div className="flex flex-col gap-8 animate-in fade-in">
          {/* Hero Row: Knives, Gloves, Agents */}
          {(knives.length > 0 || gloves.length > 0 || agents.length > 0) && (
            <div className="flex flex-col gap-3">
              <h4 className="font-display text-[15px] font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#a9c8c0]" />
                Armamento Especial & Cosméticos
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {knives.map((it) => (
                  <ShowcaseCard
                    key={it.uid}
                    itemData={it}
                    copiedUid={copiedUid}
                    onInspect={() => setInspectingItem(it)}
                    onCopyInspect={(e) => handleCopyInspect(it, e)}
                    onCloneSkin={(e) => handleCloneSkin(it, e)}
                    isOwner={isOwner}
                  />
                ))}
                {gloves.map((it) => (
                  <ShowcaseCard
                    key={it.uid}
                    itemData={it}
                    copiedUid={copiedUid}
                    onInspect={() => setInspectingItem(it)}
                    onCopyInspect={(e) => handleCopyInspect(it, e)}
                    onCloneSkin={(e) => handleCloneSkin(it, e)}
                    isOwner={isOwner}
                  />
                ))}
                {agents.map((it) => (
                  <ShowcaseCard
                    key={it.uid}
                    itemData={it}
                    copiedUid={copiedUid}
                    onInspect={() => setInspectingItem(it)}
                    onCopyInspect={(e) => handleCopyInspect(it, e)}
                    onCloneSkin={(e) => handleCloneSkin(it, e)}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rifles & Snipers */}
          {rifles.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="font-display text-[15px] font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#92bce3]" />
                Rifles & Snipers
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {rifles.map((it) => (
                  <ShowcaseCard
                    key={it.uid}
                    itemData={it}
                    copiedUid={copiedUid}
                    onInspect={() => setInspectingItem(it)}
                    onCopyInspect={(e) => handleCopyInspect(it, e)}
                    onCloneSkin={(e) => handleCloneSkin(it, e)}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pistols */}
          {pistols.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="font-display text-[15px] font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e5c158]" />
                Pistolas
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {pistols.map((it) => (
                  <ShowcaseCard
                    key={it.uid}
                    itemData={it}
                    copiedUid={copiedUid}
                    onInspect={() => setInspectingItem(it)}
                    onCopyInspect={(e) => handleCopyInspect(it, e)}
                    onCloneSkin={(e) => handleCloneSkin(it, e)}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mid-Tiers */}
          {midTiers.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="font-display text-[15px] font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                Intermediárias (SMGs & Pesadas)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {midTiers.map((it) => (
                  <ShowcaseCard
                    key={it.uid}
                    itemData={it}
                    copiedUid={copiedUid}
                    onInspect={() => setInspectingItem(it)}
                    onCopyInspect={(e) => handleCopyInspect(it, e)}
                    onCloneSkin={(e) => handleCloneSkin(it, e)}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── FULL GRID VIEW ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 animate-in fade-in">
          {items.map((it) => (
            <ShowcaseCard
              key={it.uid}
              itemData={it}
              copiedUid={copiedUid}
              onInspect={() => setInspectingItem(it)}
              onCopyInspect={(e) => handleCopyInspect(it, e)}
              onCloneSkin={(e) => handleCloneSkin(it, e)}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}

      {/* 3D Inspect Modal */}
      <Inspect3DModal
        itemData={inspectingItem}
        onClose={() => setInspectingItem(null)}
      />
    </div>
  );
}

// ── SHOWCASE CARD SUB-COMPONENT ──
function ShowcaseCard({
  itemData,
  copiedUid,
  onInspect,
  onCopyInspect,
  onCloneSkin,
  isOwner,
}: {
  itemData: TransformedInventoryItem;
  copiedUid: number | null;
  onInspect: () => void;
  onCopyInspect: (e: React.MouseEvent) => void;
  onCloneSkin: (e: React.MouseEvent) => void;
  isOwner: boolean;
}) {
  const parsed = parseItemName(itemData.item);
  const imgSrc = getItemImage(itemData.item) || itemData.imageUrl;
  const isCopied = copiedUid === itemData.uid;

  return (
    <div
      onClick={onInspect}
      className="group relative flex flex-col p-3.5 rounded-[16px] bg-[#060a0d]/90 hover:bg-white/[0.05] border border-white/[0.08] hover:border-[#a9c8c0]/40 transition-all cursor-pointer shadow-lg overflow-hidden"
    >
      {/* Top Header info */}
      <div className="flex items-center justify-between text-[11px] font-sans text-stone-400 mb-1 z-10">
        <span className="truncate font-medium text-stone-300">{parsed.weaponName}</span>
        {itemData.item.statTrak !== undefined && (
          <span className="px-1.5 py-0.2 rounded bg-[#cf6a32]/20 text-[#cf6a32] text-[10px] font-mono font-bold">
            ST™
          </span>
        )}
      </div>

      {/* Image Preview */}
      <div className="relative w-full aspect-[4/3] rounded-[10px] bg-black/40 flex items-center justify-center overflow-hidden my-1">
        <Image
          src={imgSrc}
          alt={parsed.skinName}
          width={180}
          height={135}
          className="object-contain w-[85%] h-[85%] drop-shadow-md group-hover:scale-105 transition-transform"
          unoptimized
        />

        {/* Hover Quick Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 backdrop-blur-[2px] transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect();
            }}
            className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
            title="Inspecionar 3D"
          >
            <PiEye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onCopyInspect}
            className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
            title="Copiar Comando !i"
          >
            {isCopied ? <PiCheck className="w-4 h-4 text-[#a9c8c0]" /> : <PiCopy className="w-4 h-4" />}
          </button>

          {!isOwner && (
            <button
              type="button"
              onClick={onCloneSkin}
              className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-[#a9c8c0] transition-colors"
              title="Adicionar ao meu inventário"
            >
              <PiPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="flex flex-col gap-0.5 mt-1 z-10">
        <span className="text-[13px] font-sans font-bold text-white truncate">{parsed.skinName}</span>
        <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mt-1 pt-1.5 border-t border-white/[0.04]">
          <span>{itemData.wearShort || "Padrão"}</span>
          {itemData.item.wear !== undefined && <span>{itemData.item.wear.toFixed(4)}</span>}
        </div>
      </div>
    </div>
  );
}
