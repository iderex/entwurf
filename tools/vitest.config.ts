import { defineConfig } from "vitest/config";
import { dirname, relative, resolve } from "node:path";
import { coverageExclude, coverageFloor, coverageInclude } from "./src/coverage-scope.ts";

const repoRoot = dirname(import.meta.dirname);

// Anything that drives a browser. A test that reaches one of these is not a unit
// test in this repository's vocabulary: it needs a display and a GPU, it belongs
// in the hardware-bound suite, and the split has to be held by something that
// runs rather than by somebody remembering it at review.
const browserDrivers = ["@playwright/test", "playwright", "playwright-core", "puppeteer", "puppeteer-core", "selenium-webdriver"];

// Refuses at resolve time, before any test body runs, so a unit suite cannot even
// load a file that reaches a driver. What it reaches: every import Vite resolves,
// static or dynamic. What it does not reach: a module loaded at runtime through
// node:module createRequire, which never passes through this plugin.
function refuseBrowserDriversInUnitTests() {
  const unitTests = resolve(repoRoot, "tests", "unit");
  return {
    name: "refuse-browser-drivers-in-unit-tests",
    enforce: "pre",
    resolveId(source: string, importer: string | undefined) {
      if (importer === undefined) return null;
      if (!resolve(importer).startsWith(unitTests)) return null;
      if (!browserDrivers.includes(source)) return null;
      throw new Error(
        `${relative(repoRoot, importer)} imports ${source}, which drives a browser. The unit suite runs with no display and no GPU, so a test that needs one belongs in the hardware-bound suite instead.`,
      );
    },
  };
}

export default defineConfig({
  root: repoRoot,
  plugins: [refuseBrowserDriversInUnitTests()],
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
