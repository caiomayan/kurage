import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CS2Economy,
  CS2Inventory,
  CS2Team,
  CS2_ITEMS,
} from "@ianlucas/cs2-lib";
import { brazilian } from "@ianlucas/cs2-lib/translations/brazilian";
import { generateInspectLink, parseInspectLink } from "@ianlucas/cs2-lib-inspect";
import { ECONOMY_CATEGORIES, getBaseItems, getPaidItems, getAllPaidItems } from "../lib/inventory/economy-filters.ts";
import { parseItemName, getItemImage } from "../lib/inventory/economy-naming.ts";

CS2Economy.load({ items: CS2_ITEMS, language: brazilian });

describe("CS2 Inventory Simulator & Engine", () => {
  test("1. Economy DB Initialization: items, weapons, and containers are loaded", () => {
    assert.ok(CS2Economy.itemsAsArray.length > 0, "Economy must have items loaded");
    const ak47 = CS2Economy.itemsAsArray.find((it) => it.name.includes("AK-47") && !it.isDefault);
    assert.ok(ak47, "AK-47 skin must exist in economy DB");
    assert.equal(ak47.isWeapon(), true);
  });

  test("2. Inventory Lifecycle: Add skin, edit wear/seed/nametag, and verify properties", () => {
    const inv = new CS2Inventory({ maxItems: 1000 });
    const ak47Skin = CS2Economy.itemsAsArray.find((it) => it.name.includes("AK-47") && !it.isDefault && it.hasWear());
    assert.ok(ak47Skin);

    const minWear = ak47Skin.wearMin ?? 0.0;
    const maxWear = ak47Skin.wearMax ?? 1.0;
    const testWear = Number(((minWear + maxWear) / 2).toFixed(4));

    // Add AK-47 Skin
    inv.add({
      id: ak47Skin.id,
      wear: testWear,
      seed: 420,
      nameTag: "Kurage Jelly",
    });

    assert.equal(inv.size(), 1);
    const item = inv.getAll()[0];
    assert.equal(item.id, ak47Skin.id);
    assert.equal(item.wear, testWear);
    assert.equal(item.seed, 420);
    assert.equal(item.nameTag, "Kurage Jelly");

    // Edit item
    inv.edit(item.uid, {
      nameTag: "Ocean Abyss",
    });

    const updated = inv.get(item.uid);
    assert.equal(updated.nameTag, "Ocean Abyss");
  });

  test("3. Equipment Management: Equip to CT and TR teams", () => {
    const inv = new CS2Inventory({ maxItems: 1000 });
    const m4a4 = CS2Economy.itemsAsArray.find((it) => it.name.includes("M4A4") && !it.isDefault);
    assert.ok(m4a4);

    inv.add({ id: m4a4.id });
    const item = inv.getAll()[0];

    inv.equip(item.uid, CS2Team.CT);
    assert.equal(Boolean(inv.get(item.uid).equippedCT), true);
    assert.equal(Boolean(inv.get(item.uid).equippedT), false);

    inv.unequip(item.uid, CS2Team.CT);
    assert.equal(Boolean(inv.get(item.uid).equippedCT), false);
  });

  test("4. Stickers and Keychains Customization", () => {
    const inv = new CS2Inventory({ maxItems: 1000 });
    const awp = CS2Economy.itemsAsArray.find((it) => it.name.includes("AWP") && !it.isDefault);
    const sticker = CS2Economy.itemsAsArray.find((it) => it.isSticker());
    const charm = CS2Economy.itemsAsArray.find((it) => it.isKeychain());

    assert.ok(awp && sticker);

    inv.add({
      id: awp.id,
      stickers: {
        0: { id: sticker.id, wear: 0.1 },
      },
      keychains: charm ? { 0: { id: charm.id, seed: 777 } } : undefined,
    });

    const item = inv.getAll()[0];
    assert.ok(item.stickers && item.stickers.size > 0);
    assert.equal(item.stickers.get(0)?.id, sticker.id);
  });

  test("5. Serialization & Persistence Roundtrip", () => {
    const inv = new CS2Inventory({ maxItems: 1000 });
    const ak47Skin = CS2Economy.itemsAsArray.find((it) => it.name.includes("AK-47") && !it.isDefault && it.hasWear());
    assert.ok(ak47Skin);
    inv.add({ id: ak47Skin.id });

    const raw = inv.getData();
    assert.ok(raw);

    const reloaded = new CS2Inventory({ data: raw });
    assert.equal(reloaded.size(), 1);
    assert.equal(reloaded.getAll()[0].id, ak47Skin.id);
  });

  test("6. Inspect Link Generation & Roundtrip Parsing", () => {
    const inv = new CS2Inventory({ maxItems: 1000 });
    const ak47Skin = CS2Economy.itemsAsArray.find((it) => it.name.includes("AK-47") && !it.isDefault && it.hasWear());
    assert.ok(ak47Skin);

    const validWear = Number(((ak47Skin.wearMin || 0) + 0.02).toFixed(4));
    inv.add({ id: ak47Skin.id, wear: validWear, seed: 420 });
    const item = inv.getAll()[0];

    const command = generateInspectLink(item);
    assert.ok(command && command.length > 0, "Inspect command must be generated");
    assert.ok(command.startsWith("!i ") || command.startsWith("steam://"));

    const parsed = parseInspectLink(CS2Economy, command);
    assert.equal(parsed.id, ak47Skin.id);
    assert.equal(parsed.seed, 420);
  });

  test("7. Hierarchical Economy Taxonomy & Filter Helpers", () => {
    const rifleCat = ECONOMY_CATEGORIES.find((c) => c.id === "rifle");
    assert.ok(rifleCat);

    const baseRifles = getBaseItems(rifleCat);
    assert.ok(baseRifles.length > 0, "Base rifles list must not be empty");
    const ak47Base = baseRifles.find((r) => r.name.includes("AK-47"));
    assert.ok(ak47Base, "Base AK-47 must exist in base rifles");

    const akSkins = getPaidItems(rifleCat, "ak47");
    assert.ok(akSkins.length > 5, "AK-47 must have multiple paint finishes");

    const allItems = getAllPaidItems();
    assert.ok(allItems.length > 100, "All items search space must be comprehensive");
  });

  test("8. Weapon and Skin Name Parsing & Image Resolution", () => {
    const akSkin = CS2Economy.itemsAsArray.find((it) => it.name.includes("AK-47 |") && !it.isDefault);
    assert.ok(akSkin);

    const parsedSkin = parseItemName(akSkin);
    assert.equal(parsedSkin.weaponName, "AK-47");
    assert.ok(parsedSkin.skinName.length > 0);
    assert.notEqual(parsedSkin.skinName, "AK-47");

    const baseAk = CS2Economy.itemsAsArray.find((it) => it.modelKey === "ak47" && it.isDefault);
    assert.ok(baseAk);
    const parsedBase = parseItemName(baseAk);
    assert.equal(parsedBase.weaponName, "AK-47");

    const skinImg = getItemImage(akSkin);
    assert.ok(skinImg && skinImg.startsWith("http"), "Skin must have high-res image URL");

    const baseImg = getItemImage(baseAk);
    assert.ok(baseImg && baseImg.startsWith("http"), "Base weapon must have high-res image URL");
  });

  test("9. Safe Item Payload Sanitization for Base Weapons and Finished Skins", () => {
    const inv = new CS2Inventory({ maxItems: 1000 });

    // Test Base Stock Weapon (doesn't support wear/seed/stattrak)
    const baseGlock = CS2Economy.getById(3); // Glock-18 default
    assert.ok(baseGlock);
    assert.equal(baseGlock.hasWear(), false);

    // Sanitized payload should only pass id
    const basePayload = { id: baseGlock.id };
    inv.add(basePayload);
    assert.equal(inv.size(), 1);

    // Test Painted Finish Skin (supports wear, seed, stattrak, nametag)
    const asiimov = CS2Economy.itemsAsArray.find((it) => it.name.includes("Asiimov"));
    assert.ok(asiimov);
    assert.equal(asiimov.hasWear(), true);

    const skinPayload = {
      id: asiimov.id,
      wear: asiimov.wearMin ?? 0.18,
      seed: 555,
      statTrak: 0,
      nameTag: "Kurage King",
    };
    inv.add(skinPayload);
    assert.equal(inv.size(), 2);
  });
});
