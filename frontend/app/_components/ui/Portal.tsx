"use client";

// Renders overlays at <body>. Required, not stylistic: a blurred or transformed
// ancestor becomes the containing block for position: fixed, so a modal inside the
// backdrop-blurred composer would fill the composer rather than the viewport.

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const NEVER_CHANGES = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );

const Portal = ({ children }: { children: ReactNode }) => {
  const hydrated = useHydrated();

  if (!hydrated) return null;
  return createPortal(children, document.body);
};

export default Portal;
