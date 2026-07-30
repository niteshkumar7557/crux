// Image, or ink initials on a raised chip. Two src shapes arrive: presets are
// relative and go through the /api rewrite; uploads are absolute object-storage URLs
// and must be used as-is, or prefixing one points at the API's host and 404s.

import Image from "next/image";

const avatarSrc = (src: string) =>
  /^https?:\/\//.test(src) ? src : `/api${src}`;

const SIZES = {
  sm: "w-6 h-6 text-[9px]",
  md: "w-8 h-8 text-[10px]",
  lg: "w-10 h-10 text-xs",
  xl: "w-20 h-20 text-xl",
  "2xl": "w-32 h-32 text-3xl",
};

const ACCENTS = {
  primary: "text-side-for",
  secondary: "text-side-against",
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
        className={`relative shrink-0 block overflow-hidden bg-raised border border-ink-faint select-none ${SIZES[size]} ${className}`}
      >
        <Image
          src={avatarSrc(src)}
          alt=""
          fill
          sizes="128px"
          unoptimized
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`shrink-0 flex items-center justify-center bg-raised border border-ink-faint font-label font-bold tracking-wider select-none ${SIZES[size]} ${accent ? ACCENTS[accent] : "text-ink-soft"} ${className}`}
    >
      {initialsOf(username)}
    </span>
  );
};

export default Avatar;
