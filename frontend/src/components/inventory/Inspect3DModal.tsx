"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type ReactNode } from "react";
import { PiCheck, PiCopy, PiFire, PiPencilSimple, PiShieldCheck, PiSticker, PiTag } from "react-icons/pi";
import { CS2Economy, CS2ItemType, CS2Team } from "@ianlucas/cs2-lib";
import { generateInspectLink } from "@ianlucas/cs2-lib-inspect";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { getItemImage, parseItemName } from "@/lib/inventory/economy-naming";
import { InventoryItemStudio, StudioActionButton } from "@/components/inventory/InventoryItemStudio";

interface Inspect3DModalProps {
  itemData: TransformedInventoryItem | null;
  onClose: () => void;
  onEdit?: (itemData: TransformedInventoryItem) => void;
}

export function Inspect3DModal({ itemData, onClose, onEdit }: Inspect3DModalProps) {
  const { equip, unequip, isSyncing } = useKurageInventory();
  const [copied, setCopied] = useState(false);

  if (!itemData) return null;

  const { item, imageUrl, rarityColor, rarityName, isEquippedCT, isEquippedT, hasStickers, hasKeychain, hasStatTrak, hasNametag } = itemData;
  const parsed = parseItemName(item);
  const supportedTeams = item.teams as CS2Team[] | undefined;
  const equipableTypes: CS2ItemType[] = [CS2ItemType.Weapon, CS2ItemType.Melee, CS2ItemType.Gloves, CS2ItemType.Agent, CS2ItemType.MusicKit];
  const canEquip = equipableTypes.includes(item.type);
  const canDefender = !supportedTeams?.length || supportedTeams.includes(CS2Team.CT);
  const canAttacker = !supportedTeams?.length || supportedTeams.includes(CS2Team.T);

  const copyInspect = async () => {
    try {
      await navigator.clipboard.writeText(generateInspectLink(item));
      setCopied(true);
      toast.success("Comando de inspeção copiado.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível gerar o comando de inspeção.");
    }
  };

  const toggleTeam = async (team: CS2Team, equipped: boolean) => {
    if (isSyncing) return;
    if (equipped) await unequip(item.uid, team);
    else await equip(item.uid, team);
  };

  return (
    <InventoryItemStudio
      ariaLabel={`Inspecionar ${parsed.fullName}`}
      eyebrow="Inspeção imersiva"
      title={parsed.fullName}
      subtitle={`${parsed.skinName} · ${parsed.weaponName}`}
      imageUrl={imageUrl}
      imageAlt={parsed.fullName}
      accentColor={rarityColor.hex}
      viewerItem={item}
      onClose={onClose}
      actions={(
        <>
          <StudioActionButton title={copied ? "Copiado" : "Copiar comando"} onClick={() => void copyInspect()} active={copied}>{copied ? <PiCheck /> : <PiCopy />}</StudioActionButton>
          {onEdit && <StudioActionButton title="Editar item" onClick={() => { onClose(); onEdit(itemData); }}><PiPencilSimple /></StudioActionButton>}
        </>
      )}
      leftPanel={(
        <>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600">Identidade</p>
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight text-stone-50">{parsed.skinName}</h3>
          <p className="mt-1 text-sm text-stone-500">{parsed.weaponName}</p>
          <div className="mt-4 h-px w-10" style={{ backgroundColor: rarityColor.hex }} />
          <p className="mt-3 text-xs font-medium" style={{ color: rarityColor.hex }}>{rarityName}</p>

          <dl className="mt-8 space-y-1">
            <Detail label="Desgaste" value={item.wear == null ? "Não aplicável" : `${item.wear.toFixed(6)} · ${itemData.wearName}`} />
            <Detail label="Padrão" value={item.seed == null ? "Não aplicável" : String(item.seed)} />
            <Detail label="StatTrak™" value={hasStatTrak ? String(item.statTrak ?? 0) : "Desativado"} />
            <Detail label="Adesivos" value={hasStickers ? `${item.stickers?.size ?? 0} aplicados` : "Nenhum"} />
            <Detail label="Chaveiro" value={hasKeychain ? "Aplicado" : "Nenhum"} />
          </dl>

          {hasNametag && <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs text-stone-300"><PiTag className="text-[var(--kurage-accent)]" /><span className="truncate">{item.nameTag}</span></div>}
        </>
      )}
      rightPanel={(
        <>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600">Equipamento</p>
          {canEquip ? (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {canDefender && <TeamButton title="Defesa" subtitle={isEquippedCT ? "Equipado" : "Equipar"} active={isEquippedCT} disabled={isSyncing} onClick={() => void toggleTeam(CS2Team.CT, isEquippedCT)}><PiShieldCheck /></TeamButton>}
              {canAttacker && <TeamButton title="Ataque" subtitle={isEquippedT ? "Equipado" : "Equipar"} active={isEquippedT} disabled={isSyncing} onClick={() => void toggleTeam(CS2Team.T, isEquippedT)}><PiFire /></TeamButton>}
            </div>
          ) : <p className="mt-5 text-xs leading-relaxed text-stone-600">Este item não possui posição de equipamento.</p>}

          {hasStickers && item.stickers && <div className="mt-9"><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600"><PiSticker /> Adesivos aplicados</p><div className="mt-3 grid grid-cols-3 gap-2">{Array.from(item.stickers.entries()).map(([slot, sticker]) => { const economy = sticker ? CS2Economy.getById(sticker.id) : null; const image = getItemImage(economy); return sticker ? <div key={slot} title={economy?.name || "Adesivo"} className="grid aspect-square place-items-center rounded-lg border border-white/[0.06] bg-white/[0.018] p-2">{image && <img src={image} alt="" className="max-h-full max-w-full object-contain" />}</div> : null; })}</div></div>}

          <button type="button" onClick={() => void copyInspect()} className="mt-9 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] text-xs font-medium text-stone-300 transition-colors hover:bg-white/[0.05] hover:text-white">{copied ? <PiCheck className="text-[var(--kurage-accent)]" /> : <PiCopy />} {copied ? "Comando copiado" : "Copiar comando"}</button>
        </>
      )}
    />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-white/[0.055] py-3"><dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-stone-600">{label}</dt><dd className="mt-1 text-xs text-stone-300">{value}</dd></div>;
}

function TeamButton({ title, subtitle, active, disabled, onClick, children }: { title: string; subtitle: string; active: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active} className={cn("flex min-h-24 flex-col items-center justify-center rounded-xl border text-center transition-colors disabled:cursor-wait disabled:opacity-55", active ? "border-[var(--kurage-accent)]/35 bg-[var(--kurage-accent)]/10 text-[var(--kurage-accent)]" : "border-white/[0.07] bg-white/[0.018] text-stone-500 hover:border-white/[0.14] hover:text-stone-200")}><span className="text-xl">{children}</span><span className="mt-2 text-xs font-medium">{title}</span><span className="mt-0.5 text-[10px] opacity-60">{subtitle}</span></button>;
}
