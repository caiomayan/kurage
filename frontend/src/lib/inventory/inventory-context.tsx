"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  CS2Economy,
  CS2Inventory,
  CS2EconomyItem,
  CS2InventoryItem,
  CS2Team,
  CS2_ITEMS,
} from "@ianlucas/cs2-lib";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TransformedInventoryItem, transformItem } from "./inventory-transform";
import { ensureEconomyLoaded } from "./economy.ts";

// Ensure economy is initialized with full translations
ensureEconomyLoaded();

const STORAGE_KEY = "kurage_cs2_inventory_v1";

export interface CraftAttributes {
  id: number;
  wear?: number;
  seed?: number;
  stattrak?: boolean;
  nameTag?: string;
  stickers?: Record<
    string,
    {
      id: number;
      wear?: number;
      schema?: number;
      x?: number;
      y?: number;
      rotation?: number;
    }
  >;
  keychains?: Record<
    string,
    {
      id: number;
      x?: number;
      y?: number;
      z?: number;
      seed?: number;
    }
  >;
  quantity?: number;
}

interface InventoryContextType {
  inventory: CS2Inventory;
  items: TransformedInventoryItem[];
  itemCount: number;
  maxItems: number;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  craft: (item: CS2EconomyItem, attributes?: Partial<CraftAttributes>) => void;
  edit: (uid: number, attributes: Partial<CraftAttributes>) => void;
  remove: (uid: number) => void;
  equip: (uid: number, team?: CS2Team) => void;
  unequip: (uid: number, team?: CS2Team) => void;
  applySticker: (
    targetUid: number,
    stickerId: number,
    slot: number,
    options?: { wear?: number; x?: number; y?: number; rotation?: number },
  ) => void;
  scrapeSticker: (targetUid: number, slot: number) => void;
  applyKeychain: (
    targetUid: number,
    keychainId: number,
    options?: { x?: number; y?: number; z?: number; seed?: number },
  ) => void;
  detachKeychain: (targetUid: number) => void;
  unlockCase: (caseItem: CS2EconomyItem) => CS2EconomyItem | null;
  clearInventory: () => void;
  syncNow: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function useKurageInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error(
      "useKurageInventory must be used within an InventoryProvider",
    );
  }
  return context;
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [inventory, setInventory] = useState<CS2Inventory>(
    () => new CS2Inventory({ maxItems: 1000 }),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from LocalStorage or Backend
  useEffect(() => {
    async function loadInitial() {
      let initialData: any = undefined;

      // 1. Try local storage first
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          initialData = JSON.parse(local);
        }
      } catch {
        // ignore
      }

      // 2. If authenticated, try fetching from backend
      if (isAuthenticated) {
        try {
          const res = await api.get<any>("/inventory/me");
          if (
            res &&
            ((Array.isArray(res) && res.length > 0) ||
              (typeof res === "object" && Object.keys(res).length > 0))
          ) {
            initialData = res;
          }
        } catch {
          // fallback to local
        }
      }

      const inv = new CS2Inventory({
        data: initialData,
        maxItems: 1000,
      });

      setInventory(inv);
      setIsLoading(false);
    }

    loadInitial();
  }, [isAuthenticated]);

  // Persist locally & debounced sync with backend
  const persistAndSync = useCallback(
    (newInv: CS2Inventory) => {
      const cloned = newInv.move();
      setInventory(cloned);

      try {
        const rawJson = cloned.getData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rawJson));
      } catch {
        // ignore storage error
      }

      if (isAuthenticated) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(async () => {
          setIsSyncing(true);
          try {
            const rawJson = cloned.getData();
            await api.put("/inventory/me", { items: rawJson });
            setLastSyncedAt(new Date());
          } catch {
            // sync failed
          } finally {
            setIsSyncing(false);
          }
        }, 1200);
      }
    },
    [isAuthenticated],
  );

  // Manual immediate sync
  const syncNow = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    try {
      const rawJson = inventory.getData();
      await api.put("/inventory/me", { items: rawJson });
      setLastSyncedAt(new Date());
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, inventory]);

  // Helper to sanitize payload against CS2 item capabilities
  const sanitizeAttributes = (
    item: CS2EconomyItem,
    attributes?: Partial<CraftAttributes>,
  ) => {
    const payload: any = { id: item.id };

    if (
      typeof item.hasWear === "function" &&
      item.hasWear() &&
      attributes?.wear !== undefined
    ) {
      const min = item.wearMin ?? 0.0;
      const max = item.wearMax ?? 1.0;
      payload.wear = Math.max(min, Math.min(max, attributes.wear));
    }

    if (
      typeof item.hasSeed === "function" &&
      item.hasSeed() &&
      attributes?.seed !== undefined
    ) {
      payload.seed = attributes.seed;
    }

    if (
      typeof item.hasStatTrak === "function" &&
      item.hasStatTrak() &&
      attributes?.stattrak
    ) {
      payload.statTrak = 0;
    }

    if (
      typeof item.hasNameTag === "function" &&
      item.hasNameTag() &&
      attributes?.nameTag &&
      attributes.nameTag.trim().length > 0
    ) {
      payload.nameTag = attributes.nameTag.trim();
    }

    if (
      typeof item.hasStickers === "function" &&
      item.hasStickers() &&
      attributes?.stickers &&
      Object.keys(attributes.stickers).length > 0
    ) {
      payload.stickers = attributes.stickers;
    }

    if (
      typeof item.hasKeychains === "function" &&
      item.hasKeychains() &&
      attributes?.keychains &&
      Object.keys(attributes.keychains).length > 0
    ) {
      payload.keychains = attributes.keychains;
    }

    return payload;
  };

  // ── Actions ──
  const craft = useCallback(
    (item: CS2EconomyItem, attributes?: Partial<CraftAttributes>) => {
      try {
        const payload = sanitizeAttributes(item, attributes);
        const quantity = attributes?.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          inventory.add(payload);
        }
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error crafting item:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const edit = useCallback(
    (uid: number, attributes: Partial<CraftAttributes>) => {
      try {
        const existing = inventory.get(uid);
        if (!existing) return;

        const editPayload: any = {};
        if (
          typeof existing.hasWear === "function" &&
          existing.hasWear() &&
          attributes.wear !== undefined
        ) {
          const min = existing.wearMin ?? 0.0;
          const max = existing.wearMax ?? 1.0;
          editPayload.wear = Math.max(min, Math.min(max, attributes.wear));
        }

        if (
          typeof existing.hasSeed === "function" &&
          existing.hasSeed() &&
          attributes.seed !== undefined
        ) {
          editPayload.seed = attributes.seed;
        }

        if (
          typeof existing.hasStatTrak === "function" &&
          existing.hasStatTrak() &&
          attributes.stattrak !== undefined
        ) {
          editPayload.statTrak = attributes.stattrak
            ? (existing.statTrak ?? 0)
            : undefined;
        }

        if (
          typeof existing.hasNameTag === "function" &&
          existing.hasNameTag()
        ) {
          editPayload.nameTag =
            attributes.nameTag && attributes.nameTag.trim().length > 0
              ? attributes.nameTag.trim()
              : undefined;
        }

        if (
          typeof existing.hasStickers === "function" &&
          existing.hasStickers()
        ) {
          editPayload.stickers =
            attributes.stickers && Object.keys(attributes.stickers).length > 0
              ? attributes.stickers
              : undefined;
        }

        if (
          typeof existing.hasKeychains === "function" &&
          existing.hasKeychains()
        ) {
          editPayload.keychains =
            attributes.keychains && Object.keys(attributes.keychains).length > 0
              ? attributes.keychains
              : undefined;
        }

        inventory.edit(uid, editPayload);
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error editing item:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const remove = useCallback(
    (uid: number) => {
      try {
        inventory.remove(uid);
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error removing item:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const equip = useCallback(
    (uid: number, team?: CS2Team) => {
      try {
        const target = inventory.get(uid);
        if (!target) return;

        if (team !== undefined) {
          const teams = (target as any).teams as CS2Team[] | undefined;
          if (
            Array.isArray(teams) &&
            teams.length > 0 &&
            !teams.includes(team)
          ) {
            return;
          }
        }

        inventory.equip(uid, team);
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error equipping item:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const unequip = useCallback(
    (uid: number, team?: CS2Team) => {
      try {
        inventory.unequip(uid, team);
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error unequipping item:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const applySticker = useCallback(
    (
      targetUid: number,
      stickerId: number,
      slot: number,
      options?: { wear?: number; x?: number; y?: number; rotation?: number },
    ) => {
      try {
        const item = inventory.get(targetUid);
        if (!item) return;
        const currentStickers = item.stickers
          ? Object.fromEntries(item.stickers)
          : {};
        currentStickers[slot] = {
          id: stickerId,
          wear: options?.wear,
          x: options?.x,
          y: options?.y,
          rotation: options?.rotation,
        };
        inventory.edit(targetUid, { stickers: currentStickers });
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error applying sticker:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const scrapeSticker = useCallback(
    (targetUid: number, slot: number) => {
      try {
        const item = inventory.get(targetUid);
        if (!item || !item.stickers) return;
        const currentStickers = Object.fromEntries(item.stickers);
        const currentSticker = currentStickers[slot];
        if (!currentSticker) return;

        const currentWear = currentSticker.wear || 0;
        const nextWear = currentWear + 0.15;
        if (nextWear >= 1.0) {
          delete currentStickers[slot];
        } else {
          currentStickers[slot] = { ...currentSticker, wear: nextWear };
        }
        inventory.edit(targetUid, { stickers: currentStickers });
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error scraping sticker:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const applyKeychain = useCallback(
    (
      targetUid: number,
      keychainId: number,
      options?: { x?: number; y?: number; z?: number; seed?: number },
    ) => {
      try {
        const item = inventory.get(targetUid);
        if (!item) return;
        const currentKeychains: Record<string, any> = {};
        currentKeychains[0] = {
          id: keychainId,
          x: options?.x,
          y: options?.y,
          z: options?.z,
          seed: options?.seed,
        };
        inventory.edit(targetUid, { keychains: currentKeychains });
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error applying keychain:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const detachKeychain = useCallback(
    (targetUid: number) => {
      try {
        inventory.edit(targetUid, { keychains: {} });
        persistAndSync(inventory);
      } catch (err) {
        console.error("Error detaching keychain:", err);
      }
    },
    [inventory, persistAndSync],
  );

  const unlockCase = useCallback(
    (caseItem: CS2EconomyItem) => {
      try {
        // Unlock random item from container contents
        const contents = caseItem.contents;
        if (contents && contents.length > 0) {
          const winner = contents[Math.floor(Math.random() * contents.length)];
          inventory.add({
            id: winner.id,
            wear: winner.hasWear() ? Math.random() * 0.4 : undefined,
            seed: winner.hasSeed()
              ? Math.floor(Math.random() * 1000)
              : undefined,
          });
          persistAndSync(inventory);
          return winner;
        }
      } catch (err) {
        console.error("Error unlocking container:", err);
      }
      return null;
    },
    [inventory, persistAndSync],
  );

  const clearInventory = useCallback(() => {
    try {
      inventory.removeAll();
      persistAndSync(inventory);
    } catch (err) {
      console.error("Error clearing inventory:", err);
    }
  }, [inventory, persistAndSync]);

  // Transformed items
  const items: TransformedInventoryItem[] = inventory
    .getAll()
    .map(transformItem);

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        items,
        itemCount: items.length,
        maxItems: inventory.options.maxItems || 1000,
        isLoading,
        isSyncing,
        lastSyncedAt,
        craft,
        edit,
        remove,
        equip,
        unequip,
        applySticker,
        scrapeSticker,
        applyKeychain,
        detachKeychain,
        unlockCase,
        clearInventory,
        syncNow,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
