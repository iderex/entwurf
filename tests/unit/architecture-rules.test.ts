// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the structural rules, and it has to carry one thing the other
// proofs in this tree do not. A rule over the real tree passes when the tree is
// clean and it passes just as green when the reader that built the graph read
// nothing at all, so the first block below asks the reader to find the drivers
// that are genuinely there before any rule is allowed to report a clean result.
// Without it a typo in the walk would report every structural rule as held.
//
// Every rule is then run against a fixture that violates it, and the same fixture
// is run again with the rule switched off, where it has to pass. That is the same
// thing as deleting the assertion and watching this file go red.
//
// The fixtures are graphs rather than files. A real module in this tree that
// imports a browser driver would be refused when the bundler resolves it, which
// reds the run that would have reported the rule.

import { describe, expect, test } from "vitest";
import { dirname } from "node:path";
import {
  type Graph,
  decisionsReachingRunners,
  describeReach,
  importsIn,
  isRunner,
  moduleNamedBy,
  modulesReachingABrowser,
  modulesUnder,
  reachFrom,
  readGraph,
  runnerPatterns,
  verdictLogic,
} from "./architecture/rules.ts";
import { browserDrivers } from "../../tools/src/checks/headless-rule.ts";

const repoRoot = dirname(dirname(import.meta.dirname));
const tree = readGraph(repoRoot, ["tools", "tests"]);

const unitTests = tree.filter((module) => module.path.endsWith(".test.ts")).map((module) => module.path);

describe("the reader sees this tree, so a clean result is a statement about the tree", () => {
  test("it found the modules the rules are about", () => {
    const paths = tree.map((module) => module.path);
    expect(paths).toContain("tools/src/checks/report.ts");
    expect(paths).toContain("tools/src/hardware/probe.ts");
    expect(paths).toContain("tests/unit/architecture-rules.test.ts");
    expect(modulesUnder(tree, verdictLogic).length).toBeGreaterThan(5);
    expect(unitTests.length).toBeGreaterThan(5);
  });

  test("it finds a browser driver where the tree genuinely reaches one", () => {
    // The three places that are supposed to reach a driver. If the walk stops
    // seeing these, every rule below is vacuous and this is where that shows.
    for (const path of ["tools/src/hardware/probe.ts", "tools/playwright.config.ts", "tests/hardware/gpu-path.spec.ts"]) {
      expect(reachFrom(tree, path, browserDrivers), path).not.toBeNull();
    }
  });

  test("it follows an import through a module rather than only the first step", () => {
    // playwright.config.ts names no driver of its own on the way to probe.ts in
    // the sense that matters here: the trail is longer than one module.
    const reach = reachFrom(tree, "tools/src/run-hardware-suite.ts", browserDrivers);
    expect(reach).not.toBeNull();
    expect(reach?.trail.length).toBeGreaterThan(1);
    expect(reach?.trail).toContain("tools/src/hardware/probe.ts");
  });
});

describe("the verdict logic reaches no browser, at any depth", () => {
  test("nothing under the checks directory reaches a driver", () => {
    const found = modulesReachingABrowser(tree, modulesUnder(tree, verdictLogic));
    expect(found.map(describeReach)).toEqual([]);
  });

  test("no test in the unit suite reaches a driver, through however many modules", () => {
    const found = modulesReachingABrowser(tree, unitTests);
    expect(found.map(describeReach)).toEqual([]);
  });
});

describe("the direction between the decisions and the runners runs one way", () => {
  test("no decision imports a runner", () => {
    expect(decisionsReachingRunners(tree).map(describeReach)).toEqual([]);
  });

  test("the runners this rule is about are in the tree, so it is not judging an empty set", () => {
    const runners = tree.map((module) => module.path).filter((path) => isRunner(path));
    expect(runners).toContain("tools/src/check-docs.ts");
    expect(runners).toContain("tools/src/run-hardware-suite.ts");
    expect(runners).toContain("tools/src/print-upstream-revision.ts");
  });
});

// The mistake is not a check module importing @playwright/test, which nobody
// writes and which the config's own refusal would catch on the first test that
// loaded it. It is a verdict wanting to say something about the machine and
// reaching for the module that already knows: probe.ts, which launches a browser.
// One import, no driver named anywhere in the file somebody edited.
const reachedThroughAModule: Graph = [
  { path: "tools/src/checks/machine-report.ts", imports: ["./report.ts", "../hardware/probe.ts"] },
  { path: "tools/src/checks/report.ts", imports: [] },
  { path: "tools/src/hardware/probe.ts", imports: ["@playwright/test", "./machine.ts"] },
  { path: "tools/src/hardware/machine.ts", imports: [] },
];

// One edit away from the fixture above and correct: machine.ts holds what a
// verdict about the machine would want and reaches no driver. A rule that refused
// this would refuse the repair as well as the mistake.
const reachedTheModuleThatHoldsNoDriver: Graph = [
  { path: "tools/src/checks/machine-report.ts", imports: ["./report.ts", "../hardware/machine.ts"] },
  { path: "tools/src/checks/report.ts", imports: [] },
  { path: "tools/src/hardware/probe.ts", imports: ["@playwright/test", "./machine.ts"] },
  { path: "tools/src/hardware/machine.ts", imports: [] },
];

describe("the browser rule, against the near miss and with itself switched off", () => {
  const roots = ["tools/src/checks/machine-report.ts"];

  test("a verdict that reaches a driver through one module is refused", () => {
    const found = modulesReachingABrowser(reachedThroughAModule, roots);
    expect(found).toHaveLength(1);
    expect(describeReach(found[0]!)).toBe(
      "tools/src/checks/machine-report.ts -> tools/src/hardware/probe.ts -> @playwright/test",
    );
  });

  test("the same fixture passes with the rule switched off", () => {
    expect(modulesReachingABrowser(reachedThroughAModule, roots, [])).toEqual([]);
  });

  test("reaching the module beside it, which names no driver, is not refused", () => {
    expect(modulesReachingABrowser(reachedTheModuleThatHoldsNoDriver, roots)).toEqual([]);
  });

  test("a specifier merely named after a driver is not refused", () => {
    const graph: Graph = [{ path: "tools/src/checks/a.ts", imports: ["playwright-extra", "@playwright/test-helpers"] }];
    expect(modulesReachingABrowser(graph, ["tools/src/checks/a.ts"])).toEqual([]);
  });

  test("a cycle does not stop the walk from finishing", () => {
    const graph: Graph = [
      { path: "tools/src/checks/a.ts", imports: ["./b.ts"] },
      { path: "tools/src/checks/b.ts", imports: ["./a.ts", "puppeteer"] },
    ];
    expect(modulesReachingABrowser(graph, ["tools/src/checks/a.ts"])).toHaveLength(1);
    expect(modulesReachingABrowser(graph, ["tools/src/checks/a.ts"], [])).toEqual([]);
  });
});

// The inversion, and it is the tidy-looking one. A decision needs the repository
// root the runner beside it already computed, so it imports the runner. Nothing
// visible breaks: the suite still passes, the coverage number does not move
// because the runner is outside the measurement, and a decision has quietly moved
// behind a module nothing proves.
const decisionImportingItsRunner: Graph = [
  { path: "tools/src/checks/docs.ts", imports: ["./report.ts", "../check-docs.ts"] },
  { path: "tools/src/check-docs.ts", imports: ["./checks/docs.ts"] },
  { path: "tools/src/checks/report.ts", imports: [] },
];

describe("the direction rule, against the near miss and with itself switched off", () => {
  test("a decision importing its own runner is refused", () => {
    const found = decisionsReachingRunners(decisionImportingItsRunner);
    expect(found).toHaveLength(1);
    expect(describeReach(found[0]!)).toBe("tools/src/checks/docs.ts -> tools/src/check-docs.ts");
  });

  test("the same fixture passes with the rule switched off", () => {
    expect(decisionsReachingRunners(decisionImportingItsRunner, verdictLogic, [])).toEqual([]);
  });

  test("the runner importing the decision, which is the direction that is correct, is not refused", () => {
    const graph: Graph = [
      { path: "tools/src/check-docs.ts", imports: ["./checks/docs.ts"] },
      { path: "tools/src/checks/docs.ts", imports: ["./report.ts"] },
      { path: "tools/src/checks/report.ts", imports: [] },
    ];
    expect(decisionsReachingRunners(graph)).toEqual([]);
  });

  test("a decision named check-something is a decision, because the directory decides and the file name does not", () => {
    expect(isRunner("tools/src/checks/check-names.ts")).toBe(false);
    expect(isRunner("tools/src/check-names.ts")).toBe(true);
    const graph: Graph = [
      { path: "tools/src/checks/docs.ts", imports: ["./check-names.ts"] },
      { path: "tools/src/checks/check-names.ts", imports: [] },
    ];
    expect(decisionsReachingRunners(graph)).toEqual([]);
  });

  test("a sibling directory whose name starts with the decisions directory is not inside it", () => {
    const graph: Graph = [{ path: "tools/src/checks-helpers/a.ts", imports: ["../check-docs.ts"] }];
    expect(decisionsReachingRunners(graph)).toEqual([]);
  });

  test("a decision importing something outside this tree is not a runner import", () => {
    const graph: Graph = [{ path: "tools/src/checks/a.ts", imports: ["node:path", "../pins.ts"] }];
    expect(decisionsReachingRunners(graph)).toEqual([]);
  });
});

describe("what the reader counts as an import, and where it stops", () => {
  test("it reads the forms this tree writes", () => {
    const text = [
      'import { a } from "./a.ts";',
      'import type { B } from "./b.ts";',
      'export { c } from "./c.ts";',
      'import "./d.ts";',
      'const e = await import("./e.ts");',
    ].join("\n");
    expect(importsIn(text)).toEqual(["./a.ts", "./b.ts", "./c.ts", "./d.ts", "./e.ts"]);
  });

  test("it counts a specifier once however often it is written", () => {
    expect(importsIn('import { a } from "./a.ts";\nimport { b } from "./a.ts";')).toEqual(["./a.ts"]);
  });

  test("a module named through node:module is outside it, which is the same blind spot the config's refusal has", () => {
    expect(importsIn('const load = createRequire(import.meta.url);\nload("playwright");')).toEqual([]);
  });

  test("a relative specifier names a module and a bare one names a package", () => {
    expect(moduleNamedBy("tools/src/checks/docs.ts", "./guide.ts")).toBe("tools/src/checks/guide.ts");
    expect(moduleNamedBy("tools/src/checks/docs.ts", "../pins.ts")).toBe("tools/src/pins.ts");
    expect(moduleNamedBy("tools/src/checks/docs.ts", "@playwright/test")).toBeNull();
    expect(moduleNamedBy("tools/src/checks/docs.ts", "node:path")).toBeNull();
  });

  test("the runner patterns are the ones this rule was written against", () => {
    expect(runnerPatterns).toHaveLength(1);
    expect(isRunner("tools/src/checks/report.ts")).toBe(false);
    expect(isRunner("tests/unit/report.test.ts")).toBe(false);
  });
});
