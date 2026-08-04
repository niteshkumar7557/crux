"use client";

// False while rendering on the server and during the hydration pass, true after.
//
// The one honest way to say "this differs between server and browser": React
// renders the server snapshot during hydration, so the markup matches, and only
// then swaps. A setState in an effect does the same job with an extra render and
// trips react-hooks/set-state-in-effect; reading window during render is a
// mismatch waiting for the first user in a different timezone or with a query
// string the server never saw.
//
// Both snapshots are constants, so React can cache them. Anything that varies —
// a formatted date, a search param — is derived from the flag by the caller,
// never returned from here.

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const hydrated = () => true;
const rendering = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, hydrated, rendering);
}
