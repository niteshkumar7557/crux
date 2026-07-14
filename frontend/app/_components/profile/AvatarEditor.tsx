"use client";
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

// Profile-head avatar. Everyone sees the avatar; the owner also gets the
// editor: pick one of the shared presets, upload a photo, or remove it.
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

  const isOwner = user?.id === profileId;

  useEffect(() => {
    if (!open || presets.length > 0) return;
    api
      .get("/avatar/presets")
      .then(({ data }) => setPresets(data.presets ?? []))
      .catch(() => setError("Could not load preset avatars."));
  }, [open, presets.length]);

  // each action resolves to the new avatar path (null = removed) so the
  // navbar can update live via the crux:avatar-updated event
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
      <Avatar username={username} src={avatar} size="2xl" />
      {isOwner && (
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close avatar editor" : "Edit avatar"}
          aria-expanded={open}
          title={open ? "Close" : "Edit avatar"}
          className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-1.5 cursor-pointer hover:bg-primary-container transition-colors"
        >
          {open ? <LuX className="text-sm" /> : <LuPencil className="text-sm" />}
        </button>
      )}

      {isOwner && open && (
        <div className="absolute left-0 top-full mt-4 z-20 w-[21rem] bg-surface-container-lowest border border-primary/30 shadow-glow-primary p-5">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline block mb-4">
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
                    ? "border-primary"
                    : "border-outline-variant/30 hover:border-primary/60"
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
          <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-3">
            JPEG, PNG or WebP · 5MB max
          </p>
          {error && (
            <p className="font-label text-[10px] uppercase tracking-widest text-secondary mt-3">
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
