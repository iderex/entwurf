// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { coverageExclude, coverageFloor, coverageInclude } from "./src/coverage-scope.ts";
import { refuseBrowserDriversInUnitTests } from "./src/checks/headless-rule.ts";

const repoRoot = dirname(import.meta.dirname);

// Refuses at resolve time, before any test body runs, so the unit suite cannot
// even load a file that reaches a browser driver. What it reaches: every import
// the bundler resolves, static or dynamic. What it does not reach: a module
// loaded at runtime through node:module createRequire, which never passes through
// this plugin.
//
// The decision it applies lives in ./src/checks/headless-rule.ts so that the
// suite can put a fixture in front of it. tests/unit/headless-rule.test.ts takes
// the plugin out of this exported config and calls it, so what is proved there is
// the object installed here rather than a copy of it.
export default defineConfig({
  root: repoRoot,
  plugins: [refuseBrowserDriversInUnitTests(repoRoot)],
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/announce-scope.ts"],
    coverage: {
      provider: "v8",
      // `include` on its own carries a file no test imported into the report,
      // which is what the floor needs. `all` was set here and is not a key this
      // runner has: the compiler found it once the config was put inside the
      // typecheck, and it had been doing nothing.
      include: coverageInclude,
      exclude: coverageExclude.map(({ pattern }) => pattern),
      // text-summary prints the totals the floor is judged against, and
      // json-summary is the per-file record. The per-file `text` table is not
      // used: it renders with a header and no rows here, and a table that shows
      // no files reads as a run that measured none.
      reporter: ["text-summary", "json-summary"],
      thresholds: coverageFloor,
    },
  },
});
