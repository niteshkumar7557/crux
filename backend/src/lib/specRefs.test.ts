// Keeps the code's pointers into docs/ honest. Comments carry "Spec:
// game-theory.md §7" and a bare "§7" as shorthand for the same file; this test
// fails if any of those names a section the doc does not have.
//
// It is the mechanism that stops this generation of docs rotting the way the
// last one did: renumber a section without updating the code and CI goes red.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DOCS = path.join(ROOT, "docs");

// The docs a comment may point at. Numbered as "## §N" or as "## N.".
const DOC_FILES = [
  "game-theory.md",
  "design-system.md",
  "codebase-guide.md",
  "future-features.md",
] as const;

// A bare §N means the spec — it is by far the most-cited doc.
const DEFAULT_DOC = "game-theory.md";

const SOURCE_ROOTS = [
  path.join(ROOT, "backend/src"),
  path.join(ROOT, "frontend/app"),
];
const SOURCE_EXT = new Set([".ts", ".tsx", ".sql", ".css"]);

const REFERENCE = /(?:(game-theory|design-system|codebase-guide|future-features)\.md\s*)?§(\d+)/g;

function sectionsOf(doc: string): Set<number> {
  const text = fs.readFileSync(path.join(DOCS, doc), "utf8");
  const found = new Set<number>();
  for (const m of text.matchAll(/^##\s+(?:§)?(\d+)[.\s]/gm)) {
    found.add(Number(m[1]));
  }
  return found;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (SOURCE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

describe("spec references", () => {
  const sections = new Map(DOC_FILES.map((d) => [d, sectionsOf(d)]));

  it("every doc is numbered and parseable", () => {
    for (const [doc, found] of sections) {
      expect(found.size, `${doc} has no numbered sections`).toBeGreaterThan(0);
    }
  });

  it("every §N in the codebase names a section that exists", () => {
    const broken: string[] = [];

    for (const root of SOURCE_ROOTS) {
      for (const file of sourceFiles(root)) {
        const lines = fs.readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          for (const m of line.matchAll(REFERENCE)) {
            const doc = m[1] ? `${m[1]}.md` : DEFAULT_DOC;
            const n = Number(m[2]);
            if (!sections.get(doc as (typeof DOC_FILES)[number])?.has(n)) {
              broken.push(
                `${path.relative(ROOT, file)}:${i + 1} → ${doc} §${n} does not exist`,
              );
            }
          }
        });
      }
    }

    expect(broken, broken.join("\n")).toEqual([]);
  });
});
