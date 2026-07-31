"use client";

// Upload an avatar or pick a preset.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { isAxiosError } from "axios";
import { LuImagePlus, LuPencil, LuTrash2, LuX } from "react-icons/lu";
import api from "@/app/axios";
import { useUser } from "@/app/_hooks/useUser";
import Avatar from "@/app/_components/ui/Avatar";
import Button from "@/app/_components/ui/Button";

interface Preset {
  id: string;
  url: string;
}

const AvatarEditor = ({
  profileId,
  username,
  avatar,
}: {
  profileId: number;
  username: string;
  avatar: string | null;
}) => {
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isOwner = user?.id === profileId;

  // Dismiss on any click that lands outside, and on Escape. The toggle is exempt
  // because it closes the panel itself — dismissing here first would let it reopen.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || presets.length > 0) return;
    api
      .get("/avatar/presets")
      .then(({ data }) => setPresets(data.presets ?? []))
      .catch(() => setError("Could not load preset avatars."));
  }, [open, presets.length]);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError("");
    try {
      const newAvatar = await action();
      window.dispatchEvent(
        new CustomEvent<string | null>("crux:avatar-updated", {
          detail: newAvatar,
        }),
      );
      router.refresh();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const choosePreset = (presetId: string) =>
    run(async () => {
      const { data } = await api.put("/avatar/preset", { presetId });
      return data.avatar ?? null;
    });

  const removeAvatar = () =>
    run(async () => {
      await api.delete("/avatar");
      return null;
    });

  const uploadFile = (file: File) =>
    run(async () => {
      const form = new FormData();
      form.append("avatar", file);
      const { data } = await api.post("/avatar/upload", form);
      return data.avatar ?? null;
    });

  return (
    <div className="relative shrink-0">
      <Avatar
        username={username}
        src={avatar}
        size="2xl"
        className="plate-arch"
      />
      {isOwner && (
        <button
          ref={toggleRef}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close avatar editor" : "Edit avatar"}
          aria-expanded={open}
          title={open ? "Close" : "Edit avatar"}
          className="absolute -bottom-2 -right-2 bg-ink text-paper p-1.5 cursor-pointer transition-opacity hover:opacity-85"
        >
          {open ? <LuX className="text-sm" /> : <LuPencil className="text-sm" />}
        </button>
      )}

      {isOwner && open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-4 z-20 w-[21rem] bg-paper border border-ink-faint p-5"
        >
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft block mb-4">
            Pick a Preset
          </span>
          <div className="grid grid-cols-6 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => choosePreset(preset.id)}
                disabled={busy}
                aria-label={`Use avatar ${preset.id}`}
                aria-pressed={avatar === preset.url}
                className={`relative aspect-square overflow-hidden border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  avatar === preset.url
                    ? "border-ink"
                    : "border-ink-faint hover:border-ink/60"
                }`}
              >
                <Image
                  src={`/api${preset.url}`}
                  alt=""
                  fill
                  sizes="80px"
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <LuImagePlus aria-hidden="true" /> Upload Photo
            </Button>
            {avatar && (
              <Button
                variant="outline-neutral"
                size="sm"
                disabled={busy}
                onClick={removeAvatar}
              >
                <LuTrash2 aria-hidden="true" /> Remove
              </Button>
            )}
          </div>
          <p className="font-label text-[10px] uppercase tracking-widest text-ink-soft mt-3">
            JPEG, PNG or WebP · 5MB max
          </p>
          {error && (
            <p className="font-label text-[10px] uppercase tracking-widest text-side-against mt-3">
              {error}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AvatarEditor;
