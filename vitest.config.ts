import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration files reset the same disposable database between cases.
    // Keep those files sequential; concurrency inside individual cases remains.
    fileParallelism: !process.env.TEST_DATABASE_URL,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
