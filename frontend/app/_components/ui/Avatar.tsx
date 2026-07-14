import Image from "next/image";

// Brand avatar. With a `src` (preset or custom upload, served by the
// backend behind the /api rewrite) it shows the image; without one it
// falls back to initials on a surface chip, accent derived from the
// username so the feed varies without images. Comment cards override
// the accent to match their stance side.
const SIZES = {
  sm: "w-6 h-6 text-[9px]",
  md: "w-8 h-8 text-[10px]",
  lg: "w-10 h-10 text-xs",
  xl: "w-20 h-20 text-xl",
  "2xl": "w-32 h-32 text-3xl",
};

const HASH_ACCENTS = ["text-primary", "text-tertiary"];
const ACCENTS = {
  primary: "text-primary",
  secondary: "text-secondary",
};

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/[\s_.-]+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

const Avatar = ({
  username,
  src,
  size = "md",
  accent,
  className = "",
}: {
  username: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  accent?: keyof typeof ACCENTS;
  className?: string;
}) => {
  if (src) {
    return (
      <span
        aria-hidden="true"
        className={`relative shrink-0 block overflow-hidden bg-surface-container-high border border-outline-variant/30 select-none ${SIZES[size]} ${className}`}
      >
        <Image
          src={`/api${src}`}
          alt=""
          fill
          sizes="128px"
          unoptimized
          className="object-cover"
        />
      </span>
    );
  }

  const color = accent
    ? ACCENTS[accent]
    : HASH_ACCENTS[
        [...username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
          HASH_ACCENTS.length
      ];
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 flex items-center justify-center bg-surface-container-high border border-outline-variant/30 font-label font-bold tracking-wider select-none ${SIZES[size]} ${color} ${className}`}
    >
      {initialsOf(username)}
    </span>
  );
};

export default Avatar;
