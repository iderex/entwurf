import { defineConfig } from "@playwright/test";
import { dirname, join } from "node:path";
import { gpuLaunchArgs } from "./src/hardware/probe.ts";

const repoRoot = dirname(import.meta.dirname);

export default defineConfig({
  testDir: join(repoRoot, "tests", "hardware"),
  // One worker. Several browsers competing for one GPU is a source of numbers
  // that move for reasons the change under test had nothing to do with.
  workers: 1,
  // No retries. A case that passes on the second attempt has told you something,
  // and hiding it behind a retry throws that away.
  retries: 0,
  fullyParallel: false,
  reporter: [["list"], [join(repoRoot, "tools", "src", "hardware", "reporter.ts")]],
  use: {
    launchOptions: { args: gpuLaunchArgs },
  },
});
