import { CS2EconomyItem, CS2Inventory } from "@ianlucas/cs2-lib";

export function replaceMusicKitSlot(inventory: CS2Inventory, musicKit: CS2EconomyItem): number {
  if (!musicKit.isMusicKit()) {
    throw new Error("Only music kits can occupy the music kit slot");
  }

  removeMusicKitSlot(inventory);
  inventory.add({ id: musicKit.id });

  const installedKit = inventory
    .getAll()
    .find((item) => !item.isDefault && item.id === musicKit.id && item.isMusicKit());
  if (!installedKit) {
    throw new Error("Music kit was not added to the inventory");
  }

  inventory.equip(installedKit.uid);
  return installedKit.uid;
}

export function removeMusicKitSlot(inventory: CS2Inventory): boolean {
  const installedKits = inventory
    .getAll()
    .filter((item) => !item.isDefault && item.isMusicKit());

  installedKits.forEach((item) => inventory.remove(item.uid));
  return installedKits.length > 0;
}
