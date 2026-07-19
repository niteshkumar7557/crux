"use client";

import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import { CommentSide } from "@/app/argument/types";
import api from "@/app/axios";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LuTriangleAlert, LuX } from "react-icons/lu";
import Button from "@/app/_components/ui/Button";

type Notice = { title: string; body: ReactNode };

const ArgumentInput = ({
  argumentId,
  status,
  commentSides,
}: {
  argumentId: number;
  status: "live" | "concluded";
  commentSides: CommentSide[];
}) => {
  const [user, setUser] = useState<jwtPayload | null>(null);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

  // Concluded arenas are read-only — shown to everyone, logged in or not.
  if (status === "concluded") {
    return (
      <div className="sticky bottom-0 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/20 py-4 px-4 md:py-5 md:px-6 z-40 text-center">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
          This debate has concluded — the verdict is in.
        </span>
      </div>
    );
  }

  if (!user) return null;

  // The viewer's first comment locks their side for this debate; the opposite
  // side's button is pre-disabled so the lock is visible before they hit it.
  const lockedSide =
    commentSides.find((c) => c.post_user_id === user.id)?.side ?? null;

  // §9.3 discovery: flag the trailing (scarce) side, where comments earn 1.5×.
  const forCount = commentSides.filter((c) => c.side === "for").length;
  const againstCount = commentSides.filter((c) => c.side === "against").length;
  const underdog =
    forCount === againstCount ? null : forCount < againstCount ? "for" : "against";

  async function handleBtn(side: string) {
    if (input.length === 0) return;
    try {
      const { data } = await api.post(`/comment/${side}/${argumentId}`, {
        userId: user?.id,
        input,
      });
      setInput("");
      if (data.abused) {
        setNotice({
          title: "Flagged for Abuse",
          body: (
            <>
              Your comment crossed the line of civil debate. Review the{" "}
              <Link
                className="text-secondary underline underline-offset-2 hover:text-white"
                href={"/rules"}
              >
                Arena Rules
              </Link>{" "}
              before posting again.
            </>
          ),
        });
      } else {
        router.refresh();
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        const reason = err.response.data?.reason;
        if (reason === "side_locked") {
          setNotice({
            title: "Side Locked",
            body: "You've committed to the other side of this debate.",
          });
        } else {
          setNotice({
            title: "Debate Concluded",
            body: "This debate has just concluded.",
          });
          router.refresh();
        }
      } else {
        setNotice({
          title: "Post Failed",
          body: "Something went wrong. Try again.",
        });
      }
    }
  }

  return (
    <div className="sticky bottom-0 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/20 py-4 px-4 md:py-6 md:px-6 z-40">
      {underdog && (
        <div className="max-w-screen-2xl mx-auto mb-2 text-center md:text-left">
          <span
            className={`font-label text-[10px] uppercase tracking-[0.2em] ${
              underdog === "for" ? "text-primary" : "text-secondary"
            }`}
          >
            Underdog side · {underdog === "for" ? "Affirmative" : "Negative"} · 1.5× logic
          </span>
        </div>
      )}
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6">
        <div className="flex-1 w-full relative">
          <input
            className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary px-4 py-3 md:px-6 md:py-4 font-body text-on-surface placeholder:text-outline transition-all"
            placeholder="Join the Argument..."
            aria-label="Join the argument"
            type="text"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="bare"
            className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
            disabled={lockedSide === "against"}
            title={
              lockedSide === "against"
                ? "You've committed to the Negative side of this debate."
                : undefined
            }
            onClick={() => handleBtn("affirmative")}
          >
            Support Affirmative
          </Button>
          <Button
            variant="outline-secondary"
            size="bare"
            className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
            disabled={lockedSide === "for"}
            title={
              lockedSide === "for"
                ? "You've committed to the Affirmative side of this debate."
                : undefined
            }
            onClick={() => handleBtn("negative")}
          >
            Support Negative
          </Button>
        </div>
      </div>
      {notice && (
        <div className="fixed bottom-32 right-6 z-60 max-w-sm bg-surface-container-lowest border-l-4 border-secondary p-4 shadow-glow-secondary flex items-start gap-4">
          <div className="shrink-0 mt-1">
            <LuTriangleAlert className="text-secondary font-bold text-xl" />
          </div>
          <div className="grow">
            <h4 className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary mb-1 font-bold">
              {notice.title}
            </h4>
            <p className="font-body text-xs leading-relaxed text-on-surface-variant">
              {notice.body}
            </p>
          </div>
          <button
            className="shrink-0 text-outline hover:text-white cursor-pointer"
            onClick={() => setNotice(null)}
          >
            <LuX className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ArgumentInput;
