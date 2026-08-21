"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  PiShield,
  PiSkull,
  PiSword,
  PiHand,
  PiUser,
  PiMusicNotes,
  PiMedal,
  PiPlus,
  PiArrowsClockwise,
  PiX,
  PiSparkle,
  PiEye,
  PiTrash,
} from "react-icons/pi";
import { CS2Team } from "@ianlucas/cs2-lib";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { parseItemName, getItemImage } from "@/lib/inventory/economy-naming";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LoadoutViewerProps {
  onInspect: (item: TransformedInventoryItem) => void;
  onEdit: (item: TransformedInventoryItem) => void;
  onOpenCraft: (preselectedCategory?: string) => void;
}

type LoadoutSlotType = "knife" | "glove" | "agent" | "pistol" | "midTier" | "rifle" | "musickit" | "collectible";

interface SlotDefinition {
  id: string;
  type: LoadoutSlotType;
  label: string;
  index?: number;
  icon: React.ComponentType<{ className?: string }>;
  filterPredicate: (item: TransformedInventoryItem["item"], team: CS2Team) => boolean;
}

export function LoadoutViewer({ onInspect, onEdit, onOpenCraft }: LoadoutViewerProps) {
  const { items, equip, unequip } = useKurageInventory();
  const [selectedTeam, setSelectedTeam] = useState<CS2Team>(CS2Team.CT);
  const [selectingSlot, setSelectingSlot] = useState<SlotDefinition | null>(null);

  // Separate items equipped on CT and TR
  const equippedForCurrentTeam = useMemo(() => {
    return items.filter((it) => {
      if (selectedTeam === CS2Team.CT) {
        return it.isEquippedCT;
      }
      return it.isEquippedT;
    });
  }, [items, selectedTeam]);

  // Define official slots structure
  const specialSlots: SlotDefinition[] = useMemo(
    () => [
      {
        id: "knife",
        type: "knife",
        label: "Faca / Lâmina",
        icon: PiSword,
        filterPredicate: (it) => it.isMelee(),
      },
      {
        id: "glove",
        type: "glove",
        label: "Luvas Táticas",
        icon: PiHand,
        filterPredicate: (it) => it.isGloves(),
      },
      {
        id: "agent",
        type: "agent",
        label: selectedTeam === CS2Team.CT ? "Agente Especial (CT)" : "Agente Especial (TR)",
        icon: PiUser,
        filterPredicate: (it, team) => !it.teams || it.teams.length === 0 || it.teams.includes(team as any),
      },
      {
        id: "musickit",
        type: "musickit",
        label: "Kit de Música (MVP)",
        icon: PiMusicNotes,
        filterPredicate: (it) => it.isMusicKit(),
      },
      {
        id: "collectible",
        type: "collectible",
        label: "Pin / Medalha",
        icon: PiMedal,
        filterPredicate: (it) => it.isCollectible(),
      },
    ],
    [selectedTeam]
  );

  // Group equipped items by category
  const equippedKnives = equippedForCurrentTeam.filter((it) => it.item.isMelee());
  const equippedGloves = equippedForCurrentTeam.filter((it) => it.item.isGloves());
  const equippedAgents = equippedForCurrentTeam.filter((it) => it.item.isAgent());
  const equippedMusicKits = equippedForCurrentTeam.filter((it) => it.item.isMusicKit());
  const equippedCollectibles = equippedForCurrentTeam.filter((it) => it.item.isCollectible());
  const equippedPistols = equippedForCurrentTeam.filter((it) => it.item.isPistol());
  const equippedMidTiers = equippedForCurrentTeam.filter((it) => it.item.isInMidTiers() || it.item.isSMG() || it.item.isHeavy());
  const equippedRifles = equippedForCurrentTeam.filter((it) => it.item.isInRifles() || it.item.isRifle() || it.item.isSniperRifle());

  // Compatible items in inventory for the currently selected slot popover
  const compatibleInventoryItems = useMemo(() => {
    if (!selectingSlot) return [];
    return items.filter((it) => selectingSlot.filterPredicate(it.item, selectedTeam));
  }, [items, selectingSlot, selectedTeam]);

  // Handle equip action
  const handleEquipItem = (itemData: TransformedInventoryItem) => {
    equip(itemData.uid, selectedTeam);
    toast.success(`Equipado no lado ${selectedTeam === CS2Team.CT ? "Contraterrorista (CT)" : "Terrorista (TR)"}!`);
    setSelectingSlot(null);
  };

  // Handle unequip action
  const handleUnequipItem = (itemData: TransformedInventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    unequip(itemData.uid, selectedTeam);
    toast.info("Item desequipado.");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── TEAM SELECTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[14px] bg-white/[0.02] border border-white/[0.06]">
        {/* Team Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-[10px] bg-black/40 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setSelectedTeam(CS2Team.CT)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2 rounded-[8px] text-[13px] font-sans font-semibold transition-all cursor-pointer",
              selectedTeam === CS2Team.CT
                ? "bg-[#92bce3]/20 border border-[#92bce3]/40 text-[#92bce3] shadow-[0_0_15px_rgba(146,188,227,0.15)]"
                : "text-stone-400 hover:text-white"
            )}
          >
            <PiShield className="w-4 h-4 text-[#92bce3]" />
            <span>Contraterroristas (CT)</span>
            <span className="px-1.5 py-0.5 rounded bg-black/50 text-[11px] font-mono text-[#92bce3]/80">
              {items.filter((i) => i.isEquippedCT).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTeam(CS2Team.T)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2 rounded-[8px] text-[13px] font-sans font-semibold transition-all cursor-pointer",
              selectedTeam === CS2Team.T
                ? "bg-[#e5c158]/20 border border-[#e5c158]/40 text-[#e5c158] shadow-[0_0_15px_rgba(229,193,88,0.15)]"
                : "text-stone-400 hover:text-white"
            )}
          >
            <PiSkull className="w-4 h-4 text-[#e5c158]" />
            <span>Terroristas (TR)</span>
            <span className="px-1.5 py-0.5 rounded bg-black/50 text-[11px] font-mono text-[#e5c158]/80">
              {items.filter((i) => i.isEquippedT).length}
            </span>
          </button>
        </div>

        {/* Action helper */}
        <div className="flex items-center gap-2 text-[12px] font-sans text-stone-400">
          <PiSparkle className="w-4 h-4 text-[#a9c8c0]" />
          <span>Itens equipados são salvos automaticamente no seu perfil e sincronizados no servidor.</span>
        </div>
      </div>

      {/* ── SECTION 1: HERO SLOTS (KNIFE, GLOVES, AGENT, MUSIC KIT, COLLECTIBLE) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#a9c8c0]" />
            Armamento Especial & Cosméticos
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {specialSlots.map((slot) => {
            let equippedItem: TransformedInventoryItem | undefined;
            if (slot.type === "knife") equippedItem = equippedKnives[0];
            if (slot.type === "glove") equippedItem = equippedGloves[0];
            if (slot.type === "agent") equippedItem = equippedAgents[0];
            if (slot.type === "musickit") equippedItem = equippedMusicKits[0];
            if (slot.type === "collectible") equippedItem = equippedCollectibles[0];

            return (
              <SlotCard
                key={slot.id}
                slot={slot}
                equippedItem={equippedItem}
                selectedTeam={selectedTeam}
                onSelectSlot={() => setSelectingSlot(slot)}
                onInspect={onInspect}
                onUnequip={handleUnequipItem}
              />
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: RIFLES & SNIPERS (PRIMARY) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#92bce3]" />
            Rifles & Snipers (Armas Primárias)
          </h2>
          <button
            type="button"
            onClick={() =>
              setSelectingSlot({
                id: "rifle",
                type: "rifle",
                label: "Rifles & Snipers",
                icon: PiSword,
                filterPredicate: (it) => it.isInRifles() || it.isRifle() || it.isSniperRifle(),
              })
            }
            className="text-[12px] font-sans text-[#a9c8c0] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <PiPlus className="w-3.5 h-3.5" />
            <span>Equipar Rifle</span>
          </button>
        </div>

        {equippedRifles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {equippedRifles.map((it) => (
              <EquippedItemCard
                key={it.uid}
                itemData={it}
                selectedTeam={selectedTeam}
                onInspect={onInspect}
                onEdit={onEdit}
                onUnequip={handleUnequipItem}
                onChange={() =>
                  setSelectingSlot({
                    id: "rifle",
                    type: "rifle",
                    label: "Rifles & Snipers",
                    icon: PiSword,
                    filterPredicate: (item) => item.isInRifles() || item.isRifle() || item.isSniperRifle(),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <EmptyCategorySlot
            label="Nenhum rifle equipado"
            description="Equipe sua AK-47, M4A4, M4A1-S, AWP ou Scout para este lado."
            onAdd={() =>
              setSelectingSlot({
                id: "rifle",
                type: "rifle",
                label: "Rifles & Snipers",
                icon: PiSword,
                filterPredicate: (it) => it.isInRifles() || it.isRifle() || it.isSniperRifle(),
              })
            }
          />
        )}
      </div>

      {/* ── SECTION 3: PISTOLS (SECONDARY) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e5c158]" />
            Pistolas (Armas Secundárias)
          </h2>
          <button
            type="button"
            onClick={() =>
              setSelectingSlot({
                id: "pistol",
                type: "pistol",
                label: "Pistolas",
                icon: PiSword,
                filterPredicate: (it) => it.isPistol(),
              })
            }
            className="text-[12px] font-sans text-[#a9c8c0] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <PiPlus className="w-3.5 h-3.5" />
            <span>Equipar Pistola</span>
          </button>
        </div>

        {equippedPistols.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {equippedPistols.map((it) => (
              <EquippedItemCard
                key={it.uid}
                itemData={it}
                selectedTeam={selectedTeam}
                onInspect={onInspect}
                onEdit={onEdit}
                onUnequip={handleUnequipItem}
                onChange={() =>
                  setSelectingSlot({
                    id: "pistol",
                    type: "pistol",
                    label: "Pistolas",
                    icon: PiSword,
                    filterPredicate: (item) => item.isPistol(),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <EmptyCategorySlot
            label="Nenhuma pistola equipada"
            description="Equipe sua Glock-18, USP-S, Desert Eagle, P250 ou Tec-9."
            onAdd={() =>
              setSelectingSlot({
                id: "pistol",
                type: "pistol",
                label: "Pistolas",
                icon: PiSword,
                filterPredicate: (it) => it.isPistol(),
              })
            }
          />
        )}
      </div>

      {/* ── SECTION 4: MID-TIER (SMGS & HEAVY) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-400" />
            Intermediárias (SMGs & Armas Pesadas)
          </h2>
          <button
            type="button"
            onClick={() =>
              setSelectingSlot({
                id: "midTier",
                type: "midTier",
                label: "Intermediárias (SMG / Pesadas)",
                icon: PiSword,
                filterPredicate: (it) => it.isInMidTiers() || it.isSMG() || it.isHeavy(),
              })
            }
            className="text-[12px] font-sans text-[#a9c8c0] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <PiPlus className="w-3.5 h-3.5" />
            <span>Equipar SMG / Pesada</span>
          </button>
        </div>

        {equippedMidTiers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {equippedMidTiers.map((it) => (
              <EquippedItemCard
                key={it.uid}
                itemData={it}
                selectedTeam={selectedTeam}
                onInspect={onInspect}
                onEdit={onEdit}
                onUnequip={handleUnequipItem}
                onChange={() =>
                  setSelectingSlot({
                    id: "midTier",
                    type: "midTier",
                    label: "Intermediárias (SMG / Pesadas)",
                    icon: PiSword,
                    filterPredicate: (item) => item.isInMidTiers() || item.isSMG() || item.isHeavy(),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <EmptyCategorySlot
            label="Nenhuma arma intermediária equipada"
            description="Equipe sua MP9, MAC-10, MP7, P90, Shotgun ou Negev."
            onAdd={() =>
              setSelectingSlot({
                id: "midTier",
                type: "midTier",
                label: "Intermediárias (SMG / Pesadas)",
                icon: PiSword,
                filterPredicate: (it) => it.isInMidTiers() || it.isSMG() || it.isHeavy(),
              })
            }
          />
        )}
      </div>

      {/* ── SELECT ITEM MODAL / DRAWER ── */}
      {selectingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div
            data-lenis-prevent="true"
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#070b0e] border border-white/[0.1] rounded-[16px] shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <selectingSlot.icon className="w-5 h-5 text-[#a9c8c0]" />
                <div className="flex flex-col">
                  <h3 className="font-display text-[17px] font-bold text-white tracking-tight">
                    Equipar {selectingSlot.label}
                  </h3>
                  <span className="text-[12px] font-sans text-stone-400">
                    Selecione uma skin do seu inventário para o lado{" "}
                    {selectedTeam === CS2Team.CT ? "CT (Contraterrorista)" : "TR (Terrorista)"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectingSlot(null)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <PiX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Compatible Items List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 scrollbar-thin">
              {compatibleInventoryItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {compatibleInventoryItems.map((itemData) => {
                    const parsed = parseItemName(itemData.item);
                    const isEquippedCurrent =
                      selectedTeam === CS2Team.CT ? itemData.isEquippedCT : itemData.isEquippedT;
                    const imgSrc = getItemImage(itemData.item) || itemData.imageUrl;

                    return (
                      <div
                        key={itemData.uid}
                        onClick={() => handleEquipItem(itemData)}
                        className={cn(
                          "relative group flex flex-col p-3 rounded-[12px] border transition-all cursor-pointer",
                          isEquippedCurrent
                            ? "bg-[#a9c8c0]/15 border-[#a9c8c0]/50 shadow-[0_0_15px_rgba(169,200,192,0.15)]"
                            : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/[0.2]"
                        )}
                      >
                        {/* Image Preview */}
                        <div className="relative w-full aspect-[4/3] rounded-[8px] bg-black/40 flex items-center justify-center overflow-hidden mb-2">
                          <Image
                            src={imgSrc}
                            alt={parsed.skinName}
                            width={160}
                            height={120}
                            className="object-contain w-[85%] h-[85%] drop-shadow-md group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        </div>

                        {/* Weapon & Skin Name */}
                        <span className="text-[11px] font-sans text-stone-400 truncate">{parsed.weaponName}</span>
                        <span className="text-[13px] font-sans font-bold text-white truncate">{parsed.skinName}</span>

                        {/* Equipped badge or action */}
                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                          {itemData.wearShort ? (
                            <span className="text-[10px] font-mono text-stone-400">{itemData.wearShort}</span>
                          ) : (
                            <span />
                          )}
                          <span
                            className={cn(
                              "text-[11px] font-sans font-semibold px-2 py-0.5 rounded",
                              isEquippedCurrent ? "bg-[#a9c8c0] text-black" : "bg-white/10 text-white group-hover:bg-white group-hover:text-black transition-colors"
                            )}
                          >
                            {isEquippedCurrent ? "Equipado" : "Equipar"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* No Compatible Items */
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-stone-400">
                    <selectingSlot.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <p className="text-[14px] font-sans font-medium text-white">
                      Você ainda não possui {selectingSlot.label.toLowerCase()} no seu inventário.
                    </p>
                    <p className="text-[12px] font-sans text-stone-400">
                      Crie uma skin personalizada para este slot no Estúdio de Crafting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const slotId = selectingSlot.id;
                      setSelectingSlot(null);
                      onOpenCraft(slotId);
                    }}
                    className="mt-2 h-9 px-4 rounded-[6px] bg-white text-black font-sans font-semibold text-[12px] hover:bg-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PiPlus className="w-3.5 h-3.5" />
                    <span>Criar {selectingSlot.label}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUB-COMPONENT: HERO SLOT CARD ──
function SlotCard({
  slot,
  equippedItem,
  selectedTeam,
  onSelectSlot,
  onInspect,
  onUnequip,
}: {
  slot: SlotDefinition;
  equippedItem?: TransformedInventoryItem;
  selectedTeam: CS2Team;
  onSelectSlot: () => void;
  onInspect: (it: TransformedInventoryItem) => void;
  onUnequip: (it: TransformedInventoryItem, e: React.MouseEvent) => void;
}) {
  const Icon = slot.icon;

  if (!equippedItem) {
    return (
      <div
        onClick={onSelectSlot}
        className="group relative flex flex-col items-center justify-center p-4 rounded-[12px] bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/[0.12] hover:border-[#a9c8c0]/50 aspect-[4/5] text-center gap-2 transition-all cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-white/[0.04] group-hover:bg-[#a9c8c0]/20 flex items-center justify-center text-stone-400 group-hover:text-[#a9c8c0] transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-sans font-semibold text-stone-300 group-hover:text-white transition-colors">
            {slot.label}
          </span>
          <span className="text-[11px] font-sans text-stone-400 group-hover:text-[#a9c8c0] transition-colors flex items-center justify-center gap-1">
            <PiPlus className="w-3 h-3" /> Equipar
          </span>
        </div>
      </div>
    );
  }

  const parsed = parseItemName(equippedItem.item);
  const imgSrc = getItemImage(equippedItem.item) || equippedItem.imageUrl;

  return (
    <div
      onClick={onSelectSlot}
      className="group relative flex flex-col p-3 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.1] hover:border-[#a9c8c0]/40 aspect-[4/5] transition-all cursor-pointer shadow-sm overflow-hidden"
    >
      {/* Top Slot Header */}
      <div className="flex items-center justify-between text-[11px] font-sans text-stone-400 mb-1 z-10">
        <span className="truncate flex items-center gap-1 font-medium">
          <Icon className="w-3.5 h-3.5 text-[#a9c8c0]" />
          {slot.label}
        </span>
        <button
          type="button"
          onClick={(e) => onUnequip(equippedItem, e)}
          className="w-5 h-5 rounded hover:bg-white/10 text-stone-400 hover:text-red-400 flex items-center justify-center transition-colors"
          title="Desequipar"
        >
          <PiX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image Preview */}
      <div className="relative flex-1 w-full rounded-[8px] bg-black/30 flex items-center justify-center overflow-hidden my-1">
        <Image
          src={imgSrc}
          alt={parsed.skinName}
          width={180}
          height={140}
          className="object-contain w-[85%] h-[85%] drop-shadow-md group-hover:scale-105 transition-transform"
          unoptimized
        />

        {/* Hover Inspect overlay */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(equippedItem);
          }}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-[12px] font-sans font-medium text-white backdrop-blur-[2px] transition-opacity"
        >
          <PiEye className="w-4 h-4 text-[#a9c8c0]" />
          <span>Inspecionar 3D</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="flex flex-col gap-0.5 mt-1 z-10">
        <span className="text-[11px] font-sans text-stone-400 truncate">{parsed.weaponName}</span>
        <span className="text-[13px] font-sans font-bold text-white truncate">{parsed.skinName}</span>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: EQUIPPED ITEM CARD (WEAPONS) ──
function EquippedItemCard({
  itemData,
  selectedTeam,
  onInspect,
  onEdit,
  onUnequip,
  onChange,
}: {
  itemData: TransformedInventoryItem;
  selectedTeam: CS2Team;
  onInspect: (it: TransformedInventoryItem) => void;
  onEdit: (it: TransformedInventoryItem) => void;
  onUnequip: (it: TransformedInventoryItem, e: React.MouseEvent) => void;
  onChange: () => void;
}) {
  const parsed = parseItemName(itemData.item);
  const imgSrc = getItemImage(itemData.item) || itemData.imageUrl;

  return (
    <div
      onClick={onChange}
      className="group relative flex flex-col p-3 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.1] hover:border-[#a9c8c0]/40 aspect-[4/5] transition-all cursor-pointer shadow-sm overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between text-[11px] font-sans text-stone-400 mb-1 z-10">
        <span className="truncate font-medium text-stone-300">{parsed.weaponName}</span>
        <button
          type="button"
          onClick={(e) => onUnequip(itemData, e)}
          className="w-5 h-5 rounded hover:bg-white/10 text-stone-400 hover:text-red-400 flex items-center justify-center transition-colors"
          title="Desequipar"
        >
          <PiX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image Preview */}
      <div className="relative flex-1 w-full rounded-[8px] bg-black/30 flex items-center justify-center overflow-hidden my-1">
        <Image
          src={imgSrc}
          alt={parsed.skinName}
          width={180}
          height={140}
          className="object-contain w-[85%] h-[85%] drop-shadow-md group-hover:scale-105 transition-transform"
          unoptimized
        />

        {/* Hover Inspect overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 backdrop-blur-[2px] transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(itemData);
            }}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
            title="Inspecionar 3D / !i"
          >
            <PiEye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(itemData);
            }}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
            title="Editar Skin"
          >
            <PiArrowsClockwise className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="flex flex-col gap-0.5 mt-1 z-10">
        <span className="text-[13px] font-sans font-bold text-white truncate">{parsed.skinName}</span>
        <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
          <span>{itemData.wearShort || "Vanilla"}</span>
          {itemData.item.statTrak !== undefined && <span className="text-[#cf6a32] font-semibold">ST™</span>}
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: EMPTY CATEGORY SLOT ──
function EmptyCategorySlot({
  label,
  description,
  onAdd,
}: {
  label: string;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div
      onClick={onAdd}
      className="group flex flex-col sm:flex-row items-center justify-between p-4 rounded-[12px] bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/[0.1] hover:border-[#a9c8c0]/40 transition-all cursor-pointer gap-4"
    >
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-9 h-9 rounded-full bg-white/[0.04] group-hover:bg-[#a9c8c0]/20 flex items-center justify-center text-stone-400 group-hover:text-[#a9c8c0] transition-colors">
          <PiPlus className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-sans font-semibold text-stone-300 group-hover:text-white transition-colors">
            {label}
          </span>
          <span className="text-[12px] font-sans text-stone-400">{description}</span>
        </div>
      </div>

      <button
        type="button"
        className="h-8 px-3.5 rounded-[6px] bg-white/[0.06] group-hover:bg-white text-white group-hover:text-black font-sans font-medium text-[12px] transition-all flex items-center gap-1.5 shadow-sm"
      >
        <PiPlus className="w-3.5 h-3.5" />
        <span>Equipar Agora</span>
      </button>
    </div>
  );
}
