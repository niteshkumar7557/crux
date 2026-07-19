"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { LuArrowBigUp } from "react-icons/lu";
import api from "@/app/axios";

const VoteButton = ({
  argumentId,
  initialVotes,
  fetchState = false,
  compact = false,
}: {
  argumentId: number;
  initialVotes: number;
  fetchState?: boolean;
  compact?: boolean;
}) => {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!fetchState) return;
    api
      .get(`/arena/vote/${argumentId}`)
      .then(({ data }) => {
        setVotes(data.votes);
        setVoted(data.voted);
      })
      .catch(() => {}); // unauthenticated → leave count, voted=false
  }, [argumentId, fetchState]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // never trigger a card's Link
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/arena/vote/${argumentId}`);
      setVotes(data.votes);
      setVoted(data.voted);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) router.push("/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={voted}
      title="Vote to feature this debate"
      className={`inline-flex items-center gap-1 font-label uppercase tracking-[0.15em] transition-colors disabled:opacity-60 ${
        voted ? "text-primary" : "text-outline hover:text-primary"
      } ${compact ? "text-[10px]" : "text-xs border border-outline/30 px-3 py-1.5"}`}
    >
      <LuArrowBigUp className={voted ? "fill-current" : ""} />
      {compact ? votes : `Vote · ${votes}`}
    </button>
  );
};

export default VoteButton;
