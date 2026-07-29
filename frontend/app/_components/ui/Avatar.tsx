import Image from "next/image";

// Brand avatar. With a `src` it shows the image; without one it falls back to
// initials on a raised paper chip. Argument cards pass `accent` to tint the
// initials with their stance side.
//
// The fallback used to hash the username into one of two accent colors so an
// imageless feed still varied. That was a dark-palette device: on paper it just
// reads as two arbitrary inks, and one of the two would have to be laurel —
// which is reserved for earned things (design-system.md §2). Initials are ink
// now, and the feed varies by type and rule instead.
//
// Two shapes arrive in `src`. Presets are static files the backend serves, so
// they are relative and go through the /api rewrite. Uploads live in object
// storage and arrive as absolute URLs, which must be used as-is — prefixing one
// with /api would point at the API's own host and 404.
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
