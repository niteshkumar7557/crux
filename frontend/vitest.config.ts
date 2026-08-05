import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `@/*` is tsconfig's path alias and the import style used throughout app code.
// Vitest resolves modules itself, so it needs telling separately — without this
// a tested module may only import across directories with `import type`, which
// is erased before resolution and hides the gap.
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": resolve(root) },
  },
  test: {
    include: ["app/**/*.test.ts"],
  },
});
