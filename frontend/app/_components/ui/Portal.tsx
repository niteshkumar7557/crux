"use client";

// Renders overlays at <body>. Required, not stylistic: a blurred or transformed
// ancestor becomes the containing block for position: fixed, so a modal inside the
// backdrop-blurred composer would fill the composer rather than the viewport.

import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/app/_hooks/useHydrated";

const Portal = ({ children }: { children: ReactNode }) => {
  const hydrated = useHydrated();

  if (!hydrated) return null;
  return createPortal(children, document.body);
};

export default Portal;
