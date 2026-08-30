/*---------------------------------------------------------------------------------------------
 *  Portions adapted from cs2-inventory-simulator.
 *  Copyright (c) 2023-present Ian Lucas.
 *  Licensed under the MIT License. See THIRD_PARTY_NOTICES.md.
 *--------------------------------------------------------------------------------------------*/

import { CS2Economy, CS2EconomyItem, CS2InventoryItem } from "@ianlucas/cs2-lib";
import type { CS2BaseInventoryItem } from "@ianlucas/cs2-lib";

const VIEWER_SOURCE = "3d.cstrike.app";
const VIEWER_PROTOCOL_VERSION = 1;
export const DEFAULT_VIEWER_EMBED_URL = "https://3d.cstrike.app/view";

export type ViewerItemInput = CS2EconomyItem | CS2InventoryItem | CS2BaseInventoryItem;
export type ViewerItem = Pick<CS2BaseInventoryItem, "id" | "seed" | "wear" | "stickers" | "keychains" | "statTrak" | "nameTag">;
export type ViewerSelection = { kind: "sticker"; index: number } | { kind: "keychain"; index: number } | null;

export interface ViewerState {
  item: ViewerItem;
  selection: ViewerSelection;
  activeSticker: number | null;
  schemaCount: number;
  keychainDefault?: { x: number; y: number; z: number } | null;
}

export interface ViewerEventMap {
  ready: { v: number };
  change: ViewerState;
  loading: { busy: boolean };
  rendered: { item: ViewerItem };
  rateLimited: { retryAfterMs: number; scope?: "ip" | "origin" | "partner" };
  unsupported: { reason: "weapon" | "sticker" | "keychain" | "network" | "webgl" | "asset" };
}

interface Envelope {
  source: typeof VIEWER_SOURCE;
  v: number;
  id?: string;
  type: string;
  data?: unknown;
}

interface PendingReply {
  resolve: (state: ViewerState) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export function toViewerItem(item: ViewerItemInput): ViewerItem {
  if (item instanceof CS2InventoryItem) return toViewerItem(item.asBase());
  if (item instanceof CS2EconomyItem) return { id: item.id };
  const viewerItem: ViewerItem = { id: item.id };
  if (item.seed !== undefined) viewerItem.seed = item.seed;
  if (item.wear !== undefined) viewerItem.wear = item.wear;
  if (item.stickers !== undefined) viewerItem.stickers = item.stickers;
  if (item.keychains !== undefined) viewerItem.keychains = item.keychains;
  if (item.statTrak !== undefined) viewerItem.statTrak = item.statTrak;
  if (item.nameTag !== undefined) viewerItem.nameTag = item.nameTag;
  return viewerItem;
}

export function isViewerRenderable(item: ViewerItemInput): boolean {
  const economy = item instanceof CS2EconomyItem ? item : CS2Economy.getById(item.id);
  return Boolean(economy && (economy.isWeapon() || economy.isMelee() || economy.isGloves() || economy.isSticker() || economy.isKeychain() || economy.isStickerSlab()));
}

export function buildViewerSource(item: ViewerItemInput): string {
  const url = new URL(DEFAULT_VIEWER_EMBED_URL);
  const partnerKey = process.env.NEXT_PUBLIC_CS2_VIEWER_KEY?.trim();

  // The official embed accepts bg=0 and renders its WebGL canvas with alpha,
  // allowing Kurage's oceanic studio background to remain visible.
  url.searchParams.set("bg", "0");
  url.searchParams.set("halfRotation", "1");
  if (partnerKey) url.searchParams.set("key", partnerKey);
  url.searchParams.set("item", JSON.stringify(toViewerItem(item)));
  return url.toString();
}

export class ViewerApi extends EventTarget {
  readonly origin: string;
  isReady = false;
  lastState: ViewerState | undefined;

  private readonly iframe: HTMLIFrameElement;
  private destroyed = false;
  private queue: Array<() => void> = [];
  private readyWaiters: Array<() => void> = [];
  private readonly pending = new Map<string, PendingReply>();

  constructor(iframe: HTMLIFrameElement) {
    super();
    this.iframe = iframe;
    this.origin = new URL(iframe.src, window.location.href).origin;
    window.addEventListener("message", this.onMessage);
    iframe.addEventListener("load", this.solicitReady);
    this.solicitReady();
  }

  on<K extends keyof ViewerEventMap>(type: K, listener: (data: ViewerEventMap[K]) => void): () => void {
    const handler = (event: Event) => listener((event as CustomEvent<ViewerEventMap[K]>).detail);
    this.addEventListener(type, handler);
    return () => this.removeEventListener(type, handler);
  }

  whenReady(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    return new Promise((resolve) => this.readyWaiters.push(resolve));
  }

  setItem(item: ViewerItemInput): void { this.send("setItem", { item: toViewerItem(item) }); }
  setActiveSticker(data: { index: number | null }): void { this.send("setActiveSticker", data); }
  setSelection(data: { selection: ViewerSelection }): void { this.send("setSelection", data); }
  highlightSticker(data: { index: number }): void { this.send("highlightSticker", data); }
  rerollKeychainPosition(data: { index: number }): void { this.send("rerollKeychainPosition", data); }

  getState(timeoutMs = 5000): Promise<ViewerState> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      if (this.destroyed) return reject(new Error("ViewerApi: destroyed."));
      const entry: PendingReply = { resolve, reject };
      this.pending.set(id, entry);
      this.enqueue(() => {
        entry.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error("ViewerApi: getState timed out."));
        }, timeoutMs);
        this.post(this.envelope("getState", undefined, id));
      });
    });
  }

  send(type: string, data?: unknown): void {
    const envelope = this.envelope(type, data);
    this.enqueue(() => this.post(envelope), type === "ping");
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener("message", this.onMessage);
    this.iframe.removeEventListener("load", this.solicitReady);
    this.queue = [];
    this.readyWaiters = [];
    for (const { reject, timer } of this.pending.values()) {
      if (timer !== undefined) clearTimeout(timer);
      reject(new Error("ViewerApi: destroyed."));
    }
    this.pending.clear();
  }

  private envelope(type: string, data?: unknown, id?: string): Envelope {
    return { source: VIEWER_SOURCE, v: VIEWER_PROTOCOL_VERSION, type, ...(id !== undefined ? { id } : {}), ...(data !== undefined ? { data } : {}) };
  }

  private enqueue(task: () => void, immediate = false): void {
    if (this.destroyed) return;
    if (this.isReady || immediate) task();
    else this.queue.push(task);
  }

  private post(envelope: Envelope): void {
    this.iframe.contentWindow?.postMessage(envelope, this.origin);
  }

  private flush(): void {
    if (this.isReady) return;
    this.isReady = true;
    const queue = this.queue.splice(0);
    queue.forEach((task) => task());
    const waiters = this.readyWaiters.splice(0);
    waiters.forEach((resolve) => resolve());
  }

  private readonly solicitReady = (): void => {
    if (!this.destroyed) this.post(this.envelope("ping"));
  };

  private readonly onMessage = (event: MessageEvent): void => {
    if (this.destroyed || event.origin !== this.origin || event.source !== this.iframe.contentWindow) return;
    const message = event.data as Partial<Envelope> | null;
    if (message?.source !== VIEWER_SOURCE || message.v !== VIEWER_PROTOCOL_VERSION || typeof message.type !== "string") return;
    const { id, type, data } = message;
    if (id !== undefined) {
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        if (pending.timer !== undefined) clearTimeout(pending.timer);
        const state = data as ViewerState;
        this.lastState = state;
        pending.resolve(state);
        return;
      }
    }
    if (type === "ready") this.flush();
    if (type === "change") this.lastState = data as ViewerState;
    if (["ready", "change", "loading", "rendered", "rateLimited", "unsupported"].includes(type)) {
      this.dispatchEvent(new CustomEvent(type, { detail: data }));
    }
  };
}
