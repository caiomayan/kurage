"use client";

import type { ReactNode } from "react";
import {
  PiCopy,
  PiEye,
  PiPencilSimple,
  PiSparkle,
  PiSticker,
  PiTrash,
} from "react-icons/pi";
import { CS2Economy, CS2ItemType, CS2Team } from "@ianlucas/cs2-lib";
import { generateInspectLink } from "@ianlucas/cs2-lib-inspect";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getItemImage, parseItemName } from "@/lib/inventory/economy-naming";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { useKurageInventory } from "@/lib/inventory/inventory-context";

interface InventoryItemCardProps {
  itemData: TransformedInventoryItem;
  onInspect: (itemData: TransformedInventoryItem) => void;
  onEdit: (itemData: TransformedInventoryItem) => void;
}

export function InventoryItemCard({ itemData, onInspect, onEdit }: InventoryItemCardProps) {
  const { equip, unequip, remove, isSyncing } = useKurageInventory();
  const { item, imageUrl, rarityColor, rarityName, wearName, isEquippedCT, isEquippedT, hasStatTrak, hasNametag } = itemData;
  const parsed = parseItemName(item);
  const attachments = [
    ...Array.from(item.stickers?.values() ?? []).filter(Boolean).map((sticker, index) => ({
      key: `sticker-${index}-${sticker.id}`,
      kind: "sticker" as const,
      id: sticker.id,
    })),
    ...Array.from(item.keychains?.values() ?? []).filter(Boolean).map((keychain, index) => ({
      key: `keychain-${index}-${keychain.id}`,
      kind: "keychain" as const,
      id: keychain.id,
    })),
  ].slice(0, 6).map((attachment) => {
    const economyItem = CS2Economy.getById(attachment.id);
    return {
      ...attachment,
      name: economyItem?.name ?? (attachment.kind === "sticker" ? "Adesivo" : "Chaveiro"),
      imageUrl: getItemImage(economyItem),
    };
  });

  const canEquip =
    item.type === CS2ItemType.Weapon ||
    item.type === CS2ItemType.Melee ||
    item.type === CS2ItemType.Gloves ||
    item.type === CS2ItemType.Agent;
  const supportedTeams = item.teams as CS2Team[] | undefined;
  const canEquipCT = !supportedTeams?.length || supportedTeams.includes(CS2Team.CT);
  const canEquipT = !supportedTeams?.length || supportedTeams.includes(CS2Team.T);

  const toggleTeam = (team: CS2Team, equipped: boolean) => {
    if (isSyncing) return;
    void (equipped ? unequip(item.uid, team) : equip(item.uid, team));
  };

  const copyInspectCommand = async () => {
    try {
      await navigator.clipboard.writeText(generateInspectLink(item));
      toast.success("Comando de inspeção copiado.");
    } catch {
      toast.error("Não foi possível copiar o comando de inspeção.");
    }
  };

  const removeItem = () => {
    if (window.confirm(`Remover ${parsed.skinName} do seu inventário?`)) {
      void remove(item.uid);
    }
  };

  return (
    <article
      className={cn(
        "group relative min-h-[390px] overflow-hidden rounded-[14px] border bg-[#06090b]/90 transition duration-300",
        "border-white/[0.08] hover:-translate-y-1 hover:border-white/[0.18]",
        (isEquippedCT || isEquippedT) && "border-[var(--kurage-accent)]/25",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(var(--kurage-accent-rgb),0.085),transparent_47%)] opacity-70 transition group-hover:opacity-100" />
      <div
        className="absolute inset-x-0 top-0 h-px opacity-75"
        style={{ background: `linear-gradient(90deg, transparent, ${rarityColor.hex}, transparent)` }}
      />

      <button
        type="button"
        onClick={() => onInspect(itemData)}
        className="relative flex h-full min-h-[390px] w-full flex-col text-left"
        aria-label={`Inspecionar ${parsed.weaponName} ${parsed.skinName}`}
      >
        <div className="relative flex min-h-[270px] flex-1 items-center justify-center overflow-hidden px-8 pb-2 pt-10">
          <div
            className="absolute h-44 w-44 rounded-full opacity-[0.09] blur-3xl transition duration-500 group-hover:scale-125 group-hover:opacity-[0.16]"
            style={{ backgroundColor: rarityColor.hex }}
          />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={item.name}
              className="relative z-10 max-h-[210px] w-full object-contain drop-shadow-[0_28px_38px_rgba(0,0,0,0.8)] transition duration-500 group-hover:scale-[1.06] group-hover:-rotate-1"
            />
          ) : (
            <PiEye className="h-9 w-9 text-white/15" />
          )}

          {canEquip && (
            <EquipmentIndicators
              isEquippedCT={isEquippedCT}
              isEquippedT={isEquippedT}
              canEquipCT={canEquipCT}
              canEquipT={canEquipT}
            />
          )}

          {attachments.length > 0 && (
            <div className="absolute bottom-4 left-5 z-20 flex max-w-[calc(100%-2.5rem)] items-center gap-2" aria-label={`Acessórios aplicados: ${attachments.map((attachment) => attachment.name).join(", ")}`}>
              {attachments.map((attachment) => (
                <span key={attachment.key} title={attachment.name} className="grid size-7 shrink-0 place-items-center text-[var(--kurage-accent)] drop-shadow-[0_4px_8px_rgba(0,0,0,.8)]">
                  {attachment.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachment.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : attachment.kind === "sticker" ? <PiSticker className="size-4" /> : <PiSparkle className="size-4" />}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 w-full border-t border-white/[0.055] bg-black/35 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs text-white/40">{parsed.weaponName}</p>
              <h2 className="mt-1 truncate font-display text-[22px] font-medium leading-none tracking-[-0.02em] text-white">
                {parsed.skinName}
              </h2>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/38">
            <span>{wearName || rarityName}</span>
            {hasStatTrak && <><span className="h-1 w-1 rounded-full bg-white/20" /><span className="text-[#d39166]">StatTrak™</span></>}
            {hasNametag && <><span className="h-1 w-1 rounded-full bg-white/20" /><span className="truncate text-[#d8c879]">{item.nameTag}</span></>}
          </div>
        </div>
      </button>

      <div className="pointer-events-none absolute inset-x-5 bottom-[112px] z-20 translate-y-1 opacity-100 transition duration-200 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
        <div className="flex items-center justify-between gap-3">
          <div className="pointer-events-auto inline-flex overflow-hidden rounded-[9px] border border-white/[0.1] bg-black/72 shadow-[0_10px_28px_rgba(0,0,0,.5)] backdrop-blur-xl">
            <IconAction label="Inspecionar item" onClick={() => onInspect(itemData)}>
              <PiEye />
            </IconAction>
            <IconAction label="Editar item" onClick={() => onEdit(itemData)}>
              <PiPencilSimple />
            </IconAction>
            <IconAction label="Copiar comando de inspeção" onClick={() => void copyInspectCommand()}>
              <PiCopy />
            </IconAction>
            <IconAction label="Remover item" onClick={removeItem} danger>
              <PiTrash />
            </IconAction>
          </div>

          {canEquip && (canEquipCT || canEquipT) && (
            <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-full border border-white/[0.1] bg-black/72 p-1 shadow-[0_10px_28px_rgba(0,0,0,.5)] backdrop-blur-xl">
              {canEquipCT && (
                <TeamDotAction
                  team="CT"
                  isEquipped={isEquippedCT}
                  onClick={() => toggleTeam(CS2Team.CT, isEquippedCT)}
                />
              )}
              {canEquipT && (
                <TeamDotAction
                  team="TR"
                  isEquipped={isEquippedT}
                  onClick={() => toggleTeam(CS2Team.T, isEquippedT)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function EquipmentIndicators({
  isEquippedCT,
  isEquippedT,
  canEquipCT,
  canEquipT,
}: {
  isEquippedCT: boolean;
  isEquippedT: boolean;
  canEquipCT: boolean;
  canEquipT: boolean;
}) {
  return (
    <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5" aria-label={`Equipamento: CT ${isEquippedCT ? "equipado" : "não equipado"}; TR ${isEquippedT ? "equipado" : "não equipado"}`}>
      {canEquipT && <EquipmentDot team="TR" equipped={isEquippedT} />}
      {canEquipCT && <EquipmentDot team="CT" equipped={isEquippedCT} />}
    </div>
  );
}

function EquipmentDot({ team, equipped }: { team: "CT" | "TR"; equipped: boolean }) {
  const color = team === "CT" ? "#92bce3" : "#d8c879";
  const description = `${team} ${equipped ? "equipado" : "não equipado"}`;

  return (
    <span
      aria-label={description}
      title={description}
      className="size-3 rounded-full border shadow-[0_1px_7px_rgba(0,0,0,.85)]"
      style={{
        borderColor: color,
        backgroundColor: equipped ? color : "transparent",
        boxShadow: equipped ? `0 0 10px ${color}70` : "0 1px 7px rgba(0,0,0,.85)",
      }}
    />
  );
}

function TeamDotAction({ team, isEquipped, onClick }: { team: "CT" | "TR"; isEquipped: boolean; onClick: () => void }) {
  const color = team === "CT" ? "#92bce3" : "#d8c879";
  const label = isEquipped ? `Remover de ${team}` : `Equipar em ${team}`;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full transition hover:bg-white/[0.07]"
    >
      <span
        className="size-2.5 rounded-full border transition"
        style={{
          borderColor: color,
          backgroundColor: isEquipped ? color : "transparent",
          boxShadow: isEquipped ? `0 0 9px ${color}75` : "none",
        }}
      />
    </button>
  );
}

function IconAction({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center border-r border-white/[0.07] text-[17px] text-white/50 transition last:border-r-0 hover:bg-white/[0.07] hover:text-white",
        danger && "hover:bg-red-400/[0.09] hover:text-red-300",
      )}
    >
      {children}
    </button>
  );
}
