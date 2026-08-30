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
import { ECONOMY_CATEGORIES, getCraftableItems, getAllCraftableItems, getMusicKits } from "../lib/inventory/economy-filters.ts";
import { removeMusicKitSlot, replaceMusicKitSlot } from "../lib/inventory/inventory-music-kit.ts";
import { parseItemName, getItemImage } from "../lib/inventory/economy-naming.ts";
import { searchEconomyItems } from "../lib/inventory/economy-search.ts";
import { buildViewerSource, toViewerItem } from "../lib/inventory/viewer-api.ts";

CS2Economy.load({ items: CS2_ITEMS, language: brazilian });

describe("Kurage Inventory Engine", () => {
  test("1. Economy DB Initialization: items and weapons are loaded", () => {
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

  test("7. Product Taxonomy exposes only user-creatable inventory categories", () => {
    assert.deepEqual(
      ECONOMY_CATEGORIES.map((category) => category.id),
      ["skins", "knives", "gloves", "agents"],
    );

    const skinsCategory = ECONOMY_CATEGORIES.find((category) => category.id === "skins");
    assert.ok(skinsCategory);
    const skins = getCraftableItems(skinsCategory);
    assert.ok(skins.length > 100, "Unified skins catalog must be comprehensive");
    assert.ok(skins.every((item) => item.isWeapon() && !item.isDefault && !item.isBase));

    const allItems = getAllCraftableItems();
    assert.ok(allItems.length > 100, "Complete creation catalog must be comprehensive");
    assert.ok(allItems.every((item) => !item.isDefault && !item.isBase));
    assert.ok(allItems.every((item) => !item.isSticker() && !item.isKeychain()));
    assert.ok(allItems.every((item) => !item.isMusicKit()));
    assert.ok(getMusicKits().every((item) => item.isMusicKit()));
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

  test("10. Catalog search finds weapons, finishes, punctuation variants, and close spelling", () => {
    const skins = getCraftableItems(ECONOMY_CATEGORIES[0]);
    const ak47 = searchEconomyItems(skins, "ak47");
    assert.ok(ak47.some((item) => parseItemName(item).weaponName === "AK-47"));

    const asiimov = searchEconomyItems(skins, "asiimov");
    assert.ok(asiimov.some((item) => parseItemName(item).skinName.toLowerCase().includes("asiimov")));

    const typo = searchEconomyItems(skins, "asiimovv");
    assert.ok(typo.some((item) => parseItemName(item).skinName.toLowerCase().includes("asiimov")));

    const englishKnife = searchEconomyItems(getCraftableItems(ECONOMY_CATEGORIES[1]), "bayonet");
    assert.ok(englishKnife.some((item) => item.modelKey === "bayonet"));
  });

  test("11. Every craftable catalog item is accepted by the inventory engine", () => {
    for (const category of ECONOMY_CATEGORIES) {
      const categoryItems = getCraftableItems(category);
      assert.ok(categoryItems.length > 0, `${category.label} must expose craftable items`);

      for (const item of categoryItems) {
        const inventory = new CS2Inventory({ maxItems: 1000 });
        assert.doesNotThrow(() => inventory.add({
          id: item.id,
          wear: item.hasWear() ? item.wearMin : undefined,
          seed: item.hasSeed() ? 420 : undefined,
        }), `${category.label}: ${item.name} must be accepted by the CS2 inventory engine`);
        assert.equal(inventory.size(), 1);
      }
    }
  });

  test("12. 3D viewer payload preserves sticker and keychain placement", () => {
    const weapon = CS2Economy.itemsAsArray.find((item) => item.isWeapon() && item.hasStickers() && item.hasKeychains());
    assert.ok(weapon);
    const payload = {
      id: weapon.id,
      ...(weapon.hasWear() ? { wear: weapon.wearMin } : {}),
      stickers: { 0: { id: 1, schema: 2, x: 0.1, y: -0.2, rotation: 45, wear: 0.15 } },
      keychains: { 0: { id: 1, seed: 77, x: 0.01, y: 0.02, z: 0.03 } },
    };
    assert.deepEqual(toViewerItem(payload), payload);
    const source = new URL(buildViewerSource(payload));
    assert.equal(source.origin, "https://3d.cstrike.app");
    assert.equal(source.searchParams.get("bg"), "0");
    assert.equal(source.searchParams.get("halfRotation"), "1");
    assert.deepEqual(JSON.parse(source.searchParams.get("item")), payload);
  });

  test("13. Music kit behaves as one automatically equipped slot", () => {
    const kits = getMusicKits();
    assert.ok(kits.length > 1);
    const inventory = new CS2Inventory({ maxItems: 1000 });

    const firstUid = replaceMusicKitSlot(inventory, kits[0]);
    assert.equal(inventory.getAll().filter((item) => item.isMusicKit()).length, 1);
    assert.equal(Boolean(inventory.get(firstUid).equipped), true);

    const replacementUid = replaceMusicKitSlot(inventory, kits[1]);
    const installedKits = inventory.getAll().filter((item) => item.isMusicKit());
    assert.equal(installedKits.length, 1);
    assert.equal(installedKits[0].id, kits[1].id);
    assert.equal(Boolean(inventory.get(replacementUid).equipped), true);

    assert.equal(removeMusicKitSlot(inventory), true);
    assert.equal(inventory.getAll().filter((item) => item.isMusicKit()).length, 0);
  });
});
