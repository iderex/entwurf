// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the headless rule, which is the one thing the rule was missing:
// it was a plugin nothing exercised, so a change that removed it or narrowed it
// would have left every run green.
//
// Two things are proved here and they are different. The first is that the object
// this suite runs under carries the rule at all, which is why the plugin is taken
// out of the exported Vitest config rather than constructed here. The second is
// what the rule refuses and what it does not, and every one of those legs is also
// run with the rule switched off, where the same fixture has to pass. That is the
// same thing as deleting the rule and watching this file go red.
//
// The fixtures are paths and specifiers rather than files. A real file in
// tests/unit that imports a browser driver would red the whole run at load time,
// which proves the rule by destroying the run that would report it.

import { describe, expect, test } from "vitest";
import config from "../../tools/vitest.config.ts";
import {
  browserDrivers,
  hardwareSuiteCommand,
  hardwareSuiteDirectory,
  isInside,
  refusalFor,
  refuseBrowserDriversInUnitTests,
} from "../../tools/src/checks/headless-rule.ts";

const repoRoot = "/repo";
const insideTheUnitSuite = "/repo/tests/unit/reaches-a-browser.test.ts";

// The rule switched off: the same plugin over an empty set of drivers. Nothing
// else about the fixture changes.
const ruleRemoved = refuseBrowserDriversInUnitTests(repoRoot, []);

type Resolver = { name: string; resolveId: (source: string, importer: string | undefined) => null };

// The plugin this suite is actually running under, taken out of the config rather
// than built again. If the config stops installing it, this throws here rather
// than passing on a copy that nothing uses.
function pluginUnderTest(): Resolver {
  const installed = (config.plugins ?? []) as unknown as Resolver[];
  const found = installed.find((plugin) => plugin?.name === "refuse-browser-drivers-in-unit-tests");
  if (found === undefined) throw new Error("the Vitest config installs no refuse-browser-drivers-in-unit-tests plugin");
  return found;
}

describe("the rule is installed in the config this suite runs under", () => {
  test("the plugin is in the exported config", () => {
    expect(pluginUnderTest().name).toBe("refuse-browser-drivers-in-unit-tests");
  });

  test("the installed plugin refuses a browser driver imported from tests/unit", () => {
    expect(() => pluginUnderTest().resolveId("@playwright/test", `${process.cwd()}/tests/unit/x.test.ts`)).toThrow(
      /drives a browser/,
    );
  });
});

describe("every driver on the list is refused, and none of them is refused once the rule is removed", () => {
  for (const driver of browserDrivers) {
    test(`${driver} is refused`, () => {
      expect(refusalFor(repoRoot, insideTheUnitSuite, driver)).not.toBeNull();
    });

    test(`${driver} passes with the rule removed`, () => {
      expect(ruleRemoved.resolveId(driver, insideTheUnitSuite)).toBeNull();
    });
  }
});

describe("the refusal says which harness the test belongs to", () => {
  const message = refusalFor(repoRoot, insideTheUnitSuite, "@playwright/test");

  test("it names the file that reached for the driver", () => {
    expect(message).toContain("reaches-a-browser.test.ts");
  });

  test("it names the driver", () => {
    expect(message).toContain("@playwright/test");
  });

  test("it names the other suite's directory and the command that runs it", () => {
    expect(message).toContain(hardwareSuiteDirectory);
    expect(message).toContain(hardwareSuiteCommand);
  });
});

describe("the near misses, which are the fixtures worth having", () => {
  // One character between this path and the refused one, and the earlier rule
  // compared strings rather than path steps, so this directory was inside
  // tests/unit as far as it was concerned. A test harness of this shape would
  // have been refused for importing the driver it exists to drive.
  test("a sibling directory whose name starts with tests/unit is not inside it", () => {
    expect(refusalFor(repoRoot, "/repo/tests/unit-helpers/driver.ts", "playwright")).toBeNull();
    expect(isInside("/repo/tests/unit", "/repo/tests/unit-helpers/driver.ts")).toBe(false);
  });

  test("the hardware suite may import a driver, which is the whole point of it", () => {
    expect(refusalFor(repoRoot, "/repo/tests/hardware/gpu-path.spec.ts", "@playwright/test")).toBeNull();
  });

  test("a nested file inside tests/unit is still inside it", () => {
    expect(refusalFor(repoRoot, "/repo/tests/unit/deep/nested.test.ts", "puppeteer")).not.toBeNull();
  });

  test("the directory itself is not inside itself, so nothing is refused for being it", () => {
    expect(isInside("/repo/tests/unit", "/repo/tests/unit")).toBe(false);
  });

  test("a specifier merely named after a driver is not refused", () => {
    expect(refusalFor(repoRoot, insideTheUnitSuite, "playwright-extra")).toBeNull();
    expect(refusalFor(repoRoot, insideTheUnitSuite, "@playwright/test-helpers")).toBeNull();
  });

  test("an ordinary import from inside tests/unit is not refused", () => {
    expect(refusalFor(repoRoot, insideTheUnitSuite, "node:path")).toBeNull();
  });

  test("an entry point, which has no importer, is not refused", () => {
    expect(refusalFor(repoRoot, undefined, "@playwright/test")).toBeNull();
    expect(refuseBrowserDriversInUnitTests(repoRoot).resolveId("@playwright/test", undefined)).toBeNull();
  });
});
