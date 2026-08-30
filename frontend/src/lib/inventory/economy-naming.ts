import { CS2EconomyItem, CS2Economy } from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations/english";
import { ensureEconomyLoaded } from "./economy.ts";

export interface ParsedItemName {
  weaponName: string;
  skinName: string;
  fullName: string;
  isBase: boolean;
  categoryLabel?: string;
}

export const MODEL_KEY_WEAPON_NAMES: Record<string, string> = {
  // Pistols
  deagle: "Desert Eagle",
  elite: "Berettas Duplas",
  fiveseven: "Five-SeveN",
  glock: "Glock-18",
  tec9: "Tec-9",
  hkp2000: "P2000",
  p250: "P250",
  usp_silencer: "USP-S",
  cz75a: "CZ75-Auto",
  revolver: "Revólver R8",

  // Rifles
  ak47: "AK-47",
  aug: "AUG",
  awp: "AWP",
  famas: "FAMAS",
  g3sg1: "G3SG1",
  galilar: "Galil AR",
  m4a1: "M4A4",
  m4a1_silencer: "M4A1-S",
  scar20: "SCAR-20",
  sg556: "SG 553",
  ssg08: "SSG 08",

  // SMGs
  mac10: "MAC-10",
  p90: "P90",
  mp5sd: "MP5-SD",
  ump45: "UMP-45",
  bizon: "PP-Bizon",
  mp7: "MP7",
  mp9: "MP9",

  // Heavy
  m249: "M249",
  xm1014: "XM1014",
  mag7: "MAG-7",
  negev: "Negev",
  sawedoff: "Cano Curto",
  nova: "Nova",

  // Knives
  knife: "Faca Padrão",
  knife_t: "Faca Padrão",
  bayonet: "Baioneta",
  knife_css: "Faca Clássica",
  knife_flip: "Canivete",
  knife_gut: "Faca Gut Hook",
  knife_karambit: "Karambit",
  knife_m9_bayonet: "Baioneta M9",
  knife_tactical: "Faca do Caçador",
  knife_falchion: "Canivete Falchion",
  knife_survival_bowie: "Faca Bowie",
  knife_butterfly: "Canivete Borboleta",
  knife_push: "Adagas Sombrias",
  knife_cord: "Faca de Cordame",
  knife_canis: "Faca de Sobrevivência",
  knife_ursus: "Faca Ursus",
  knife_gypsy_jackknife: "Faca Navaja",
  knife_outdoor: "Faca Nômade",
  knife_stiletto: "Faca Stiletto",
  knife_widowmaker: "Faca Talon",
  knife_skeleton: "Faca Esqueleto",
  knife_kukri: "Faca Kukri",

  // Gloves
  studded_brokenfang_gloves: "Luvas da Presa Quebrada",
  studded_bloodhound_gloves: "Luvas do Cão de Caça",
  t_gloves: "Luvas Terroristas",
  ct_gloves: "Luvas Contraterroristas",
  sporty_gloves: "Luvas Esportivas",
  slick_gloves: "Luvas de Motorista",
  leather_handwraps: "Faixas",
  motorcycle_gloves: "Luvas de Motociclismo",
  specialist_gloves: "Luvas de Especialista",
  studded_hydra_gloves: "Luvas da Hidra",

  // Equipment & Utility
  c4: "Bomba C4",
  taser: "Zeus x27",
};

/**
 * Parses an item name cleanly into Weapon Model and Skin Name.
 */
export function parseItemName(item: CS2EconomyItem | { id?: number; name?: string; isBase?: boolean; modelKey?: string; type?: string }): ParsedItemName {
  ensureEconomyLoaded();

  let rawName = item.name || "";

  // If name is just pure digits (like "0", "451") because of untranslated load, attempt to fetch fresh from CS2Economy
  if (!rawName || /^\d+$/.test(rawName.trim())) {
    if (item.id !== undefined) {
      const refreshed = CS2Economy.getById(item.id);
      if (refreshed && refreshed.name && !/^\d+$/.test(refreshed.name.trim())) {
        rawName = refreshed.name;
      }
    }
  }

  // Fallback to modelKey dictionary if still digits or empty
  if (!rawName || /^\d+$/.test(rawName.trim())) {
    if (item.modelKey && MODEL_KEY_WEAPON_NAMES[item.modelKey]) {
      const weapon = MODEL_KEY_WEAPON_NAMES[item.modelKey];
      return {
        weaponName: weapon,
        skinName: item.isBase ? "Padrão" : weapon,
        fullName: weapon,
        isBase: Boolean(item.isBase),
      };
    }
  }

  const fullName = rawName || "Item CS2";
  const clean = fullName.replace(/^★\s*/, "").replace(/^StatTrak™\s*/, "").trim();

  // Split by " | "
  const parts = clean.split(" | ");

  if (parts.length >= 2) {
    let weapon = parts[0].trim();
    if (weapon === "Recipiente") weapon = "Caixa";
    if (weapon === "Trilha Sonora") weapon = "Música";

    const skin = parts.slice(1).join(" | ").trim();
    return {
      weaponName: weapon,
      skinName: skin,
      fullName,
      isBase: Boolean(item.isBase),
    };
  }

  // If item is a base weapon model
  if (item.modelKey && MODEL_KEY_WEAPON_NAMES[item.modelKey]) {
    const weapon = MODEL_KEY_WEAPON_NAMES[item.modelKey];
    return {
      weaponName: weapon,
      skinName: item.isBase ? "Padrão" : clean,
      fullName,
      isBase: Boolean(item.isBase),
    };
  }

  return {
    weaponName: clean,
    skinName: item.isBase ? "Padrão" : clean,
    fullName,
    isBase: Boolean(item.isBase),
  };
}

/**
 * Keeps the catalog display in Portuguese while exposing the official English
 * item name to the search index. CS2 players naturally use both vocabularies.
 */
export function getItemSearchNames(item: { id?: number; name?: string }): string[] {
  const names = [item.name];
  if (item.id !== undefined) names.push(english[item.id]?.name);
  return names.filter((name): name is string => Boolean(name));
}

/**
 * Gets high-resolution CDN image for a CS2 item with safe fallback
 */
export function getItemImage(item: CS2EconomyItem | null | undefined, wear?: number): string | null {
  if (!item) return null;
  ensureEconomyLoaded();
  try {
    if (typeof item.getImageUrl === "function") {
      const url = item.getImageUrl(wear);
      if (url && url.length > 5) return url;
    }
    const image = (item as CS2EconomyItem & { image?: unknown }).image;
    if (typeof image === "string" && image.length > 5) {
      return image;
    }
  } catch {
    // fallback
  }
  return null;
}
