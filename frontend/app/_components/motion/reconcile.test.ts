import { describe, it, expect } from "vitest";
import { hasPostedArgument, type PostedRow } from "./reconcile";

const rows: PostedRow[] = [
  {
    post_user_id: 7,
    content: "Nuclear is the only grid-scale option that clears.",
  },
  {
    post_user_id: 9,
    content: "Storage costs are falling faster than that assumes.",
  },
];

describe("hasPostedArgument", () => {
  it("finds the viewer's own argument by its exact text", () => {
    expect(
      hasPostedArgument(
        rows,
        7,
        "Nuclear is the only grid-scale option that clears.",
      ),
    ).toBe(true);
  });

  it("matches the trimmed draft, because that is what the server stored", () => {
    expect(
      hasPostedArgument(
        rows,
        7,
        "  Nuclear is the only grid-scale option that clears.  ",
      ),
    ).toBe(true);
  });

  it("does not claim someone else's argument as the viewer's", () => {
    expect(
      hasPostedArgument(
        rows,
        7,
        "Storage costs are falling faster than that assumes.",
      ),
    ).toBe(false);
  });

  it("does not match a different argument by the same author", () => {
    expect(hasPostedArgument(rows, 7, "Something else entirely.")).toBe(false);
  });

  it("never matches on an empty draft", () => {
    expect(hasPostedArgument([{ post_user_id: 7, content: "" }], 7, "   ")).toBe(
      false,
    );
  });

  it("survives an empty arena", () => {
    expect(hasPostedArgument([], 7, "anything")).toBe(false);
  });
});
