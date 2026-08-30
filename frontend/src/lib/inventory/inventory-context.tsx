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
  CS2Inventory,
  CS2InventoryData,
  CS2BaseInventoryItem,
  CS2EconomyItem,
  CS2Team,
} from "@ianlucas/cs2-lib";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { TransformedInventoryItem, transformItem } from "./inventory-transform";
import { ensureEconomyLoaded } from "./economy.ts";
import { removeMusicKitSlot, replaceMusicKitSlot } from "./inventory-music-kit.ts";

// Ensure economy is initialized with full translations
ensureEconomyLoaded();

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
  musicKit: TransformedInventoryItem | null;
  itemCount: number;
  maxItems: number;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  loadError: string | null;
  isAuthenticated: boolean;
  craft: (item: CS2EconomyItem, attributes?: Partial<CraftAttributes>) => Promise<boolean>;
  replaceMusicKit: (item: CS2EconomyItem) => Promise<boolean>;
  removeMusicKit: () => Promise<boolean>;
  edit: (uid: number, attributes: Partial<CraftAttributes>) => Promise<boolean>;
  remove: (uid: number) => Promise<boolean>;
  equip: (uid: number, team?: CS2Team) => Promise<boolean>;
  unequip: (uid: number, team?: CS2Team) => Promise<boolean>;
  applySticker: (
    targetUid: number,
    stickerId: number,
    slot: number,
    options?: { wear?: number; x?: number; y?: number; rotation?: number },
  ) => Promise<boolean>;
  scrapeSticker: (targetUid: number, slot: number) => Promise<boolean>;
  applyKeychain: (
    targetUid: number,
    keychainId: number,
    options?: { x?: number; y?: number; z?: number; seed?: number },
  ) => Promise<boolean>;
  detachKeychain: (targetUid: number) => Promise<boolean>;
  clearInventory: () => Promise<boolean>;
  syncNow: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function isTransientInventoryFailure(error: unknown): boolean {
  // Fetch rejects network interruptions as a TypeError. API failures are safe
  // to retry only when the server reports a transient 5xx condition.
  return !(error instanceof ApiError) || error.status >= 500;
}

async function retryInventoryRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isTransientInventoryFailure(error)) throw error;
    await delay(350);
    return request();
  }
}

function inventoryFailureMessage(error: unknown, action: "load" | "sync" | "save"): string {
  if (error instanceof ApiError && error.status === 429) {
    return "O inventário recebeu muitas solicitações. Aguarde alguns segundos e tente novamente.";
  }
  if (error instanceof ApiError && error.status === 401) {
    return "Não foi possível renovar sua sessão. Atualize a página e tente novamente.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "O servidor recusou esta alteração. Atualize o inventário e tente novamente.";
  }
  if (action === "load") return "Não foi possível carregar o inventário confirmado pelo servidor.";
  if (action === "sync") return "Não foi possível atualizar o inventário confirmado pelo servidor.";
  return "O servidor não confirmou a alteração do inventário.";
}

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
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [inventory, setInventory] = useState<CS2Inventory>(
    () => new CS2Inventory({ maxItems: 1000 }),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mutationInFlightRef = useRef(false);

  const createInventory = useCallback((data?: CS2InventoryData) => {
    return new CS2Inventory({ data, maxItems: 1000 });
  }, []);

  // The backend is the sole source of truth. Legacy browser-only inventories are
  // deliberately discarded instead of being shown or silently uploaded.
  useEffect(() => {
    let cancelled = false;

    async function loadConfirmedInventory() {
      if (isAuthLoading) return;

      setIsLoading(true);
      setLoadError(null);

      if (!isAuthenticated) {
        localStorage.removeItem("kurage_cs2_inventory_v1");
        if (!cancelled) {
          setInventory(createInventory());
          setLastSyncedAt(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const confirmedInventory = await retryInventoryRequest(() => api.get<CS2InventoryData>("/inventory/me"));
        if (!cancelled) {
          setInventory(createInventory(confirmedInventory));
          setLastSyncedAt(new Date());
        }
      } catch (error) {
        if (!cancelled) {
          setInventory(createInventory());
          setLoadError(inventoryFailureMessage(error, "load"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadConfirmedInventory();
    return () => {
      cancelled = true;
    };
  }, [createInventory, isAuthenticated, isAuthLoading]);

  const cloneInventory = useCallback(
    (source: CS2Inventory) => createInventory(source.getData()),
    [createInventory],
  );

  const persistConfirmedInventory = useCallback(
    async (candidate: CS2Inventory): Promise<boolean> => {
      if (!isAuthenticated) {
        toast.error("Entre com a Steam para alterar seu inventário.");
        return false;
      }
      if (mutationInFlightRef.current) {
        toast.info("Aguarde a confirmação da alteração anterior.");
        return false;
      }

      mutationInFlightRef.current = true;
      setIsSyncing(true);
      try {
        const confirmedInventory = await retryInventoryRequest(() => api.put<CS2InventoryData>("/inventory/me", {
          items: candidate.getData(),
        }));
        setInventory(createInventory(confirmedInventory));
        setLastSyncedAt(new Date());
        setLoadError(null);
        return true;
      } catch (error) {
        toast.error(inventoryFailureMessage(error, "save"));
        return false;
      } finally {
        mutationInFlightRef.current = false;
        setIsSyncing(false);
      }
    },
    [createInventory, isAuthenticated],
  );

  // Refreshes from the server; it never uploads a browser-only state.
  const syncNow = useCallback(async () => {
    if (!isAuthenticated || mutationInFlightRef.current) return;

    mutationInFlightRef.current = true;
    setIsSyncing(true);
    try {
      const confirmedInventory = await retryInventoryRequest(() => api.get<CS2InventoryData>("/inventory/me"));
      setInventory(createInventory(confirmedInventory));
      setLastSyncedAt(new Date());
      setLoadError(null);
    } catch (error) {
      const message = inventoryFailureMessage(error, "sync");
      setLoadError(message);
      toast.error(message);
    } finally {
      mutationInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [createInventory, isAuthenticated]);

  // Helper to sanitize payload against CS2 item capabilities
  const sanitizeAttributes = (
    item: CS2EconomyItem,
    attributes?: Partial<CraftAttributes>,
  ) => {
    const payload: CS2BaseInventoryItem = { id: item.id };

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
  const replaceMusicKit = useCallback(
    async (item: CS2EconomyItem) => {
      if (!item.isMusicKit()) {
        toast.error("Este item não é um kit de música.");
        return false;
      }

      try {
        const candidate = cloneInventory(inventory);
        replaceMusicKitSlot(candidate, item);
        return await persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error replacing music kit:", err);
        toast.error("Não foi possível atualizar seu kit de música.");
        return false;
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const removeMusicKit = useCallback(async () => {
    try {
      const candidate = cloneInventory(inventory);
      if (!removeMusicKitSlot(candidate)) return true;
      return await persistConfirmedInventory(candidate);
    } catch (err) {
      console.error("Error removing music kit:", err);
      toast.error("Não foi possível remover seu kit de música.");
      return false;
    }
  }, [cloneInventory, inventory, persistConfirmedInventory]);

  const craft = useCallback(
    async (item: CS2EconomyItem, attributes?: Partial<CraftAttributes>) => {
      if (item.isMusicKit()) {
        return replaceMusicKit(item);
      }

      try {
        const candidate = cloneInventory(inventory);
        const payload = sanitizeAttributes(item, attributes);
        const quantity = attributes?.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          candidate.add(payload);
        }
        return await persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error crafting item:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return false;
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory, replaceMusicKit],
  );

  const edit = useCallback(
    async (uid: number, attributes: Partial<CraftAttributes>) => {
      try {
        const candidate = cloneInventory(inventory);
        const existing = candidate.get(uid);
        if (!existing) return false;

        const editPayload: Partial<CS2BaseInventoryItem> = {};
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

        candidate.edit(uid, editPayload);
        return await persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error editing item:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return false;
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const remove = useCallback(
    async (uid: number) => {
      try {
        const candidate = cloneInventory(inventory);
        candidate.remove(uid);
        return await persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error removing item:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return false;
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const equip = useCallback(
    async (uid: number, team?: CS2Team) => {
      try {
        const candidate = cloneInventory(inventory);
        const target = candidate.get(uid);
        if (!target) return false;

        if (team !== undefined) {
          const teams = target.teams as CS2Team[] | undefined;
          if (
            Array.isArray(teams) &&
            teams.length > 0 &&
            !teams.includes(team)
          ) {
            return false;
          }
        }

        candidate.equip(uid, team);
        return await persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error equipping item:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return false;
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const unequip = useCallback(
    async (uid: number, team?: CS2Team) => {
      try {
        const candidate = cloneInventory(inventory);
        candidate.unequip(uid, team);
        return await persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error unequipping item:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return false;
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const applySticker = useCallback(
    (
      targetUid: number,
      stickerId: number,
      slot: number,
      options?: { wear?: number; x?: number; y?: number; rotation?: number },
    ) => {
      try {
        const candidate = cloneInventory(inventory);
        const item = candidate.get(targetUid);
        if (!item) return Promise.resolve(false);
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
        candidate.edit(targetUid, { stickers: currentStickers });
        return persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error applying sticker:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return Promise.resolve(false);
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const scrapeSticker = useCallback(
    (targetUid: number, slot: number) => {
      try {
        const candidate = cloneInventory(inventory);
        const item = candidate.get(targetUid);
        if (!item || !item.stickers) return Promise.resolve(false);
        const currentStickers = Object.fromEntries(item.stickers);
        const currentSticker = currentStickers[slot];
        if (!currentSticker) return Promise.resolve(false);

        const currentWear = currentSticker.wear || 0;
        const nextWear = currentWear + 0.15;
        if (nextWear >= 1.0) {
          delete currentStickers[slot];
        } else {
          currentStickers[slot] = { ...currentSticker, wear: nextWear };
        }
        candidate.edit(targetUid, { stickers: currentStickers });
        return persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error scraping sticker:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return Promise.resolve(false);
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const applyKeychain = useCallback(
    (
      targetUid: number,
      keychainId: number,
      options?: { x?: number; y?: number; z?: number; seed?: number },
    ) => {
      try {
        const candidate = cloneInventory(inventory);
        const item = candidate.get(targetUid);
        if (!item) return Promise.resolve(false);
        const currentKeychains: NonNullable<CS2BaseInventoryItem["keychains"]> = {};
        currentKeychains[0] = {
          id: keychainId,
          x: options?.x,
          y: options?.y,
          z: options?.z,
          seed: options?.seed,
        };
        candidate.edit(targetUid, { keychains: currentKeychains });
        return persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error applying keychain:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return Promise.resolve(false);
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const detachKeychain = useCallback(
    (targetUid: number) => {
      try {
        const candidate = cloneInventory(inventory);
        candidate.edit(targetUid, { keychains: {} });
        return persistConfirmedInventory(candidate);
      } catch (err) {
        console.error("Error detaching keychain:", err);
        toast.error("Não foi possível preparar a alteração do inventário.");
        return Promise.resolve(false);
      }
    },
    [cloneInventory, inventory, persistConfirmedInventory],
  );

  const clearInventory = useCallback(async () => {
    try {
      const candidate = cloneInventory(inventory);
      candidate.removeAll();
      return await persistConfirmedInventory(candidate);
    } catch (err) {
      console.error("Error clearing inventory:", err);
      toast.error("Não foi possível preparar a alteração do inventário.");
      return false;
    }
  }, [cloneInventory, inventory, persistConfirmedInventory]);

  // Transformed items
  const customItems = inventory
    .getAll()
    .filter((item) => !item.isDefault);
  const items: TransformedInventoryItem[] = customItems
    .filter((item) => !item.isMusicKit())
    .map(transformItem);
  const musicKit = customItems
    .filter((item) => item.isMusicKit())
    .sort((a, b) => Number(Boolean(b.equipped)) - Number(Boolean(a.equipped)))
    .map(transformItem)[0] ?? null;

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        items,
        musicKit,
        itemCount: items.length,
        maxItems: inventory.options.maxItems || 1000,
        isLoading,
        isSyncing,
        lastSyncedAt,
        loadError,
        isAuthenticated,
        craft,
        replaceMusicKit,
        removeMusicKit,
        edit,
        remove,
        equip,
        unequip,
        applySticker,
        scrapeSticker,
        applyKeychain,
        detachKeychain,
        clearInventory,
        syncNow,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
