import { MainTrendingArenaCardProps } from "@/app/types";
import { PLACEHOLDER_AVATAR_URL } from "@/app/_utils/constants";
import { Newsreader } from "next/font/google";
import Link from "next/link";
import { GoVerified } from "react-icons/go";
import { LuMessageSquare } from "react-icons/lu";

const newsreader = Newsreader({
  subsets: ["latin"],
});

const MainTrendingArenaCard = ({
  username,
  domain,
  title,
  argumentNum,
  argumentQuality,
  affirmativeScore,
  negativeScore,
  argumentId,
}: MainTrendingArenaCardProps) => {
  return (
    <div className="bg-surface-container-low mt-5 p-8 pb-4 border-l-2 border-primary group hover:bg-surface-container transition-colors relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <img
          alt="Aurelius_X"
          className="w-8 h-8 border border-outline-variant/30 grayscale hover:grayscale-0 transition-all"
          src={PLACEHOLDER_AVATAR_URL}
        />
        <div className="flex flex-col">
          <span className="font-label text-[10px] text-primary uppercase tracking-[0.2em]">
            Proposed By
          </span>
          <span className="font-body text-xs font-bold text-on-surface">
            {username}
          </span>
        </div>
      </div>
      <span className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-3 block">
        {domain}
      </span>
      <h2
        className={`${newsreader.className} text-4xl leading-tight mb-4 transition-colors`}
      >
        "{title}"
      </h2>
      <div className="flex gap-5 border-b border-gray-800 pb-5">
        <span className="font-label [word-spacing:-4px] text-xs text-outline uppercase tracking-widest">
          <LuMessageSquare className="inline text-primary" /> {argumentNum}{" "}
          {argumentNum === 1 ? "Argument" : "Arguments"}
        </span>
        <span className="font-label [word-spacing:-4px] text-xs text-outline uppercase tracking-widest">
          <GoVerified className="inline text-tertiary" /> Argument Quality:{" "}
          {argumentQuality}
        </span>
      </div>
      <div className="py-5">
        <div className="flex justify-between font-label text-[10px] uppercase tracking-[0.25em] mb-3">
          <span className="text-primary-container">
            Affirmative ({affirmativeScore}%)
          </span>
          <span className="text-secondary">Negative ({negativeScore}%)</span>
        </div>
        <div className="w-full h-5 flex gap-0.5">
          <span
            className={`bg-primary-container`}
            style={{ width: `${affirmativeScore}%` }}
          ></span>
          <span
            className={`bg-secondary-container`}
            style={{ width: `${negativeScore}%` }}
          ></span>
        </div>
        <div className="mt-7 flex justify-between items-center">
          <div></div>
          <Link
            href={`/argument/${argumentId}`}
            className="border border-primary/30 text-primary px-6 py-2 font-label uppercase tracking-widest text-[10px] hover:bg-primary/10 transition-colors"
          >
            Enter Argument
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MainTrendingArenaCard;
