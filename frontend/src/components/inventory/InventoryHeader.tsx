"use client";

import {
  PiArrowClockwise,
  PiCloudCheck,
  PiDownloadSimple,
  PiMagnifyingGlass,
  PiPlus,
  PiSlidersHorizontal,
} from "react-icons/pi";
import { cn } from "@/lib/utils";
import { useKurageInventory } from "@/lib/inventory/inventory-context";

export type InventorySort = "equipped" | "newest" | "rarity" | "name";

interface InventoryHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: InventorySort;
  onSortChange: (value: InventorySort) => void;
  onOpenCraft: () => void;
  onOpenImport: () => void;
}

export function InventoryHeader({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenCraft,
  onOpenImport,
}: InventoryHeaderProps) {
  const { itemCount, isSyncing, lastSyncedAt, syncNow } = useKurageInventory();

  return (
    <header className="relative overflow-hidden rounded-[16px] border border-white/[0.08] bg-black/55 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--kurage-accent)]/65 to-transparent" />
      <div className="flex flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--kurage-accent)]">
              <PiCloudCheck className="h-4 w-4" />
              <span>Sincronizado com O Mar</span>
            </div>
            <h1 className="font-display text-4xl font-normal leading-none tracking-[-0.035em] text-white sm:text-5xl lg:text-[58px]">
              Seu acervo, sob a superfície.
            </h1>
            <p className="mt-4 max-w-xl font-body text-sm leading-6 text-white/55 sm:text-base">
              Uma coleção privada de itens criados por você, confirmada pelo servidor e pronta para o jogo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={isSyncing}
              aria-label="Sincronizar inventário"
              title="Sincronizar inventário"
              className="grid h-11 w-11 place-items-center rounded-[8px] border border-white/[0.1] bg-white/[0.035] text-white/65 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
              <PiArrowClockwise className={cn("h-[18px] w-[18px]", isSyncing && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-white/[0.1] bg-white/[0.035] px-4 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              <PiDownloadSimple className="h-[18px] w-[18px] text-[var(--kurage-accent)]" />
              <span>Importar</span>
            </button>
            <button
              type="button"
              onClick={onOpenCraft}
              className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#f1f7fe]"
            >
              <PiPlus className="h-[18px] w-[18px]" />
              <span>Adicionar item</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-xs text-white/45">
            <span className="font-mono text-white/80">{itemCount}</span>
            <span>{itemCount === 1 ? "item criado" : "itens criados"}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>
              {lastSyncedAt
                ? `Atualizado às ${lastSyncedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Aguardando sincronização"}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-[300px]">
              <span className="sr-only">Pesquisar no inventário</span>
              <PiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Pesquisar sua coleção"
                className="h-11 w-full rounded-[8px] border border-white/[0.1] bg-black/55 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Ordenar inventário</span>
              <PiSlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <select
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as InventorySort)}
                className="h-11 appearance-none rounded-[8px] border border-white/[0.1] bg-black/55 pl-10 pr-9 text-sm text-white/75 outline-none transition focus:border-white/30"
              >
                <option value="equipped">Equipados primeiro</option>
                <option value="newest">Mais recentes</option>
                <option value="rarity">Raridade</option>
                <option value="name">Nome</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
}
