"use client";

// The quote stub that carries what a reply answers. Spec: game-theory.md §6

import { createContext, useContext, useState, type ReactNode } from "react";

export interface ReplyTarget {
  argumentId: number;
  username: string;
  content: string;
  side: "for" | "against";
}

interface ReplyContextValue {
  target: ReplyTarget | null;
  setTarget: (target: ReplyTarget | null) => void;
}

const ReplyContext = createContext<ReplyContextValue | null>(null);

export function ReplyProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  return (
    <ReplyContext.Provider value={{ target, setTarget }}>
      {children}
    </ReplyContext.Provider>
  );
}

export function useReplyTarget(): ReplyContextValue {
  const ctx = useContext(ReplyContext);
  if (!ctx) {
    throw new Error("useReplyTarget must be used within a ReplyProvider");
  }
  return ctx;
}
