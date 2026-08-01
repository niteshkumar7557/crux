// The mobile menu drawer's row treatment, shared by the links the drawer owns and
// by the two dropdown triggers that move into it below md. One builder, so a link
// and a button in the same list cannot sit at two different heights.
//
// The colour is inside the builder rather than appended by the caller: two text
// utilities in one class string are decided by their order in the generated sheet,
// not in the string, so `${DRAWER_ROW} text-ink` would win or lose by accident.

const BASE =
  "flex w-full items-center gap-3 px-6 py-3.5 font-label text-[0.72rem] uppercase tracking-[0.22em] transition-colors hover:bg-ink-wash hover:text-ink";

export const drawerRow = (active = false) =>
  `${BASE} ${active ? "text-ink" : "text-ink-soft"}`;

// The unread badge on a drawer row. Sits at the end of the row rather than over the
// icon: there is room for a number here, and a corner badge on a 22px icon inside a
// full-width row reads as damage.
export const DRAWER_COUNT =
  "ml-auto bg-ink text-paper text-[10px] font-bold leading-none px-1.5 py-1 min-w-5 text-center";
