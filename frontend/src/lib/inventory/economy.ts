import {
  CS2_ITEMS,
  CS2Economy,
  CS2EconomyItem,
  CS2ItemType,
  CS2RarityColor,
  CS2Team,
  CS2_MAX_SEED,
  CS2_MAX_STICKERS,
  CS2_MIN_STICKER_ROTATION,
  CS2_STICKER_WEAR_FACTOR,
  CS2_WEAR_FACTOR,
} from "@ianlucas/cs2-lib";
import { brazilian } from "@ianlucas/cs2-lib/translations/brazilian";

/**
 * Ensures the CS2 economy is always loaded with full item definitions and Portuguese translations.
 */
export function ensureEconomyLoaded() {
  try {
    const sampleItem = CS2Economy.getById(0);
    // If not loaded or loaded without translation (name is "0" or digits)
    if (
      CS2Economy.itemsAsArray.length === 0 ||
      !sampleItem ||
      sampleItem.name === "0" ||
      sampleItem.name === "Desert Eagle" === false
    ) {
      CS2Economy.load({
        items: CS2_ITEMS,
        language: brazilian,
      });
    }
  } catch {
    CS2Economy.load({
      items: CS2_ITEMS,
      language: brazilian,
    });
  }
}

// Initial synchronous load
ensureEconomyLoaded();

export {
  CS2Economy,
  CS2ItemType,
  CS2RarityColor,
  CS2Team,
  CS2_MAX_SEED,
  CS2_MAX_STICKERS,
  CS2_MIN_STICKER_ROTATION,
  CS2_STICKER_WEAR_FACTOR,
  CS2_WEAR_FACTOR,
};
export type { CS2EconomyItem };

export const RARITY_COLORS: Record<CS2RarityColor | string, { hex: string; bg: string; border: string; glow: string; text: string }> = {
  [CS2RarityColor.Default]: {
    hex: "#b0c3d9",
    bg: "rgba(176,195,217,0.08)",
    border: "rgba(176,195,217,0.2)",
    glow: "rgba(176,195,217,0.15)",
    text: "text-stone-400",
  },
  [CS2RarityColor.Common]: {
    hex: "#b0c3d9",
    bg: "rgba(176,195,217,0.08)",
    border: "rgba(176,195,217,0.2)",
    glow: "rgba(176,195,217,0.15)",
    text: "text-stone-300",
  },
  [CS2RarityColor.Uncommon]: {
    hex: "#5e98d9",
    bg: "rgba(94,152,217,0.08)",
    border: "rgba(94,152,217,0.25)",
    glow: "rgba(94,152,217,0.2)",
    text: "text-sky-400",
  },
  [CS2RarityColor.Rare]: {
    hex: "#4b69ff",
    bg: "rgba(75,105,255,0.08)",
    border: "rgba(75,105,255,0.3)",
    glow: "rgba(75,105,255,0.25)",
    text: "text-blue-500",
  },
  [CS2RarityColor.Mythical]: {
    hex: "#8847ff",
    bg: "rgba(136,71,255,0.08)",
    border: "rgba(136,71,255,0.3)",
    glow: "rgba(136,71,255,0.25)",
    text: "text-purple-500",
  },
  [CS2RarityColor.Legendary]: {
    hex: "#d32ce6",
    bg: "rgba(211,44,230,0.08)",
    border: "rgba(211,44,230,0.3)",
    glow: "rgba(211,44,230,0.25)",
    text: "text-pink-500",
  },
  [CS2RarityColor.Ancient]: {
    hex: "#eb4b4b",
    bg: "rgba(235,75,75,0.08)",
    border: "rgba(235,75,75,0.35)",
    glow: "rgba(235,75,75,0.3)",
    text: "text-red-500",
  },
  [CS2RarityColor.Immortal]: {
    hex: "#e4ae39",
    bg: "rgba(228,174,57,0.08)",
    border: "rgba(228,174,57,0.4)",
    glow: "rgba(228,174,57,0.35)",
    text: "text-amber-400",
  },
};

export const RARITY_NAMES: Record<CS2RarityColor | string, string> = {
  [CS2RarityColor.Default]: "Padrão",
  [CS2RarityColor.Common]: "Consumidor (Branco)",
  [CS2RarityColor.Uncommon]: "Industrial (Azul Claro)",
  [CS2RarityColor.Rare]: "Mil-Spec (Azul Escuro)",
  [CS2RarityColor.Mythical]: "Restrito (Roxo)",
  [CS2RarityColor.Legendary]: "Confidencial (Rosa)",
  [CS2RarityColor.Ancient]: "Oculto (Vermelho)",
  [CS2RarityColor.Immortal]: "Extraordinário (Dourado)",
};

export const WEAR_NAMES = [
  { short: "FN", name: "Nova de Fábrica", min: 0.0, max: 0.07 },
  { short: "MW", name: "Pouco Usada", min: 0.07, max: 0.15 },
  { short: "FT", name: "Testada em Campo", min: 0.15, max: 0.38 },
  { short: "WW", name: "Bem Desgastada", min: 0.38, max: 0.45 },
  { short: "BS", name: "Veterana de Guerra", min: 0.45, max: 1.0 },
];

export function getWearName(wear: number | undefined): string {
  if (wear === undefined || wear === null) return "Padrão";
  const found = WEAR_NAMES.find((w) => wear >= w.min && wear <= w.max);
  return found ? found.name : "Testada em Campo";
}

export function getWearShort(wear: number | undefined): string {
  if (wear === undefined || wear === null) return "";
  const found = WEAR_NAMES.find((w) => wear >= w.min && wear <= w.max);
  return found ? found.short : "FT";
}
