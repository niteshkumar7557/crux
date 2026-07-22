"use client";

// §5: replies target a specific opposing comment. A Reply button lives deep in
// a case column while the composer sits at the bottom of the page, so the two
// talk through this small context instead of prop-drilling a setter through
// CaseColumn. The provider wraps both the arena and the composer (in DebateView).
import { createContext, useContext, useState, type ReactNode } from "react";

export interface ReplyTarget {
  commentId: number;
  username: string;
  content: string;
  /** The target comment's own side; the reply commits to the opposite (§5). */
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
