"use client";

import { useEffect, useMemo, useState } from "react";
import { PiArrowClockwise, PiPlus, PiSparkle } from "react-icons/pi";
import { CS2BaseInventoryItem, CS2EconomyItem } from "@ianlucas/cs2-lib";
import { useAuth } from "@/lib/auth";
import { useKurageInventory } from "@/lib/inventory/inventory-context";
import { sortInventoryItems, TransformedInventoryItem } from "@/lib/inventory/inventory-transform";
import { InventoryHeader, InventorySort } from "@/components/inventory/InventoryHeader";
import { InventoryItemCard } from "@/components/inventory/InventoryItemCard";
import { InventoryOceanicBackground } from "@/components/inventory/InventoryOceanicBackground";
import { MusicKitSlot } from "@/components/inventory/MusicKitSlot";
import { CraftModal } from "@/components/inventory/CraftModal";
import { Inspect3DModal } from "@/components/inventory/Inspect3DModal";
import { ImportInspectModal } from "@/components/inventory/ImportInspectModal";

export default function InventoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading, loginWithSteam } = useAuth();
  const { items, isLoading: isInventoryLoading, itemCount, loadError, syncNow } = useKurageInventory();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<InventorySort>("equipped");
  const [isCraftOpen, setIsCraftOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<TransformedInventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<TransformedInventoryItem | null>(null);
  const [preselectedEconomyItem, setPreselectedEconomyItem] = useState<CS2EconomyItem | null>(null);
  const [preselectedAttributes, setPreselectedAttributes] = useState<Partial<CS2BaseInventoryItem> | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      loginWithSteam("/inventory");
    }
  }, [isAuthLoading, isAuthenticated, loginWithSteam]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const filtered = query
      ? items.filter((entry) =>
          [entry.item.name, entry.item.nameTag]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase("pt-BR").includes(query)),
        )
      : items;
    return sortInventoryItems(filtered, sortBy);
  }, [items, search, sortBy]);

  const openCreate = () => {
    setEditingItem(null);
    setPreselectedEconomyItem(null);
    setPreselectedAttributes(null);
    setIsCraftOpen(true);
  };

  const openEdit = (item: TransformedInventoryItem) => {
    setEditingItem(item);
    setPreselectedEconomyItem(null);
    setPreselectedAttributes(null);
    setIsCraftOpen(true);
  };

  if (isAuthLoading || !isAuthenticated || isInventoryLoading) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-black text-white">
        <InventoryOceanicBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <PiArrowClockwise className="h-7 w-7 animate-spin text-[var(--kurage-accent)]" />
          <p className="text-sm text-white/45">
            {!isAuthLoading && !isAuthenticated ? "Conectando sua identidade Steam…" : "Recuperando seu acervo…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-32 pt-24 text-white sm:pt-32">
      <InventoryOceanicBackground />

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <InventoryHeader
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onOpenCraft={openCreate}
          onOpenImport={() => setIsImportOpen(true)}
        />

        <MusicKitSlot />

        {loadError ? (
          <section className="mt-8 rounded-[14px] border border-red-300/15 bg-red-300/[0.035] p-8 text-center backdrop-blur-xl">
            <h2 className="font-display text-2xl text-white">O acervo não respondeu</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/45">{loadError}</p>
            <button
              type="button"
              onClick={() => void syncNow()}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-[8px] bg-white px-4 text-sm font-semibold text-black"
            >
              <PiArrowClockwise className="h-4 w-4" />
              Tentar novamente
            </button>
          </section>
        ) : visibleItems.length > 0 ? (
          <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Itens do seu inventário">
            {visibleItems.map((item) => (
              <InventoryItemCard
                key={item.uid}
                itemData={item}
                onInspect={setInspectingItem}
                onEdit={openEdit}
              />
            ))}
          </section>
        ) : (
          <section className="mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-[16px] border border-white/[0.07] bg-black/45 px-6 text-center backdrop-blur-xl">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-[var(--kurage-accent)]/20 bg-[var(--kurage-accent)]/[0.07] text-[var(--kurage-accent)]">
              <PiSparkle className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-display text-3xl font-normal text-white">
              {itemCount === 0 ? "Seu primeiro item começa aqui." : "Nada emergiu nessa busca."}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/42">
              {itemCount === 0
                ? "Escolha uma skin, faca, luva ou agente e personalize cada detalhe antes de adicionar ao acervo."
                : "Ajuste o termo pesquisado para reencontrar um item da sua coleção."}
            </p>
            {itemCount === 0 && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-[8px] bg-white px-5 text-sm font-semibold text-black hover:bg-[#f1f7fe]"
              >
                <PiPlus className="h-4 w-4" />
                Adicionar primeiro item
              </button>
            )}
          </section>
        )}
      </div>

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

      <Inspect3DModal
        itemData={inspectingItem}
        onClose={() => setInspectingItem(null)}
        onEdit={(item) => {
          setInspectingItem(null);
          openEdit(item);
        }}
      />

      <ImportInspectModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onOpenCraftWithItem={(item, attributes) => {
          setIsImportOpen(false);
          setEditingItem(null);
          setPreselectedEconomyItem(item);
          setPreselectedAttributes(attributes);
          setIsCraftOpen(true);
        }}
      />
    </div>
  );
}
