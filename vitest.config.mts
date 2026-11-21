import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only throws outside React Server Components; it's a no-op in tests.
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
      // next/cache directives aren't available outside Next; stub them for unit tests.
      "next/cache": fileURLToPath(new URL("./tests/next-cache-stub.ts", import.meta.url)),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
