import { CS2Economy, CS2EconomyItem } from "@ianlucas/cs2-lib";
import { ensureEconomyLoaded } from "./economy.ts";

export interface EconomyFilterCategory {
  id: "skins" | "knives" | "gloves" | "agents";
  label: string;
  accepts: (item: CS2EconomyItem) => boolean;
}

const isCreatedItem = (item: CS2EconomyItem) => !item.isDefault && !item.isBase;

export const ECONOMY_CATEGORIES: EconomyFilterCategory[] = [
  {
    id: "skins",
    label: "Skins",
    accepts: (item) => item.isWeapon() && isCreatedItem(item),
  },
  {
    id: "knives",
    label: "Facas",
    accepts: (item) => item.isMelee() && isCreatedItem(item),
  },
  {
    id: "gloves",
    label: "Luvas",
    accepts: (item) => item.isGloves() && isCreatedItem(item),
  },
  {
    id: "agents",
    label: "Agentes",
    accepts: (item) => item.isAgent() && isCreatedItem(item),
  },
];

export const MUSIC_KIT_CATEGORY = {
  id: "musickits",
  label: "Kits de música",
  accepts: (item: CS2EconomyItem) => item.isMusicKit() && isCreatedItem(item),
} as const;

export function getCraftableItems(category: EconomyFilterCategory): CS2EconomyItem[] {
  ensureEconomyLoaded();
  return CS2Economy.itemsAsArray.filter(category.accepts);
}

export function getAllCraftableItems(): CS2EconomyItem[] {
  ensureEconomyLoaded();
  return CS2Economy.itemsAsArray.filter((item) =>
    ECONOMY_CATEGORIES.some((category) => category.accepts(item)),
  );
}

export function getMusicKits(): CS2EconomyItem[] {
  ensureEconomyLoaded();
  return CS2Economy.itemsAsArray.filter(MUSIC_KIT_CATEGORY.accepts);
}
