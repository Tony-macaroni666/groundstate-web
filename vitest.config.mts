import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The same "@/" root alias as tsconfig.json, so tests can import app modules.
  resolve: { alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }] },
  test: { include: ["tests/**/*.test.ts"] },
});
