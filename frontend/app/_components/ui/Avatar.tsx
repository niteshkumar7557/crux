// Brand default avatar: initials on a surface chip, sharp corners.
// Accent is derived from the username so the feed varies without images;
// comment cards override it to match their stance side.
const SIZES = {
  sm: "w-6 h-6 text-[9px]",
  md: "w-8 h-8 text-[10px]",
  lg: "w-10 h-10 text-xs",
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
  size = "md",
  accent,
  className = "",
}: {
  username: string;
  size?: keyof typeof SIZES;
  accent?: keyof typeof ACCENTS;
  className?: string;
}) => {
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
