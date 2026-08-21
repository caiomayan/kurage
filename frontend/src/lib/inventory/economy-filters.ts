import { CS2Economy, CS2EconomyItem, CS2ItemType } from "@ianlucas/cs2-lib";
import { ensureEconomyLoaded } from "./economy.ts";

export interface EconomyFilterCategory {
  id: string;
  label: string;
  type: CS2ItemType;
  loadoutCategory?: string;
  hasModel: boolean;
  isFree?: boolean;
}

export const ECONOMY_CATEGORIES: EconomyFilterCategory[] = [
  {
    id: "pistol",
    label: "Pistolas",
    type: CS2ItemType.Weapon,
    loadoutCategory: "secondary",
    hasModel: true,
    isFree: true,
  },
  {
    id: "rifle",
    label: "Rifles",
    type: CS2ItemType.Weapon,
    loadoutCategory: "rifle",
    hasModel: true,
    isFree: true,
  },
  {
    id: "smg",
    label: "SMGs",
    type: CS2ItemType.Weapon,
    loadoutCategory: "smg",
    hasModel: true,
    isFree: true,
  },
  {
    id: "heavy",
    label: "Pesadas",
    type: CS2ItemType.Weapon,
    loadoutCategory: "heavy",
    hasModel: true,
    isFree: true,
  },
  {
    id: "knife",
    label: "Facas",
    type: CS2ItemType.Melee,
    hasModel: true,
  },
  {
    id: "glove",
    label: "Luvas",
    type: CS2ItemType.Gloves,
    hasModel: true,
  },
  {
    id: "sticker",
    label: "Adesivos",
    type: CS2ItemType.Sticker,
    hasModel: false,
  },
  {
    id: "keychain",
    label: "Chaveiros",
    type: CS2ItemType.Keychain,
    hasModel: false,
  },
  {
    id: "agent",
    label: "Agentes",
    type: CS2ItemType.Agent,
    hasModel: false,
  },
  {
    id: "patch",
    label: "Emblemas",
    type: CS2ItemType.Patch,
    hasModel: false,
  },
  {
    id: "musickit",
    label: "Kits de Música",
    type: CS2ItemType.MusicKit,
    hasModel: false,
  },
  {
    id: "case",
    label: "Caixas & Cápsulas",
    type: CS2ItemType.Container,
    hasModel: false,
  },
  {
    id: "tool",
    label: "Ferramentas",
    type: CS2ItemType.Tool,
    hasModel: false,
  },
];

/**
 * Returns the base models for categories with models (e.g. AK-47, M4A4, Karambit, Sport Gloves)
 * or items for non-model categories (e.g. Cases, Music Kits, Agents).
 */
export function getBaseItems(category: EconomyFilterCategory): CS2EconomyItem[] {
  ensureEconomyLoaded();
  if (category.hasModel) {
    return CS2Economy.filterItems({
      loadoutCategory: category.loadoutCategory,
      type: category.type,
      isBase: true,
    }).filter(({ isDefault }) =>
      category.isFree ? isDefault : !isDefault
    );
  }

  return CS2Economy.filterItems({
    type: category.type,
  }).filter(({ isDefault }) => !isDefault);
}

/**
 * Returns all skin finishes for a specific base model (e.g. all AK-47 skins or Karambit finishes)
 */
export function getPaidItems(category: EconomyFilterCategory, modelKey: string): CS2EconomyItem[] {
  ensureEconomyLoaded();
  return CS2Economy.filterItems({
    modelKey,
  }).filter(({ isBase }) => category.type === CS2ItemType.Melee || !isBase);
}

/**
 * Returns all craftable items for universal search
 */
export function getAllPaidItems(): CS2EconomyItem[] {
  ensureEconomyLoaded();
  return CS2Economy.itemsAsArray.filter(
    ({ isBase, type }) =>
      type !== CS2ItemType.Stub && (type === CS2ItemType.Melee || !isBase)
  );
}
