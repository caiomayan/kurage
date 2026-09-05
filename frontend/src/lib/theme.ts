/**
 * Theme scope controller.
 *
 * Two independent sources want to paint the page: the signed-in viewer, and the
 * profile currently open. docs/pt/19 §2.2 settles the conflict — a profile page
 * takes the identity of *its owner*, and leaving it restores the viewer's own
 * theme. That has to hold for an anonymous visitor and for a direct URL hit too,
 * which is why the override is a stack rather than a second writer racing the
 * first: previously both `AuthProvider` and a page could clobber
 * `data-kurage-theme`, and whichever effect ran last won.
 *
 * The controller is pure apart from the injected `apply`, so the precedence and
 * restore rules are testable without a DOM.
 */

import { type KurageIdentity, themeAttributeFor } from "./identity.ts";

export type ApplyTheme = (attribute: string | null) => void;

export interface ThemeController {
  /** The signed-in viewer's identity; `default` when signed out. */
  setViewer(identity: KurageIdentity): void;
  /** Opens a profile scope. Call the returned function to leave it. */
  pushOverride(identity: KurageIdentity): () => void;
  /** The identity currently painting the page. */
  current(): KurageIdentity;
}

export function createThemeController(apply: ApplyTheme): ThemeController {
  let viewer: KurageIdentity = "default";
  // A stack, not a single slot: navigating profile → profile mounts the next
  // scope before the previous one unmounts, and a plain slot would let the
  // stale release wipe the incoming theme.
  const overrides: { identity: KurageIdentity }[] = [];
  let applied: string | null | undefined;

  const effective = (): KurageIdentity =>
    overrides.length > 0 ? overrides[overrides.length - 1].identity : viewer;

  const sync = () => {
    const attribute = themeAttributeFor(effective());
    if (attribute === applied) return;
    applied = attribute;
    apply(attribute);
  };

  return {
    setViewer(identity) {
      viewer = identity;
      sync();
    },
    pushOverride(identity) {
      const entry = { identity };
      overrides.push(entry);
      sync();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const index = overrides.indexOf(entry);
        if (index !== -1) overrides.splice(index, 1);
        sync();
      };
    },
    current: effective,
  };
}

/** Writes the resolved identity onto the document root. */
export const applyThemeToDocument: ApplyTheme = (attribute) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (attribute === null) {
    delete root.dataset.kurageTheme;
  } else {
    root.dataset.kurageTheme = attribute;
  }
};

/**
 * The single controller the app shares. One instance keeps the viewer theme and
 * every profile scope in the same precedence chain.
 */
export const themeController: ThemeController = createThemeController(applyThemeToDocument);
