"use client";
import { LuLogOut } from "react-icons/lu";
import api from "@/app/axios";
import { useUser } from "@/app/_hooks/useUser";

// Shown only on your own profile; ends the session server-side and locally.
const LogoutButton = ({ profileId }: { profileId: number }) => {
  const user = useUser();

  if (user?.id !== profileId) return null;

  async function handleLogout() {
    try {
      await api.post("/user/logout");
    } catch {
      // the server session may already be gone — still log out locally
    }
    localStorage.removeItem("access_token");
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 border border-ink-faint px-3 py-1.5 font-label text-[10px] uppercase tracking-widest text-ink-soft hover:text-side-against hover:border-side-against/60 transition-colors cursor-pointer"
    >
      <LuLogOut aria-hidden="true" /> Log Out
    </button>
  );
};

export default LogoutButton;
