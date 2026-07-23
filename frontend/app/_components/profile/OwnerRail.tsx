"use client";
import { useState } from "react";
import { LuPencil } from "react-icons/lu";
import { useUser } from "@/app/_hooks/useUser";
import BioEditor from "./BioEditor";
import LogoutButton from "./LogoutButton";

// Owner-only controls, grouped in one place instead of floating over the
// header. Renders nothing at all for a visitor.
const OwnerRail = ({ profileId, bio }: { profileId: number; bio: string }) => {
  const user = useUser();
  const [editing, setEditing] = useState(false);

  if (user?.id !== profileId) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="flex items-center gap-2 border border-outline-variant/40 px-3 py-1.5 font-label text-[10px] uppercase tracking-widest text-outline hover:text-primary hover:border-primary/60 transition-colors cursor-pointer"
        >
          <LuPencil aria-hidden="true" /> Edit Bio
        </button>
        <LogoutButton profileId={profileId} />
      </div>
      {editing && <BioEditor bio={bio} onDone={() => setEditing(false)} />}
    </>
  );
};

export default OwnerRail;
