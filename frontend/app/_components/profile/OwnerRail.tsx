"use client";

// Actions only the profile's owner sees.

import { useState } from "react";
import { LuPencil } from "react-icons/lu";
import { useUser } from "@/app/_hooks/useUser";
import BioEditor from "./BioEditor";
import LogoutButton from "./LogoutButton";

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
          className="flex items-center gap-2 border border-ink-faint px-3 py-1.5 font-label text-[10px] uppercase tracking-widest text-ink-soft hover:text-ink hover:border-ink/60 transition-colors cursor-pointer"
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
