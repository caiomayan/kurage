"use client";

import { useSyncExternalStore } from "react";

let hideFooter = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export const footerStore = {
  get: () => hideFooter,
  set: (val: boolean) => {
    if (hideFooter !== val) {
      hideFooter = val;
      emitChange();
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useFooterHidden() {
  return useSyncExternalStore(
    footerStore.subscribe,
    footerStore.get,
    () => false
  );
}
