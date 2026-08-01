"use client";

// The two navbar dropdowns' shell, in one place because their geometry is the same
// problem twice.
//
// Anchored under its trigger on desktop. On mobile the trigger moves into the menu
// drawer, so the panel goes through Portal as a scrimmed sheet: an absolutely
// positioned panel there is anchored to a row inside a drawer that is itself only
// as wide as the screen, and the desktop panel hung off a 22px icon ran straight
// off the left edge. The drawer stays open behind the scrim — dismissing the sheet
// returns to the menu it was opened from, and unmounting the drawer would take the
// panel's own state with it.

import Portal from "./Portal";
import type { ReactNode, RefObject } from "react";

const NavPanel = ({
  variant,
  panelRef,
  width,
  className,
  children,
}: {
  variant: "icon" | "row";
  panelRef: RefObject<HTMLDivElement | null>;
  width: string;
  className: string;
  children: ReactNode;
}) => {
  if (variant === "row") {
    return (
      <Portal>
        {/* No dismiss handler on the scrim: it sits outside both the trigger and
            the panel, so the owner's existing outside-click listener closes it. */}
        <div data-nav-panel className="fixed inset-0 z-60">
          <div className="absolute inset-0 bg-scrim backdrop-blur-sm" />
          <div
            ref={panelRef}
            className={`absolute inset-x-3 top-20 max-h-[calc(100dvh-6.5rem)] ${className}`}
          >
            {children}
          </div>
        </div>
      </Portal>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`absolute right-0 mt-4 z-50 ${width} ${className}`}
    >
      {children}
    </div>
  );
};

export default NavPanel;
