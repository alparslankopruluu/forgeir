import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@forgeir/core": `${root}/packages/core/src/index.ts`,
      "@forgeir/diag": `${root}/packages/diag/src/index.ts`,
      "@forgeir/syntax": `${root}/packages/syntax/src/index.ts`,
      "@forgeir/sema": `${root}/packages/sema/src/index.ts`,
      "@forgeir/ir": `${root}/packages/ir/src/index.ts`,
      "@forgeir/patch": `${root}/packages/patch/src/index.ts`,
      "@forgeir/emit-ts": `${root}/packages/emit-ts/src/index.ts`,
      "@forgeir/mcp": `${root}/packages/mcp/src/index.ts`,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
