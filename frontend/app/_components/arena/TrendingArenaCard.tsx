import { TrendingArenaCardProps } from "@/app/types";
import { PLACEHOLDER_AVATAR_URL } from "@/app/_utils/constants";
import { Newsreader } from "next/font/google";
import Link from "next/link";

const newsreader = Newsreader({
  subsets: ["latin"],
});

const TrendingArenaCard = ({
  username,
  domain,
  title,
  affirmativescore,
  negativescore,
  argumentid,
  active_minds,
}: TrendingArenaCardProps) => {
  return (
    <div className="bg-surface-container-low cursor-pointer md:w-[49%] mt-5 p-6 border-l-2 border-outline-variant/30 hover:border-primary transition-all">
      <Link
        className="flex flex-col justify-between h-full"
        href={`/argument/CRX-${argumentid}-A`}
      >
        <div>
          <div className="flex items-center gap-2 mb-4">
            <img
              alt="Dr. Aris Thorne"
              className="w-6 h-6 border border-outline-variant/20 grayscale"
              src={PLACEHOLDER_AVATAR_URL}
            />
            <span className="font-body text-[10px] font-bold text-outline uppercase tracking-wider">
              {username}
            </span>
          </div>
          <span className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-3 block">
            {domain}
          </span>
          <h3 className={`${newsreader.className} text-xl mb-4`}>"{title}"</h3>
        </div>

        <div>
          <div className="h-2 w-full bg-surface-container-highest flex mb-4">
            <div
              className={`h-full bg-primary-container`}
              style={{ width: `${affirmativescore}%` }}
            ></div>
            <div
              className={`h-full bg-secondary-container`}
              style={{ width: `${negativescore}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center font-label text-[10px] text-outline uppercase tracking-widest">
            <span>
              {active_minds} Active {active_minds === 1 ? "Mind" : "Minds"}
            </span>
            {affirmativescore > negativescore ? (
              <span className="text-primary-container">
                {affirmativescore}% Favor
              </span>
            ) : (
              <span className="text-secondary-container">
                {negativescore}% Against
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default TrendingArenaCard;
