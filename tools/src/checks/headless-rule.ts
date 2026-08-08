// The boundary between the two suites, and the one place it is decided. A unit
// test that imports a browser driver needs a display and a GPU, and the unit
// suite has neither, so the import is refused when the bundler resolves it rather
// than when the test body runs.
//
// This is a module rather than a closure inside the Vitest config because a rule
// that can only be exercised by adding a file which reddens the whole run is a
// rule nothing proves. The decision is here so a fixture can be put in front of
// it, the same way every other decision in this tree was moved out of its runner.
//
// Reads no file and resolves nothing on disk: it is given the repository root,
// the importer and the specifier, so the suite can ask it about a file that does
// not exist.

import { isAbsolute, relative, resolve } from "node:path";

// Package names that drive a browser. Membership is exact rather than by prefix,
// because a prefix rule would refuse a package merely named after one of these.
// That is also this list's bound: a driver nobody has written down walks past,
// and the list is the thing to extend when one arrives.
export const browserDrivers: readonly string[] = [
  "@playwright/test",
  "playwright",
  "playwright-core",
  "puppeteer",
  "puppeteer-core",
  "selenium-webdriver",
];

// Where a refused test is sent. Named as the command rather than as a
// description, because a refusal that says a test belongs somewhere else and does
// not say how to run it there has moved the problem.
export const hardwareSuiteCommand = "corepack pnpm run test:needs-display-and-gpu";
export const hardwareSuiteDirectory = "tests/hardware/";

// Whether `path` sits under `directory`. A plain string prefix is wrong here and
// wrong in the direction that refuses valid work: `tests/unit-helpers/a.ts`
// starts with `tests/unit` and is not inside it. The comparison is by path step.
export function isInside(directory: string, path: string): boolean {
  const step = relative(resolve(directory), resolve(path));
  return step !== "" && !step.startsWith("..") && !isAbsolute(step);
}

// The refusal message, or null where nothing is refused. One function so that the
// suite judges the same bytes the plugin does.
export function refusalFor(
  repoRoot: string,
  importer: string | undefined,
  source: string,
  drivers: readonly string[] = browserDrivers,
): string | null {
  // No importer means an entry point rather than an import inside a test file.
  if (importer === undefined) return null;
  if (!isInside(resolve(repoRoot, "tests", "unit"), importer)) return null;
  if (!drivers.includes(source)) return null;
  return (
    `${relative(repoRoot, importer)} imports ${source}, which drives a browser. ` +
    `The unit suite runs with no display and no GPU, so a test that needs one belongs in ` +
    `${hardwareSuiteDirectory} and runs under ${hardwareSuiteCommand} instead.`
  );
}

// The Vitest plugin the config installs. `drivers` is a parameter so the suite
// can run the same fixture with the rule switched off, which is the leg that says
// the refusal came from this rule and not from somewhere else in the run.
export function refuseBrowserDriversInUnitTests(
  repoRoot: string,
  drivers: readonly string[] = browserDrivers,
) {
  return {
    name: "refuse-browser-drivers-in-unit-tests",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined): null {
      const refusal = refusalFor(repoRoot, importer, source, drivers);
      if (refusal !== null) throw new Error(refusal);
      return null;
    },
  };
}
