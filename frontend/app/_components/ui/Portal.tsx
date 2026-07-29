"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders children at <body>, out of the caller's DOM position.
//
// This exists because of one CSS rule that is easy to lose an afternoon to:
// **an element with `backdrop-filter` becomes the containing block for its
// `position: fixed` descendants.** The debate composer is a sticky bar with
// `backdrop-blur-xl`, so a `fixed inset-0` modal nested inside it did not fill
// the viewport — it filled the composer, a ~128px strip at the bottom of the
// screen, and a dialog centred in that strip hung half of itself below the
// fold. `transform`, `filter`, `perspective` and `will-change` do the same
// thing; anything the app blurs or transforms will trap a fixed child.
//
// Overlays therefore leave the tree entirely rather than each one hunting for a
// blur-free ancestor to live under.
/** `false` while rendering on the server or hydrating, `true` afterwards. The
 *  store never changes, so `subscribe` has nothing to listen to — this is the
 *  standard way to ask "am I past hydration?" without a setState in an effect. */
const NEVER_CHANGES = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );

const Portal = ({ children }: { children: ReactNode }) => {
  // `document` does not exist on the server, and the first client render has to
  // match what the server sent — so the portal only opens once hydrated.
  const hydrated = useHydrated();

  if (!hydrated) return null;
  return createPortal(children, document.body);
};

export default Portal;
