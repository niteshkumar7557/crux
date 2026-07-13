"use client";

import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import api from "@/app/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { MdWarningAmber } from "react-icons/md";
import Button from "@/app/_components/ui/Button";

const ArgumentInput = ({ argumentId }: { argumentId: number }) => {
  const [user, setUser] = useState<any>(null);
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [warning, setWarning] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  async function handleBtn(side: string) {
    if (input.length === 0) return;
    const { data } = await api.post(`/comment/${side}/${argumentId}`, {
      userId: user?.id,
      input,
    });
    setInput("");
    if (data.abused) {
      setWarning(true);
    } else {
      router.refresh();
    }
  }
  return (
    <div className="sticky bottom-0 bg-neutral-950/80 backdrop-blur-xl border-t border-outline-variant/20 py-4 px-4 md:py-6 md:px-6 z-40">
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6">
        <div className="flex-1 w-full relative">
          <input
            className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary px-4 py-3 md:px-6 md:py-4 font-body text-on-surface placeholder:text-outline/50 transition-all"
            placeholder="Join the Argument..."
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
            onClick={() => handleBtn("affirmative")}
          >
            Support Affirmative
          </Button>
          <Button
            variant="outline-secondary"
            size="bare"
            className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-[10px] md:text-xs"
            onClick={() => handleBtn("negative")}
          >
            Support Negative
          </Button>
        </div>
      </div>
      {warning && (
        <div className="fixed bottom-32 right-6 z-60 max-w-sm bg-neutral-950 border-l-4 border-secondary p-4 shadow-[0_0_20px_rgba(255,82,93,0.1)] flex items-start gap-4">
          <div className="shrink-0 mt-1">
            <MdWarningAmber className="text-secondary font-bold text-xl" />
          </div>
          <div className="grow">
            <h4 className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary mb-1 font-bold">
              Flagged for Abuse
            </h4>
            <p className="font-body text-xs leading-relaxed text-on-surface-variant">
              Your latest contribution violates the Arena Constitution. Review
              the{" "}
              <Link
                className="text-secondary underline underline-offset-2 hover:text-white"
                href={"/rules"}
              >
                Rules of Engagement
              </Link>{" "}
              before posting again.
            </p>
          </div>
          <button
            className="shrink-0 text-outline hover:text-white cursor-pointer"
            onClick={() => setWarning(false)}
          >
            <IoMdClose className="text-sm" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ArgumentInput;
