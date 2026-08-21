import { NextResponse } from "next/server";
import { CS2Economy, CS2_ITEMS, CS2Inventory } from "@ianlucas/cs2-lib";

// Initialize CS2Economy once
try {
  CS2Economy.load({ items: CS2_ITEMS });
} catch {
  // Already loaded or safe fallback
}

interface StickerItemDTO {
  slot: number;
  def: number;
  wear?: number;
  rotation?: number;
  x?: number;
  y?: number;
}

interface KeychainItemDTO {
  slot: number;
  def: number;
  seed: number;
  x?: number;
  y?: number;
  z?: number;
}

interface InventoryItemDTO {
  uid: number;
  def?: number;
  paint?: number;
  seed?: number;
  wear?: number;
  nametag?: string;
  stattrak?: number;
  stickers?: StickerItemDTO[] | null;
  keychains?: KeychainItemDTO[] | null;
}

function formatStickers(stickers: any): StickerItemDTO[] | null {
  if (!stickers) return null;
  const list: StickerItemDTO[] = [];
  if (stickers instanceof Map) {
    for (const [slot, s] of stickers.entries()) {
      const econItem = CS2Economy.get(s.id);
      const def = (econItem as any)?.def ?? econItem?.definitionIndex ?? s.id;
      list.push({
        slot: Number(slot),
        def: Number(def),
        wear: s.wear,
        rotation: s.rotation,
        x: s.x,
        y: s.y,
      });
    }
  } else if (typeof stickers === "object") {
    for (const [slot, s] of Object.entries(stickers as Record<string, any>)) {
      const econItem = CS2Economy.get(s.id);
      const def = (econItem as any)?.def ?? econItem?.definitionIndex ?? s.id;
      list.push({
        slot: Number(slot),
        def: Number(def),
        wear: s.wear,
        rotation: s.rotation,
        x: s.x,
        y: s.y,
      });
    }
  }
  return list.length > 0 ? list : null;
}

function formatKeychains(keychains: any): KeychainItemDTO[] | null {
  if (!keychains) return null;
  const list: KeychainItemDTO[] = [];
  if (keychains instanceof Map) {
    for (const [slot, k] of keychains.entries()) {
      const econItem = CS2Economy.get(k.id);
      const def = (econItem as any)?.def ?? econItem?.definitionIndex ?? k.id;
      list.push({
        slot: Number(slot),
        def: Number(def),
        seed: k.seed ?? 0,
        x: k.x,
        y: k.y,
        z: k.z,
      });
    }
  } else if (typeof keychains === "object") {
    for (const [slot, k] of Object.entries(keychains as Record<string, any>)) {
      const econItem = CS2Economy.get(k.id);
      const def = (econItem as any)?.def ?? econItem?.definitionIndex ?? k.id;
      list.push({
        slot: Number(slot),
        def: Number(def),
        seed: k.seed ?? 0,
        x: k.x,
        y: k.y,
        z: k.z,
      });
    }
  }
  return list.length > 0 ? list : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ steamId64: string }> }
) {
  const resolvedParams = await params;
  const rawId = resolvedParams.steamId64 || "";
  const steamId64 = rawId.replace(/\.json$/i, "");

  if (!steamId64 || !/^\d{17}$/.test(steamId64)) {
    return NextResponse.json({ error: "Invalid SteamID64" }, { status: 400 });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const res = await fetch(`${backendUrl}/inventory/${steamId64}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        agents: {},
        collectible: null,
        ctWeapons: {},
        tWeapons: {},
        gloves: {},
        knives: {},
        graffiti: null,
        musicKit: null,
      });
    }

    const inventoryData = await res.json();
    const inv = CS2Inventory.load(JSON.stringify(inventoryData));

    const response: {
      agents: Record<string, InventoryItemDTO>;
      collectible: InventoryItemDTO | null;
      ctWeapons: Record<string, InventoryItemDTO>;
      tWeapons: Record<string, InventoryItemDTO>;
      gloves: Record<string, InventoryItemDTO>;
      knives: Record<string, InventoryItemDTO>;
      graffiti: InventoryItemDTO | null;
      musicKit: InventoryItemDTO | null;
    } = {
      agents: {},
      collectible: null,
      ctWeapons: {},
      tWeapons: {},
      gloves: {},
      knives: {},
      graffiti: null,
      musicKit: null,
    };

    for (const item of inv.getAll()) {
      const invItem: InventoryItemDTO = {
        uid: item.uid,
        def: item.definitionIndex,
        paint: item.variantIndex,
        seed: item.seed,
        wear: item.wear,
        nametag: item.nameTag,
        stattrak: item.statTrak ?? -1,
        stickers: formatStickers(item.stickers),
        keychains: formatKeychains(item.keychains),
      };

      if (item.type === "melee") {
        if (item.equippedCT) response.knives["3"] = invItem;
        if (item.equippedT) response.knives["2"] = invItem;
      } else if (item.type === "glove") {
        if (item.equippedCT) response.gloves["3"] = invItem;
        if (item.equippedT) response.gloves["2"] = invItem;
      } else if (item.type === "agent") {
        if (item.equippedCT) response.agents["3"] = invItem;
        if (item.equippedT) response.agents["2"] = invItem;
      } else if (item.type === "weapon" && item.definitionIndex !== undefined) {
        if (item.equippedCT) response.ctWeapons[item.definitionIndex.toString()] = invItem;
        if (item.equippedT) response.tWeapons[item.definitionIndex.toString()] = invItem;
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error generating equipped inventory for CS2 plugin:", error);
    return NextResponse.json(
      {
        agents: {},
        collectible: null,
        ctWeapons: {},
        tWeapons: {},
        gloves: {},
        knives: {},
        graffiti: null,
        musicKit: null,
      },
      { status: 200 }
    );
  }
}
