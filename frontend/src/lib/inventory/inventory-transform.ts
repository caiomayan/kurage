import {
  CS2InventoryItem,
  CS2RarityColor,
} from "@ianlucas/cs2-lib";
import { RARITY_COLORS, RARITY_NAMES, getWearName, getWearShort, ensureEconomyLoaded } from "./economy.ts";

export interface TransformedInventoryItem {
  uid: number;
  item: CS2InventoryItem;
  imageUrl: string;
  rarityColor: { hex: string; bg: string; border: string; glow: string; text: string };
  rarityName: string;
  wearName: string;
  wearShort: string;
  isEquippedCT: boolean;
  isEquippedT: boolean;
  isEquippedBoth: boolean;
  hasStickers: boolean;
  hasKeychain: boolean;
  hasStatTrak: boolean;
  hasNametag: boolean;
}

const RARITY_WEIGHT: Record<string, number> = {
  [CS2RarityColor.Default]: 0,
  [CS2RarityColor.Common]: 1,
  [CS2RarityColor.Uncommon]: 2,
  [CS2RarityColor.Rare]: 3,
  [CS2RarityColor.Mythical]: 4,
  [CS2RarityColor.Legendary]: 5,
  [CS2RarityColor.Ancient]: 6,
  [CS2RarityColor.Immortal]: 7,
};

export function transformItem(item: CS2InventoryItem): TransformedInventoryItem {
  ensureEconomyLoaded();
  const rarityKey = item.rarityColor || CS2RarityColor.Default;
  const rarityColor = RARITY_COLORS[rarityKey] || RARITY_COLORS[CS2RarityColor.Default];
  const rarityName = RARITY_NAMES[rarityKey] || "Padrão";

  const isEquippedBoth = Boolean(item.equipped || (item.equippedCT && item.equippedT));
  const isEquippedCT = Boolean(item.equipped || item.equippedCT);
  const isEquippedT = Boolean(item.equipped || item.equippedT);

  const hasStickers = Boolean(item.stickers && item.stickers.size > 0);
  const hasKeychain = Boolean(item.keychains && item.keychains.size > 0);
  const hasStatTrak = Boolean(item.statTrak !== undefined && item.statTrak !== null);
  const hasNametag = Boolean(item.nameTag && item.nameTag.trim().length > 0);

  return {
    uid: item.uid,
    item,
    imageUrl: item.getImageUrl(item.wear),
    rarityColor,
    rarityName,
    wearName: getWearName(item.wear),
    wearShort: getWearShort(item.wear),
    isEquippedCT,
    isEquippedT,
    isEquippedBoth,
    hasStickers,
    hasKeychain,
    hasStatTrak,
    hasNametag,
  };
}

export function sortInventoryItems(
  items: TransformedInventoryItem[],
  sortBy: "equipped" | "newest" | "rarity" | "name" | "type"
): TransformedInventoryItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === "equipped") {
      const aEquipped = a.isEquippedCT || a.isEquippedT ? 1 : 0;
      const bEquipped = b.isEquippedCT || b.isEquippedT ? 1 : 0;
      if (aEquipped !== bEquipped) return bEquipped - aEquipped;
      return (b.item.updatedAt ?? 0) - (a.item.updatedAt ?? 0);
    }
    if (sortBy === "newest") {
      return (b.item.updatedAt ?? 0) - (a.item.updatedAt ?? 0);
    }
    if (sortBy === "rarity") {
      const wA = RARITY_WEIGHT[a.item.rarityColor] ?? 0;
      const wB = RARITY_WEIGHT[b.item.rarityColor] ?? 0;
      if (wA !== wB) return wB - wA;
      return a.item.name.localeCompare(b.item.name);
    }
    if (sortBy === "name") {
      return a.item.name.localeCompare(b.item.name);
    }
    if (sortBy === "type") {
      return a.item.type.localeCompare(b.item.type);
    }
    return 0;
  });
}
