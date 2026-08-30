"use client";
/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PiCheck,
  PiCube,
  PiFingerprint,
  PiHand,
  PiMagnifyingGlass,
  PiPersonArmsSpread,
  PiPlus,
  PiShuffle,
  PiSparkle,
  PiSticker,
  PiSword,
  PiTag,
  PiTrash,
  PiX,
} from "react-icons/pi";
import { CS2BaseInventoryItem, CS2Economy, CS2EconomyItem, CS2_MAX_SEED } from "@ianlucas/cs2-lib";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CraftAttributes, useKurageInventory } from "@/lib/inventory/inventory-context";
import { TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { ECONOMY_CATEGORIES, EconomyFilterCategory, getAllCraftableItems, getCraftableItems } from "@/lib/inventory/economy-filters";
import { getWearName, RARITY_COLORS } from "@/lib/inventory/economy";
import { getItemImage, parseItemName } from "@/lib/inventory/economy-naming";
import { searchEconomyItems } from "@/lib/inventory/economy-search";
import { InventoryItemStudio } from "@/components/inventory/InventoryItemStudio";
import type { ViewerApi, ViewerItem, ViewerState } from "@/lib/inventory/viewer-api";

interface CraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemData?: TransformedInventoryItem | null;
  preselectedItem?: CS2EconomyItem | null;
  initialAttributes?: Partial<CS2BaseInventoryItem> | null;
}

type Attachment = {
  id: number;
  name: string;
  imageUrl?: string;
  wear?: number;
  seed?: number;
  schema?: number;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
};
const emptyStickers = () => Array<Attachment | null>(5).fill(null);
const categoryIcons: Record<EconomyFilterCategory["id"], typeof PiSparkle> = {
  skins: PiSparkle,
  knives: PiSword,
  gloves: PiHand,
  agents: PiPersonArmsSpread,
};

function toAttachment(id: number, extra?: Partial<Attachment>): Attachment {
  const item = CS2Economy.getById(id);
  return { id, name: item?.name || "Item", imageUrl: getItemImage(item) || undefined, ...extra };
}

function toStickerPayload(stickers: Array<Attachment | null>): NonNullable<CraftAttributes["stickers"]> {
  const payload: NonNullable<CraftAttributes["stickers"]> = {};
  stickers.forEach((item, slot) => {
    if (item) payload[slot] = { id: item.id, wear: item.wear, schema: item.schema, x: item.x, y: item.y, rotation: item.rotation };
  });
  return payload;
}

function toKeychainPayload(keychain: Attachment | null): NonNullable<CraftAttributes["keychains"]> {
  return keychain ? { 0: { id: keychain.id, seed: keychain.seed, x: keychain.x, y: keychain.y, z: keychain.z } } : {};
}

function attachmentsFromViewer(state: ViewerState): { stickers: Array<Attachment | null>; keychain: Attachment | null } {
  const nextStickers = emptyStickers();
  Object.entries(state.item.stickers ?? {}).forEach(([slotValue, sticker]) => {
    const slot = Number(slotValue);
    if (sticker && slot >= 0 && slot < nextStickers.length) {
      nextStickers[slot] = toAttachment(sticker.id, { wear: sticker.wear, schema: sticker.schema, x: sticker.x, y: sticker.y, rotation: sticker.rotation });
    }
  });
  const viewerKeychain = Object.values(state.item.keychains ?? {})[0];
  return {
    stickers: nextStickers,
    keychain: viewerKeychain ? toAttachment(viewerKeychain.id, { seed: viewerKeychain.seed, x: viewerKeychain.x, y: viewerKeychain.y, z: viewerKeychain.z }) : null,
  };
}

export function CraftModal(props: CraftModalProps) {
  if (!props.isOpen) return null;
  const identity = props.initialItemData?.uid ?? props.preselectedItem?.id ?? "new";
  return <CraftModalContent key={identity} {...props} />;
}

function CraftModalContent({ onClose, initialItemData, preselectedItem, initialAttributes }: CraftModalProps) {
  const { craft, edit, isSyncing } = useKurageInventory();
  const isEditing = Boolean(initialItemData);
  const initialEconomyItem = initialItemData ? CS2Economy.getById(initialItemData.item.id) : preselectedItem;
  const [category, setCategory] = useState(ECONOMY_CATEGORIES[0]);
  const [selected, setSelected] = useState<CS2EconomyItem | null>(initialEconomyItem || null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [wear, setWear] = useState(initialItemData?.item.wear ?? initialAttributes?.wear ?? initialEconomyItem?.wearMin ?? 0.01);
  const [seed, setSeed] = useState(initialItemData?.item.seed ?? initialAttributes?.seed ?? 420);
  const [statTrak, setStatTrak] = useState(initialItemData?.hasStatTrak ?? (initialAttributes?.statTrak !== undefined));
  const [nameTag, setNameTag] = useState(initialItemData?.item.nameTag ?? initialAttributes?.nameTag ?? "");
  const [stickers, setStickers] = useState<Array<Attachment | null>>(() => {
    const restored = emptyStickers();
    initialItemData?.item.stickers?.forEach((item, slot) => {
      if (item && slot < restored.length) restored[slot] = toAttachment(item.id, { wear: item.wear, schema: item.schema, x: item.x, y: item.y, rotation: item.rotation });
    });
    return restored;
  });
  const [keychain, setKeychain] = useState<Attachment | null>(() => {
    const attached = initialItemData?.item.keychains?.values().next().value;
    return attached ? toAttachment(attached.id, { seed: attached.seed, x: attached.x, y: attached.y, z: attached.z }) : null;
  });
  const [stickerSlot, setStickerSlot] = useState<number | null>(null);
  const [keychainPicker, setKeychainPicker] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState("");
  const [viewerApi, setViewerApi] = useState<ViewerApi | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<"stickers" | "keychain" | null>(null);
  const [activeSticker, setActiveSticker] = useState<number | null>(null);
  const [keychainDefault, setKeychainDefault] = useState<{ x: number; y: number; z: number } | null>(null);

  const categoryItems = useMemo(() => getCraftableItems(category), [category]);
  const allCraftableItems = useMemo(() => deferredSearch.trim() ? getAllCraftableItems() : null, [deferredSearch]);
  const catalog = useMemo(() => searchEconomyItems(allCraftableItems ?? categoryItems, deferredSearch).slice(0, 180), [allCraftableItems, categoryItems, deferredSearch]);
  const attachments = useMemo(() => {
    const type = stickerSlot !== null ? "sticker" : keychainPicker ? "keychain" : null;
    if (!type) return [];
    const source = CS2Economy.itemsAsArray.filter((item) => type === "sticker" ? item.isSticker() : item.isKeychain());
    return searchEconomyItems(source, attachmentSearch).slice(0, 180);
  }, [attachmentSearch, keychainPicker, stickerSlot]);

  const viewerItem = useMemo<ViewerItem | null>(() => selected ? ({
    id: selected.id,
    wear: selected.hasWear() ? wear : undefined,
    seed: selected.hasSeed() ? seed : undefined,
    statTrak: selected.hasStatTrak() && statTrak ? 0 : undefined,
    nameTag: selected.hasNameTag() ? nameTag.trim() || undefined : undefined,
    stickers: selected.hasStickers() ? toStickerPayload(stickers) : undefined,
    keychains: selected.hasKeychains() ? toKeychainPayload(keychain) : undefined,
  }) : null, [keychain, nameTag, seed, selected, statTrak, stickers, wear]);

  useEffect(() => {
    if (!viewerApi) return;
    const applyViewerState = (state: ViewerState) => {
      const incoming = attachmentsFromViewer(state);
      setStickers((current) => JSON.stringify(toStickerPayload(current)) === JSON.stringify(toStickerPayload(incoming.stickers)) ? current : incoming.stickers);
      setKeychain((current) => JSON.stringify(toKeychainPayload(current)) === JSON.stringify(toKeychainPayload(incoming.keychain)) ? current : incoming.keychain);
      setKeychainDefault(state.keychainDefault ?? null);
      setActiveSticker(state.activeSticker);
    };
    const offChange = viewerApi.on("change", applyViewerState);
    void viewerApi.getState().then(applyViewerState).catch(() => undefined);
    return offChange;
  }, [viewerApi]);

  const chooseItem = (item: CS2EconomyItem) => {
    setSelected(item);
    setWear(item.hasWear() ? item.wearMin ?? 0 : 0);
    setSeed(Math.floor(Math.random() * (CS2_MAX_SEED + 1)));
    setStatTrak(false);
    setNameTag("");
    setStickers(emptyStickers());
    setKeychain(null);
  };

  const save = async () => {
    if (!selected || isSyncing) return;
    const stickerPayload = toStickerPayload(stickers);
    const keychainPayload = toKeychainPayload(keychain);
    const attributes: Partial<CraftAttributes> = {
      wear: selected.hasWear() ? Number(wear.toFixed(6)) : undefined,
      seed: selected.hasSeed() ? seed : undefined,
      stattrak: selected.hasStatTrak() ? statTrak : false,
      nameTag: selected.hasNameTag() ? nameTag.trim() || undefined : undefined,
      stickers: selected.hasStickers() ? stickerPayload : {},
      keychains: selected.hasKeychains() ? keychainPayload : {},
    };
    const saved = isEditing && initialItemData ? await edit(initialItemData.uid, attributes) : await craft(selected, attributes);
    if (!saved) return;
    toast.success(isEditing ? "Alterações confirmadas pelo servidor." : "Item adicionado e confirmado pelo servidor.");
    onClose();
  };

  if (!selected) {
    return (
      <CatalogModal
        category={category}
        onCategory={setCategory}
        search={search}
        onSearch={setSearch}
        items={catalog}
        onChoose={chooseItem}
        onClose={onClose}
      />
    );
  }

  const parsed = parseItemName(selected);
  const imageUrl = getItemImage(selected, wear);
  const rarity = RARITY_COLORS[selected.rarityColor || "default"] || RARITY_COLORS.default;
  const pickerOpen = stickerSlot !== null || keychainPicker;

  return (
    <>
      <InventoryItemStudio
        ariaLabel={isEditing ? `Editar ${parsed.fullName}` : `Criar ${parsed.fullName}`}
        eyebrow={isEditing ? "Estúdio de edição" : "Estúdio de criação"}
        title={parsed.fullName}
        subtitle={`${parsed.skinName} · ${parsed.weaponName}`}
        imageUrl={imageUrl}
        imageAlt={parsed.fullName}
        accentColor={rarity.hex}
        viewerItem={viewerItem ?? undefined}
        onViewerApi={setViewerApi}
        onClose={onClose}
        onBack={isEditing ? undefined : () => setSelected(null)}
        stageOverlay={attachmentMode ? (
          <AttachmentStudioOverlay
            mode={attachmentMode}
            item={selected}
            stickers={stickers}
            keychain={keychain}
            activeSticker={activeSticker}
            keychainDefault={keychainDefault}
            viewerApi={viewerApi}
            onClose={() => {
              setAttachmentMode(null);
              setActiveSticker(null);
              viewerApi?.setSelection({ selection: null });
            }}
            onAddSticker={() => {
              const slot = stickers.findIndex((sticker) => sticker === null);
              if (slot >= 0) {
                setStickerSlot(slot);
                setAttachmentSearch("");
              }
            }}
            onReplaceSticker={(slot) => {
              setStickerSlot(slot);
              setAttachmentSearch("");
            }}
            onSelectSticker={(slot) => {
              setActiveSticker(slot);
              viewerApi?.setActiveSticker({ index: slot });
            }}
            onRemoveSticker={(slot) => {
              const next = [...stickers];
              next[slot] = null;
              setStickers(next);
              setActiveSticker(null);
              viewerApi?.setActiveSticker({ index: null });
            }}
            onUpdateSticker={(slot, data) => {
              const next = [...stickers];
              if (next[slot]) next[slot] = { ...next[slot], ...data };
              setStickers(next);
            }}
            onChooseKeychain={() => {
              setKeychainPicker(true);
              setAttachmentSearch("");
            }}
            onSelectKeychain={() => viewerApi?.setSelection({ selection: { kind: "keychain", index: 0 } })}
            onRemoveKeychain={() => {
              setKeychain(null);
              viewerApi?.setSelection({ selection: null });
            }}
            onUpdateKeychain={(data) => setKeychain((current) => current ? { ...current, ...data } : current)}
          />
        ) : undefined}
        leftPanel={(
          <StudioConfiguration
            item={selected}
            wear={wear}
            seed={seed}
            statTrak={statTrak}
            onWear={setWear}
            onSeed={setSeed}
            onStatTrak={setStatTrak}
          />
        )}
        rightPanel={(
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600">Personalização compatível</p>
            <div className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {selected.hasNameTag() && (
                <label className="block py-5">
                  <span className="flex items-center gap-2 text-xs text-stone-400"><PiTag /> Nome personalizado</span>
                  <input value={nameTag} maxLength={20} onChange={(event) => setNameTag(event.target.value)} placeholder="Nome do item" className="mt-3 h-10 w-full rounded-lg border border-white/[0.08] bg-black/50 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-700 focus:border-[var(--kurage-accent)]/45" />
                </label>
              )}
              {selected.hasStickers() && (
                <div className="py-5">
                  <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-stone-400"><PiSticker /> Adesivos da arma</p><span className="font-mono text-[10px] text-stone-600">{stickers.filter(Boolean).length}/5</span></div>
                  <button type="button" onClick={() => { setAttachmentMode("stickers"); setActiveSticker(stickers.findIndex(Boolean) >= 0 ? stickers.findIndex(Boolean) : null); }} className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.018] px-3 text-left transition-colors hover:border-[var(--kurage-accent)]/30 hover:bg-[var(--kurage-accent)]/[0.05]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--kurage-accent)]/10 text-[var(--kurage-accent)]"><PiCube /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-stone-200">Editar adesivos em 3D</span><span className="mt-0.5 block truncate text-[10px] text-stone-600">Posicione, gire, desgaste e troque no modelo real.</span></span>
                  </button>
                </div>
              )}
              {selected.hasKeychains() && (
                <div className="py-5">
                  <p className="text-xs text-stone-400">Chaveiro da arma</p>
                  <button type="button" onClick={() => setAttachmentMode("keychain")} className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.018] px-3 text-left transition-colors hover:border-[#92bce3]/30 hover:bg-[#92bce3]/[0.05]">{keychain?.imageUrl ? <img src={keychain.imageUrl} alt="" className="size-9 shrink-0 object-contain" /> : <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#92bce3]/10 text-[#92bce3]"><PiCube /></span>}<span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-stone-200">{keychain?.name || "Adicionar chaveiro em 3D"}</span><span className="mt-0.5 block truncate text-[10px] text-stone-600">Ajuste pattern e posição diretamente na arma.</span></span></button>
                </div>
              )}
              {!selected.hasNameTag() && !selected.hasStickers() && !selected.hasKeychains() && <p className="py-5 text-xs leading-6 text-stone-600">Este item não possui anexos ou nome personalizável.</p>}
            </div>
            <div className="mt-7 grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="h-11 rounded-lg border border-white/[0.09] text-sm font-medium text-stone-300 hover:bg-white/[0.05]">Cancelar</button>
              <button type="button" onClick={() => void save()} disabled={isSyncing} className="h-11 rounded-lg bg-stone-100 text-sm font-semibold text-black hover:bg-white disabled:cursor-wait disabled:opacity-55">{isSyncing ? "Confirmando..." : isEditing ? "Salvar" : "Criar item"}</button>
            </div>
          </>
        )}
      />

      <AnimatePresence>{pickerOpen && (
        <AttachmentPicker
          stickerMode={stickerSlot !== null}
          search={attachmentSearch}
          onSearch={setAttachmentSearch}
          items={attachments}
          hasKeychain={Boolean(keychain)}
          onClose={() => { setStickerSlot(null); setKeychainPicker(false); }}
          onRemove={() => {
            if (stickerSlot !== null) {
              const next = [...stickers];
              next[stickerSlot] = null;
              setStickers(next);
              setActiveSticker(null);
              viewerApi?.setActiveSticker({ index: null });
              setStickerSlot(null);
            } else {
              setKeychain(null);
              viewerApi?.setSelection({ selection: null });
              setKeychainPicker(false);
            }
          }}
          onChoose={(item) => {
            if (stickerSlot !== null) {
              const next = [...stickers];
              next[stickerSlot] = toAttachment(item.id, { wear: 0, schema: stickerSlot });
              setStickers(next);
              setActiveSticker(stickerSlot);
              viewerApi?.setActiveSticker({ index: stickerSlot });
              setStickerSlot(null);
            } else {
              setKeychain(toAttachment(item.id, { seed: 100 }));
              viewerApi?.setSelection({ selection: { kind: "keychain", index: 0 } });
              setKeychainPicker(false);
            }
          }}
        />
      )}</AnimatePresence>
    </>
  );
}

function AttachmentStudioOverlay({
  mode,
  item,
  stickers,
  keychain,
  activeSticker,
  keychainDefault,
  viewerApi,
  onClose,
  onAddSticker,
  onReplaceSticker,
  onSelectSticker,
  onRemoveSticker,
  onUpdateSticker,
  onChooseKeychain,
  onSelectKeychain,
  onRemoveKeychain,
  onUpdateKeychain,
}: {
  mode: "stickers" | "keychain";
  item: CS2EconomyItem;
  stickers: Array<Attachment | null>;
  keychain: Attachment | null;
  activeSticker: number | null;
  keychainDefault: { x: number; y: number; z: number } | null;
  viewerApi: ViewerApi | null;
  onClose: () => void;
  onAddSticker: () => void;
  onReplaceSticker: (slot: number) => void;
  onSelectSticker: (slot: number) => void;
  onRemoveSticker: (slot: number) => void;
  onUpdateSticker: (slot: number, data: Partial<Attachment>) => void;
  onChooseKeychain: () => void;
  onSelectKeychain: () => void;
  onRemoveKeychain: () => void;
  onUpdateKeychain: (data: Partial<Attachment>) => void;
}) {
  const selectedSticker = activeSticker !== null ? stickers[activeSticker] : null;
  const stickerBounds = item.getStickerOffsetBounds();
  const keychainBounds = item.getKeychainPositionBounds();

  useEffect(() => {
    if (mode === "stickers") viewerApi?.setActiveSticker({ index: activeSticker });
    else if (keychain) viewerApi?.setSelection({ selection: { kind: "keychain", index: 0 } });
  }, [activeSticker, keychain, mode, viewerApi]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <section className="pointer-events-auto absolute inset-y-0 left-0 flex w-[min(270px,58vw)] items-center p-2 lg:p-4">
        <div className="max-h-[72%] w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#050708]/92 shadow-2xl backdrop-blur-md">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-3 py-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--kurage-accent)]">Editor 3D</p><h3 className="mt-1 text-xs font-semibold text-stone-200">{mode === "stickers" ? "Adesivos" : "Chaveiro"}</h3></div><IconButton title="Concluir anexos" onClick={onClose}><PiCheck /></IconButton></header>
          <div data-lenis-prevent className="max-h-[55vh] overflow-y-auto p-2">
            {mode === "stickers" ? (
              <div className="space-y-1">
                {stickers.map((sticker, slot) => sticker ? (
                  <div key={slot} onMouseEnter={() => viewerApi?.highlightSticker({ index: slot })} className={cn("group flex items-center gap-2 rounded-lg border p-1.5 transition-colors", activeSticker === slot ? "border-[var(--kurage-accent)]/35 bg-[var(--kurage-accent)]/10" : "border-transparent hover:bg-white/[0.05]")}>
                    <button type="button" onClick={() => onSelectSticker(slot)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-black/45"><img src={sticker.imageUrl || ""} alt="" className="max-h-8 max-w-8 object-contain" /></span><span className="min-w-0"><span className="block truncate text-[11px] text-stone-200">{sticker.name}</span><span className="block font-mono text-[9px] text-stone-600">posição {sticker.schema ?? slot}</span></span></button>
                    <button type="button" onClick={() => onReplaceSticker(slot)} title="Trocar adesivo" className="grid size-7 place-items-center rounded-md text-stone-500 hover:bg-white/[0.06] hover:text-white"><PiShuffle /></button>
                    <button type="button" onClick={() => onRemoveSticker(slot)} title="Remover adesivo" className="grid size-7 place-items-center rounded-md text-stone-500 hover:bg-red-400/10 hover:text-red-300"><PiTrash /></button>
                  </div>
                ) : null)}
                {stickers.some((sticker) => sticker === null) && <button type="button" onClick={onAddSticker} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-stone-500 hover:border-[var(--kurage-accent)]/30 hover:text-[var(--kurage-accent)]"><PiPlus /> Adicionar adesivo</button>}
              </div>
            ) : keychain ? (
              <div className="flex items-center gap-2 rounded-lg border border-[#92bce3]/25 bg-[#92bce3]/[0.06] p-2"><button type="button" onClick={onSelectKeychain} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className="grid size-12 shrink-0 place-items-center rounded-md bg-black/45"><img src={keychain.imageUrl || ""} alt="" className="max-h-10 max-w-10 object-contain" /></span><span className="truncate text-[11px] text-stone-200">{keychain.name}</span></button><button type="button" onClick={onChooseKeychain} title="Trocar chaveiro" className="grid size-8 place-items-center rounded-md text-stone-500 hover:bg-white/[0.06] hover:text-white"><PiShuffle /></button><button type="button" onClick={onRemoveKeychain} title="Remover chaveiro" className="grid size-8 place-items-center rounded-md text-stone-500 hover:bg-red-400/10 hover:text-red-300"><PiTrash /></button></div>
            ) : <button type="button" onClick={onChooseKeychain} className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-stone-500 hover:border-[#92bce3]/30 hover:text-[#92bce3]"><PiPlus /> Adicionar chaveiro</button>}
          </div>
        </div>
      </section>

      {(selectedSticker || (mode === "keychain" && keychain)) && (
        <section className="pointer-events-auto absolute inset-y-0 right-0 hidden w-[300px] items-center p-4 lg:flex">
          <div className="max-h-[76%] w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#050708]/94 shadow-2xl backdrop-blur-md">
            <header className="border-b border-white/[0.07] px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#92bce3]">Posicionamento real</p><h3 className="mt-1 truncate text-xs font-semibold text-stone-200">{selectedSticker?.name || keychain?.name}</h3><p className="mt-1 text-[9px] leading-4 text-stone-600">Arraste o anexo diretamente sobre o modelo ou use os ajustes abaixo.</p></header>
            <div data-lenis-prevent className="max-h-[55vh] space-y-4 overflow-y-auto p-4">
              {selectedSticker && activeSticker !== null && (
                <>
                  <EditorRange label="Desgaste" min={0} max={1} step={0.01} value={selectedSticker.wear ?? 0} onChange={(value) => onUpdateSticker(activeSticker, { wear: value || undefined })} />
                  <EditorRange label="Posição" min={-1} max={Math.max(0, item.getStickerSchemaCount() - 1)} step={1} value={selectedSticker.schema ?? activeSticker} onChange={(value) => onUpdateSticker(activeSticker, { schema: value, x: undefined, y: undefined, rotation: undefined })} />
                  {stickerBounds?.x.min !== undefined && stickerBounds.x.max !== undefined && <EditorRange label="Deslocamento X" min={stickerBounds.x.min} max={stickerBounds.x.max} step={0.01} value={selectedSticker.x ?? 0} onChange={(value) => onUpdateSticker(activeSticker, { x: value || undefined })} />}
                  {stickerBounds?.y.min !== undefined && stickerBounds.y.max !== undefined && <EditorRange label="Deslocamento Y" min={stickerBounds.y.min} max={stickerBounds.y.max} step={0.01} value={selectedSticker.y ?? 0} onChange={(value) => onUpdateSticker(activeSticker, { y: value || undefined })} />}
                  <EditorRange label="Rotação" min={-180} max={180} step={0.5} value={selectedSticker.rotation ?? 0} suffix="°" onChange={(value) => onUpdateSticker(activeSticker, { rotation: value || undefined })} />
                  <button type="button" onClick={() => onUpdateSticker(activeSticker, { wear: undefined, schema: activeSticker, x: undefined, y: undefined, rotation: undefined })} className="h-9 w-full rounded-lg border border-white/[0.08] text-[10px] text-stone-400 hover:bg-white/[0.05] hover:text-white">Restaurar posicionamento</button>
                </>
              )}
              {mode === "keychain" && keychain && (
                <>
                  <EditorRange label="Pattern" min={0} max={99999} step={1} value={keychain.seed ?? 0} onChange={(value) => onUpdateKeychain({ seed: value || undefined })} />
                  {(["x", "y", "z"] as const).map((axis) => {
                    const bounds = keychainBounds?.[axis];
                    const value = keychain[axis] ?? keychainDefault?.[axis];
                    return bounds?.min !== undefined && bounds.max !== undefined && value !== undefined ? <EditorRange key={axis} label={`Posição ${axis.toUpperCase()}`} min={bounds.min} max={bounds.max} step={0.001} value={value} onChange={(next) => onUpdateKeychain({ [axis]: next })} /> : null;
                  })}
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => viewerApi?.rerollKeychainPosition({ index: 0 })} className="h-9 rounded-lg border border-white/[0.08] text-[10px] text-stone-400 hover:bg-white/[0.05] hover:text-white">Próxima posição</button><button type="button" onClick={() => onUpdateKeychain({ x: undefined, y: undefined, z: undefined })} className="h-9 rounded-lg border border-white/[0.08] text-[10px] text-stone-400 hover:bg-white/[0.05] hover:text-white">Restaurar</button></div>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function EditorRange({ label, min, max, step, value, suffix, onChange }: { label: string; min: number; max: number; step: number; value: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="block"><span className="flex items-center justify-between text-[10px] text-stone-500"><span>{label}</span><span className="font-mono text-[var(--kurage-accent)]">{Number(value.toFixed(4))}{suffix}</span></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-[var(--kurage-accent)]" /></label>
  );
}

function StudioConfiguration({ item, wear, seed, statTrak, onWear, onSeed, onStatTrak }: { item: CS2EconomyItem; wear: number; seed: number; statTrak: boolean; onWear: (value: number) => void; onSeed: (value: number) => void; onStatTrak: (value: boolean) => void }) {
  const hasConfiguration = item.hasWear() || item.hasSeed() || item.hasStatTrak();
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600">Acabamento</p>
      <div className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {item.hasWear() && (
          <div className="py-5">
            <span className="flex items-center justify-between text-xs text-stone-400"><span>Desgaste</span><span className="font-mono text-[var(--kurage-accent)]">{wear.toFixed(6)}</span></span>
            <input type="range" min={item.wearMin ?? 0} max={item.wearMax ?? 1} step={0.000001} value={wear} onChange={(event) => onWear(Number(event.target.value))} className="mt-4 w-full accent-[var(--kurage-accent)]" />
            <span className="mt-2 block text-[11px] text-stone-600">{getWearName(wear)}</span>
          </div>
        )}
        {item.hasSeed() && (
          <div className="py-5">
            <div className="flex items-center justify-between"><span className="text-xs text-stone-400">Pattern</span><IconButton title="Gerar pattern aleatório" onClick={() => onSeed(Math.floor(Math.random() * (CS2_MAX_SEED + 1)))}><PiShuffle /></IconButton></div>
            <div className="relative mt-3"><PiFingerprint className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-600" /><input type="number" min={0} max={CS2_MAX_SEED} value={seed} onChange={(event) => onSeed(Math.min(CS2_MAX_SEED, Math.max(0, Number(event.target.value))))} className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/50 pl-10 pr-3 font-mono text-sm text-stone-100 outline-none focus:border-[var(--kurage-accent)]/45" /></div>
          </div>
        )}
        {item.hasStatTrak() && (
          <button type="button" onClick={() => onStatTrak(!statTrak)} className="flex w-full items-center justify-between py-5 text-left">
            <span><span className="block text-xs text-stone-300">Contador StatTrak™</span><span className="mt-1 block text-[11px] text-stone-600">Registra eliminações no item.</span></span>
            <span className={cn("grid size-6 place-items-center rounded-md border", statTrak ? "border-[var(--kurage-accent)]/45 bg-[var(--kurage-accent)]/15 text-[var(--kurage-accent)]" : "border-white/[0.1] text-transparent")}><PiCheck className="size-3.5" /></span>
          </button>
        )}
        {!hasConfiguration && <p className="py-5 text-xs leading-6 text-stone-600">O acabamento deste item não possui parâmetros variáveis.</p>}
      </div>
    </>
  );
}

function CatalogModal({ category, onCategory, search, onSearch, items, onChoose, onClose }: { category: EconomyFilterCategory; onCategory: (value: EconomyFilterCategory) => void; search: string; onSearch: (value: string) => void; items: CS2EconomyItem[]; onChoose: (item: CS2EconomyItem) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-black/96 p-[2.5vh] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(var(--kurage-accent-rgb),.10),transparent_30%),radial-gradient(circle_at_80%_72%,rgba(146,188,227,.08),transparent_34%)]" />
      <motion.section role="dialog" aria-modal="true" aria-label="Adicionar item" initial={{ opacity: 0, scale: 0.985, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mx-auto flex h-[95vh] w-full max-w-[1560px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#030506]/92">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-5 sm:px-7"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--kurage-accent)]">Acervo Kurage</p><h2 className="mt-1 font-display text-base font-semibold text-stone-100 sm:text-lg">Escolha um item para criar</h2></div><IconButton title="Fechar" onClick={onClose}><PiX className="size-5" /></IconButton></header>
        <Catalog category={category} onCategory={onCategory} search={search} onSearch={onSearch} items={items} onChoose={onChoose} />
      </motion.section>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} title={title} aria-label={title} className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-stone-400 transition-colors hover:bg-white/[0.06] hover:text-white">{children}</button>;
}

function Catalog({ category, onCategory, search, onSearch, items, onChoose }: { category: EconomyFilterCategory; onCategory: (value: EconomyFilterCategory) => void; search: string; onSearch: (value: string) => void; items: CS2EconomyItem[]; onChoose: (item: CS2EconomyItem) => void }) {
  return <div className="flex min-h-0 flex-1 flex-col"><div className="border-b border-white/[0.06] px-5 py-5 sm:px-7"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><nav className="flex gap-1 overflow-x-auto" aria-label="Categorias de itens">{ECONOMY_CATEGORIES.map((item) => { const Icon = categoryIcons[item.id]; const active = category.id === item.id && !search; return <button key={item.id} type="button" onClick={() => { onCategory(item); onSearch(""); }} className={cn("flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-medium transition-colors", active ? "bg-stone-100 text-black" : "text-stone-400 hover:bg-white/[0.05] hover:text-stone-100")}><Icon className="size-4" />{item.label}</button>; })}</nav><label className="relative block w-full lg:max-w-sm"><PiMagnifyingGlass className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-500" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Pesquisar em todas as skins..." className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/55 pl-10 pr-3 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-[var(--kurage-accent)]/45" /></label></div><div className="mt-4 flex justify-between"><p className="text-sm text-stone-300">{search ? "Resultados em todo o catálogo" : category.label}</p><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone-600">{items.length} disponíveis</span></div></div><div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7"><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{items.map((item) => { const parsed = parseItemName(item); const image = getItemImage(item); const rarity = RARITY_COLORS[item.rarityColor || "default"] || RARITY_COLORS.default; return <button key={item.id} type="button" onClick={() => onChoose(item)} className="group relative min-h-52 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.018] p-4 text-left hover:border-white/[0.18] hover:bg-white/[0.035]"><span className="flex h-32 items-center justify-center">{image && <img src={image} alt="" className="max-h-28 max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.06]" />}</span><span className="mt-2 block truncate text-sm font-medium text-stone-100">{parsed.skinName}</span><span className="mt-0.5 block truncate text-xs text-stone-500">{parsed.weaponName}</span><span className="absolute inset-x-0 bottom-0 h-px opacity-70" style={{ backgroundColor: rarity.hex }} /></button>; })}</div>{items.length === 0 && <div className="grid min-h-72 place-items-center text-sm text-stone-500">Nenhum item encontrado.</div>}</div></div>;
}

function AttachmentPicker({ stickerMode, search, onSearch, items, hasKeychain, onClose, onRemove, onChoose }: { stickerMode: boolean; search: string; onSearch: (value: string) => void; items: CS2EconomyItem[]; hasKeychain: boolean; onClose: () => void; onRemove: () => void; onChoose: (item: CS2EconomyItem) => void }) {
  return (
    <motion.div data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex min-h-0 items-center justify-center overflow-hidden bg-black/88 p-3 backdrop-blur-md sm:p-5">
      <motion.section initial={{ scale: 0.98, y: 12 }} animate={{ scale: 1, y: 0 }} className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#050708] sm:max-h-[88dvh]">
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kurage-accent)]">Configuração da arma</p><h3 className="mt-1 text-base font-semibold text-stone-100">{stickerMode ? "Escolher adesivo" : "Escolher chaveiro"}</h3></div><IconButton title="Fechar seletor" onClick={onClose}><PiX /></IconButton></header>
        <div className="shrink-0 border-b border-white/[0.06] p-4"><label className="relative block"><PiMagnifyingGlass className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-600" /><input autoFocus value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Pesquisar pelo nome..." className="h-11 w-full rounded-lg border border-white/[0.08] bg-black/50 pl-10 pr-3 text-sm text-stone-100 outline-none focus:border-[var(--kurage-accent)]/45" /></label></div>
        <div data-lenis-prevent className="min-h-0 flex-1 touch-pan-y overflow-y-scroll overscroll-contain p-4 [scrollbar-gutter:stable]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"><button type="button" onClick={onRemove} className="min-h-32 rounded-xl border border-white/[0.07] bg-white/[0.018] p-3 text-center hover:border-white/[0.18]"><span className="grid h-20 place-items-center"><PiTrash className="size-5 text-stone-600" /></span><span className="text-[11px] text-stone-400">{stickerMode || hasKeychain ? "Remover" : "Nenhum"}</span></button>{items.map((item) => <button key={item.id} type="button" onClick={() => onChoose(item)} className="min-h-32 rounded-xl border border-white/[0.07] bg-white/[0.018] p-3 text-center hover:border-white/[0.18] hover:bg-white/[0.04]"><span className="grid h-20 place-items-center"><img src={getItemImage(item) || ""} alt="" className="max-h-16 max-w-full object-contain" /></span><span className="block truncate text-[11px] text-stone-400">{item.name}</span></button>)}</div>
        </div>
      </motion.section>
    </motion.div>
  );
}
