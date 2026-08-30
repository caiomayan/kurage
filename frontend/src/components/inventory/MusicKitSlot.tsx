"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PiArrowClockwise,
  PiCheck,
  PiDisc,
  PiMagnifyingGlass,
  PiPlus,
  PiTrash,
  PiX,
} from "react-icons/pi";
import type { CS2EconomyItem } from "@ianlucas/cs2-lib";
import { toast } from "sonner";
import { getMusicKits } from "@/lib/inventory/economy-filters";
import { getItemImage, parseItemName } from "@/lib/inventory/economy-naming";
import { searchEconomyItems } from "@/lib/inventory/economy-search";
import { useKurageInventory } from "@/lib/inventory/inventory-context";

export function MusicKitSlot() {
  const { musicKit, replaceMusicKit, removeMusicKit, isSyncing } = useKurageInventory();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const parsed = musicKit ? parseItemName(musicKit.item) : null;

  const handleRemove = async () => {
    if (!musicKit || isSyncing) return;
    if (!window.confirm(`Remover ${parsed?.skinName || "seu kit de música"}?`)) return;

    const removed = await removeMusicKit();
    if (removed) toast.success("Kit de música removido.");
  };

  return (
    <>
      <section className="mt-6 overflow-hidden rounded-[14px] border border-white/[0.075] bg-[#050708]/82 backdrop-blur-xl" aria-labelledby="music-kit-slot-title">
        <div className="flex min-h-36 flex-col md:flex-row md:items-stretch">
          <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-5 md:w-[230px] md:border-b-0 md:border-r md:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--kurage-accent)]/20 text-[var(--kurage-accent)]">
              <PiDisc className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">Slot permanente</p>
              <h2 id="music-kit-slot-title" className="mt-1 text-sm font-medium text-white">Kit de música</h2>
            </div>
          </div>

          {musicKit ? (
            <div className="flex min-w-0 flex-1 flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-5">
                <div className="grid h-24 w-32 shrink-0 place-items-center">
                  {musicKit.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={musicKit.imageUrl} alt="" className="max-h-24 max-w-32 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,.7)]" />
                  ) : (
                    <PiDisc className="size-8 text-white/15" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#11ff99]/75">
                    <PiCheck className="size-3.5" />
                    Equipado automaticamente
                  </div>
                  <h3 className="mt-2 truncate font-display text-2xl text-white">{parsed?.skinName || musicKit.item.name}</h3>
                  <p className="mt-1 truncate text-xs text-white/35">{parsed?.weaponName || "Kit de música"}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setIsPickerOpen(true)} disabled={isSyncing} title="Substituir kit de música" aria-label="Substituir kit de música" className="grid size-10 place-items-center rounded-[7px] text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40">
                  <PiArrowClockwise className="size-[18px]" />
                </button>
                <button type="button" onClick={() => void handleRemove()} disabled={isSyncing} title="Remover kit de música" aria-label="Remover kit de música" className="grid size-10 place-items-center rounded-[7px] text-white/35 transition hover:bg-red-400/[0.08] hover:text-red-300 disabled:opacity-40">
                  <PiTrash className="size-[18px]" />
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setIsPickerOpen(true)} className="group flex min-h-32 flex-1 items-center justify-between gap-5 px-5 py-5 text-left transition hover:bg-white/[0.018] sm:px-6">
              <div>
                <h3 className="text-sm font-medium text-white/75">Nenhum kit equipado</h3>
                <p className="mt-1 text-xs leading-5 text-white/35">Escolha um kit para ocupar este slot. Ao trocar, o anterior é substituído.</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.1] text-white/45 transition group-hover:border-white/20 group-hover:text-white">
                <PiPlus className="size-4" />
              </span>
            </button>
          )}
        </div>
      </section>

      {isPickerOpen && (
        <MusicKitPicker
          hasCurrentKit={Boolean(musicKit)}
          isSaving={isSyncing}
          onClose={() => setIsPickerOpen(false)}
          onChoose={async (item) => {
            const saved = await replaceMusicKit(item);
            if (!saved) return;
            toast.success(musicKit ? "Kit de música substituído e equipado." : "Kit de música equipado.");
            setIsPickerOpen(false);
          }}
        />
      )}
    </>
  );
}

function MusicKitPicker({
  hasCurrentKit,
  isSaving,
  onClose,
  onChoose,
}: {
  hasCurrentKit: boolean;
  isSaving: boolean;
  onClose: () => void;
  onChoose: (item: CS2EconomyItem) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const kits = useMemo(
    () => searchEconomyItems(getMusicKits(), deferredSearch),
    [deferredSearch],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/92 p-3 backdrop-blur-xl sm:p-6">
      <motion.section role="dialog" aria-modal="true" aria-labelledby="music-kit-picker-title" initial={{ opacity: 0, scale: 0.985, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="flex max-h-[88dvh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#030506]">
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--kurage-accent)]">Kit de música</p>
            <h2 id="music-kit-picker-title" className="mt-1 font-display text-xl text-white">{hasCurrentKit ? "Escolha o substituto" : "Escolha seu kit"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} title="Fechar" aria-label="Fechar" className="grid size-9 place-items-center rounded-[7px] text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40">
            <PiX className="size-5" />
          </button>
        </header>

        <div className="shrink-0 border-b border-white/[0.06] p-4 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Pesquisar kits de música</span>
            <PiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar kits de música" className="h-11 w-full rounded-[8px] border border-white/[0.09] bg-black/60 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25" />
          </label>
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {kits.map((item) => {
              const parsed = parseItemName(item);
              const image = getItemImage(item);
              return (
                <button key={item.id} type="button" disabled={isSaving} onClick={() => void onChoose(item)} className="group min-h-48 overflow-hidden rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-4 text-left transition hover:border-white/[0.17] hover:bg-white/[0.03] disabled:cursor-wait disabled:opacity-45">
                  <span className="grid h-28 place-items-center">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="max-h-24 max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]" />
                    ) : (
                      <PiDisc className="size-7 text-white/15" />
                    )}
                  </span>
                  <span className="mt-3 block truncate text-sm font-medium text-white/85">{parsed.skinName}</span>
                  <span className="mt-1 block truncate text-[11px] text-white/30">{parsed.weaponName}</span>
                </button>
              );
            })}
          </div>
          {kits.length === 0 && <div className="grid min-h-64 place-items-center text-sm text-white/35">Nenhum kit encontrado.</div>}
        </div>
      </motion.section>
    </div>
  );
}
