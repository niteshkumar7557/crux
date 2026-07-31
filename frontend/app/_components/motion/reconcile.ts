// Did the argument we lost the reply to actually land? Pure.
//
// An exact string match is safe rather than lucky: the server stores
// checkText()'s value, which is exactly raw.trim(), so the draft in the box and
// the row in the database are the same string or they are different arguments.
// Spec: game-theory.md §19

export interface PostedRow {
  post_user_id: number;
  content: string;
}

export function hasPostedArgument(
  rows: PostedRow[],
  userId: number,
  draft: string,
): boolean {
  const needle = draft.trim();
  if (needle.length === 0) return false;
  return rows.some(
    (r) => Number(r.post_user_id) === userId && String(r.content) === needle,
  );
}
