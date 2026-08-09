// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the bill of materials. Each rule carries a fixture that is a near
// miss rather than an obvious violation: the manifest somebody actually publishes,
// one field away from the correct one, which is also here and has to pass.
//
// Each rule is also run against its own fixture with the rule switched off, and
// the fixture then has to pass. That is what says the refusal came from the rule
// rather than from somewhere else in the run, which is the same thing as deleting
// the rule and watching this go green.

import { describe, expect, test } from "vitest";
import {
  billOfMaterials,
  checkBillOfMaterials,
  renderDocument,
  rules,
  ruleIds,
  type Input,
  type LockedPackage,
  type Manifest,
  type Row,
} from "../../tools/src/checks/bill-of-materials.ts";
import { passed } from "../../tools/src/checks/report.ts";

function locked(name: string, version: string, os: string[] = [], cpu: string[] = []): LockedPackage {
  return { name, version, os, cpu };
}

function manifest(name: string, version: string, declared: string | undefined): Manifest {
  return { name, version, declared, readFrom: `node_modules/.pnpm/${name}@${version}/node_modules/${name}/package.json` };
}

function input(over: Partial<Input> = {}): Input {
  const base: Input = {
    lockPath: "pnpm-lock.yaml",
    packages: [locked("vitest", "4.1.10")],
    manifests: [manifest("vitest", "4.1.10", "MIT")],
    ignoredStoreEntries: 0,
    lockFilesInTree: ["pnpm-lock.yaml"],
    tracked: undefined,
    documentPath: "docs/legal/bill-of-materials.md",
  };
  const merged = { ...base, ...over };
  // The drift rule compares against what this very input generates, so a fixture
  // that wants to be clean has to carry that document rather than a copy written
  // here, which would go stale the first time the renderer changed a word.
  if (over.tracked === undefined && !("tracked" in over)) {
    merged.tracked = renderDocument(merged, billOfMaterials(merged));
  }
  return merged;
}

type Case = {
  id: string;
  // Why this is the mistake somebody will actually make.
  why: string;
  nearMiss: Input;
  // The same input written correctly. Without this the fixture proves the rule
  // fires somewhere in the neighbourhood and not that it separates the two.
  corrected: Input;
  refusal: string;
};

// A manifest field npm's own initialiser offers, which reads as an answer to
// anything that copies the string and never as one to a reader who wants terms.
const pointsAtAFile = input({
  packages: [locked("magicast", "0.5.4")],
  manifests: [manifest("magicast", "0.5.4", "SEE LICENSE IN LICENSE.md")],
});

const cases: readonly Case[] = [
  {
    id: "dependency-without-a-determined-licence",
    why: "publishing a manifest whose licence field points at a file, which is legal npm and names no terms",
    nearMiss: pointsAtAFile,
    corrected: input({
      packages: [locked("magicast", "0.5.4")],
      manifests: [manifest("magicast", "0.5.4", "MIT")],
    }),
    refusal:
      'dependency-without-a-determined-licence: magicast@0.5.4: is named by pnpm-lock.yaml and its manifest declares "SEE LICENSE IN LICENSE.md", which points at a file rather than naming terms',
  },
  {
    id: "dependency-that-could-not-be-read",
    why:
      "a store carrying the neighbouring patch version of a package, which looks installed and matches nothing the lock file names",
    nearMiss: input({
      packages: [locked("tinyrainbow", "3.0.3")],
      manifests: [manifest("tinyrainbow", "3.0.4", "MIT")],
    }),
    corrected: input({
      packages: [locked("tinyrainbow", "3.0.3")],
      manifests: [manifest("tinyrainbow", "3.0.3", "MIT")],
    }),
    refusal:
      "dependency-that-could-not-be-read: tinyrainbow@3.0.3: is named by pnpm-lock.yaml and no manifest for it was found, so it is refused rather than omitted",
  },
  {
    id: "bill-of-materials-out-of-date",
    why:
      "bumping a dependency and correcting the version in the generated document by hand, which is one character and leaves every other row right",
    nearMiss: input({
      tracked: renderDocument(
        input({ packages: [locked("vitest", "4.1.9")], manifests: [manifest("vitest", "4.1.9", "MIT")], tracked: undefined }),
        billOfMaterials(
          input({ packages: [locked("vitest", "4.1.9")], manifests: [manifest("vitest", "4.1.9", "MIT")], tracked: undefined }),
        ),
      ),
    }),
    corrected: input(),
    refusal:
      "bill-of-materials-out-of-date: docs/legal/bill-of-materials.md: differs from what this run generates, so the tracked copy was edited by hand or the lock file moved under it",
  },
];

describe("the rule table", () => {
  test("carries the three rules this check names, and no rule twice", () => {
    expect([...ruleIds].sort()).toEqual([
      "bill-of-materials-out-of-date",
      "dependency-that-could-not-be-read",
      "dependency-without-a-determined-licence",
    ]);
  });

  test("every rule says what it prevents and what it does not reach", () => {
    for (const rule of rules) {
      expect(rule.prevents.length, rule.id).toBeGreaterThan(0);
      expect(rule.bound.length, rule.id).toBeGreaterThan(0);
    }
  });

  // A rule added to the table without a fixture here is one nothing proves, and it
  // would ship looking exactly like the three that are proved.
  test("every rule in the table has a fixture in this file", () => {
    expect(cases.map((entry) => entry.id).sort()).toEqual([...ruleIds].sort());
  });
});

describe.each(cases)("$id", (entry) => {
  test("refuses the near miss, naming the rule and the package", () => {
    const { report } = checkBillOfMaterials(entry.nearMiss);
    expect(report.refusals).toEqual([entry.refusal]);
  });

  test("passes the same fixture with this rule not run", () => {
    const { report } = checkBillOfMaterials(entry.nearMiss, new Set(ruleIds.filter((id) => id !== entry.id)));
    expect(passed(report)).toBe(true);
    expect(report.lines.at(-1)).toBe(
      `NOT run on this run, so this run says nothing about them: ${entry.id}.`,
    );
  });

  test("passes the corrected input", () => {
    const { report } = checkBillOfMaterials(entry.corrected);
    expect(report.refusals).toEqual([]);
  });
});

describe("what a licence field can say and what it is worth", () => {
  test.each([
    ["UNLICENSED", "which is a note to come back rather than a licence"],
    ["unknown", "which is a note to come back rather than a licence"],
    ["proprietary", "which is a note to come back rather than a licence"],
    ["See LICENSE in the repository", "which points at a file rather than naming terms"],
  ])("refuses %s", (declared, reason) => {
    const { report } = checkBillOfMaterials(
      input({ packages: [locked("some-package", "1.0.0")], manifests: [manifest("some-package", "1.0.0", declared)] }),
    );
    expect(report.refusals).toEqual([
      `dependency-without-a-determined-licence: some-package@1.0.0: is named by pnpm-lock.yaml and its manifest declares "${declared}", ${reason}`,
    ]);
  });

  test("refuses a manifest whose licence field is absent", () => {
    const { report } = checkBillOfMaterials(
      input({ packages: [locked("some-package", "1.0.0")], manifests: [manifest("some-package", "1.0.0", undefined)] }),
    );
    expect(report.refusals).toEqual([
      "dependency-without-a-determined-licence: some-package@1.0.0: is named by pnpm-lock.yaml and its own package.json declares no licence",
    ]);
  });

  test("refuses a manifest whose licence field is blank", () => {
    const { report } = checkBillOfMaterials(
      input({ packages: [locked("some-package", "1.0.0")], manifests: [manifest("some-package", "1.0.0", "   ")] }),
    );
    expect(report.refusals).toEqual([
      "dependency-without-a-determined-licence: some-package@1.0.0: is named by pnpm-lock.yaml and its own package.json declares no licence",
    ]);
  });

  // Trimming rather than matching the raw bytes, because a manifest written by
  // hand carries whatever whitespace the person left.
  test("a licence with whitespace around it is the licence", () => {
    const rows = billOfMaterials(
      input({ packages: [locked("some-package", "1.0.0")], manifests: [manifest("some-package", "1.0.0", " MIT ")], tracked: undefined }),
    );
    expect(rows[0]?.licence).toBe("MIT");
  });

  // The reason is written without the path the manifest was read from. A store path
  // carries the resolving machine's peer hashes, so a document holding one drifts
  // between two checkouts of the same lock file and the drift rule would then be
  // reporting the store rather than the dependencies.
  test("no refusal and no row names the store path it was read from", () => {
    const { report, document } = checkBillOfMaterials(pointsAtAFile);
    for (const refusal of report.refusals) expect(refusal).not.toContain("node_modules");
    expect(document).not.toContain("node_modules");
  });
});

describe("a package restricted to another platform", () => {
  const windowsOnly = input({
    packages: [locked("vitest", "4.1.10"), locked("lightningcss-darwin-arm64", "1.33.0", ["darwin"], ["arm64"])],
    manifests: [manifest("vitest", "4.1.10", "MIT")],
  });

  // One machine cannot install every platform's binaries. Collapsing this into the
  // undetermined case would make the check red on every machine, and a check that
  // can never be green refuses nothing.
  test("is not refused, because no machine could answer it", () => {
    const { report } = checkBillOfMaterials(windowsOnly);
    expect(passed(report)).toBe(true);
  });

  test("is listed with the constraint that stopped the reading rather than left out", () => {
    const { document } = checkBillOfMaterials(windowsOnly);
    expect(document).toContain(
      "| lightningcss-darwin-arm64 | 1.33.0 | NOT READ: the lock file restricts it to os darwin, cpu arm64,",
    );
  });

  test("is counted in the run's own output, so the gap is a number rather than a silence", () => {
    const { report } = checkBillOfMaterials(windowsOnly);
    expect(report.lines).toContain(
      "1 package(s) are restricted by the lock file to another platform, so their terms were NOT read on this route and this run is no evidence about them.",
    );
    expect(report.lines).toContain("1 of 2 package(s) declare a licence this run could read.");
  });

  // The constraint comes from the lock file rather than from the machine, so the
  // same bytes are generated wherever the command is run. A document that recorded
  // what this machine happened to have installed would drift on every other one.
  test("a constraint on the operating system alone, and on the processor alone, both read", () => {
    const rows = billOfMaterials(
      input({
        packages: [locked("fsevents", "2.3.3", ["darwin"], []), locked("some-binding", "1.0.0", [], ["arm64"])],
        manifests: [],
        tracked: undefined,
      }),
    );
    expect(rows.map((row) => row.why)).toEqual([
      "the lock file restricts it to os darwin, and no route here reads a package built for a platform other than the one generating this",
      "the lock file restricts it to cpu arm64, and no route here reads a package built for a platform other than the one generating this",
    ]);
  });
});

describe("the document", () => {
  test("is ordered by name and then version, so two runs over one lock file agree", () => {
    const packages = [locked("vitest", "4.1.10"), locked("chai", "6.2.0"), locked("vitest", "4.1.9")];
    const manifests = [
      manifest("vitest", "4.1.10", "MIT"),
      manifest("chai", "6.2.0", "MIT"),
      manifest("vitest", "4.1.9", "MIT"),
    ];
    const rows = billOfMaterials(input({ packages, manifests, tracked: undefined }));
    expect(rows.map((row) => `${row.name}@${row.version}`)).toEqual(["chai@6.2.0", "vitest@4.1.9", "vitest@4.1.10"]);
  });

  // A version compared character by character puts 4.1.10 above 4.1.9, and a
  // reader who sees a sorted table reads a version out of order as a missing one.
  // What this order is NOT is semver precedence: a release sits above its own
  // pre-releases here, where semver puts it below them. Nothing reads this order
  // for precedence, so the cheaper rule is the one in the tree, and the third row
  // below is the case that would fail if anybody later assumed otherwise.
  test.each([
    [["1.2", "1.2.1"], ["1.2", "1.2.1"]],
    [["1.2.0-rc.2", "1.2.0-beta.9"], ["1.2.0-beta.9", "1.2.0-rc.2"]],
    [["1.2.0-rc.1", "1.2.0"], ["1.2.0", "1.2.0-rc.1"]],
    [["2.0.0", "2.0.0"], ["2.0.0", "2.0.0"]],
  ])("orders %j as %j", (given, expected) => {
    const rows = billOfMaterials(
      input({ packages: given.map((version) => locked("p", version)), manifests: [], tracked: undefined }),
    );
    expect(rows.map((row) => row.version)).toEqual(expected);
  });

  // The name comparison is the same rule, and it is what decides the order of
  // almost every row: two packages differing only in a character that a locale
  // would fold together must still land in one fixed order on every machine.
  test("orders names by code unit, so a scoped package does not move between machines", () => {
    const names = ["vitest", "@vitest/spy", "Vitest-Extra", "vite"];
    const rows = billOfMaterials(
      input({ packages: names.map((name) => locked(name, "1.0.0")), manifests: [], tracked: undefined }),
    );
    expect(rows.map((row) => row.name)).toEqual(["@vitest/spy", "Vitest-Extra", "vite", "vitest"]);
  });

  test("counts the licences it determined, most common first", () => {
    const { document } = checkBillOfMaterials(
      input({
        packages: [locked("a", "1.0.0"), locked("b", "1.0.0"), locked("c", "1.0.0")],
        manifests: [manifest("a", "1.0.0", "MIT"), manifest("b", "1.0.0", "MIT"), manifest("c", "1.0.0", "ISC")],
      }),
    );
    expect(document).toContain("3 package(s): MIT (2), ISC (1).");
  });

  test("says so plainly when it determined none", () => {
    const document = renderDocument(
      input({ packages: [], manifests: [], tracked: undefined }),
      [],
    );
    expect(document).toContain("0 package(s): none with a determined licence.");
  });

  test("carries the count of undetermined packages above the table as well as in it", () => {
    const { document } = checkBillOfMaterials(pointsAtAFile);
    expect(document).toContain("1 package(s) with no licence anybody could determine, listed below with the reason.");
  });

  test("names what it does not cover before it names anything it does", () => {
    const { document } = checkBillOfMaterials(input());
    expect(document.indexOf("## What this does not cover")).toBeLessThan(document.indexOf("## The dependencies"));
    expect(document).toContain("This repository tracks 1 lock file: pnpm-lock.yaml.");
  });

  // A licence expression may carry a pipe in a dual-licence form, and a table cell
  // that let one through would end the row early and drop the rest of it.
  test("a pipe inside a cell does not end the row", () => {
    const row: Row = { name: "odd", version: "1.0.0", state: "determined", licence: "MIT | ISC", why: undefined, readFrom: undefined };
    const document = renderDocument(input({ packages: [], manifests: [], tracked: undefined }), [row]);
    expect(document).toContain("| odd | 1.0.0 | MIT \\| ISC |");
  });

  // Nothing constructs this row today. It is here because the cell has to be
  // unreadable as a licence in every state, including the one where the reason went
  // missing, and a blank cell reads as a licence nobody wrote down.
  test("a row with no reason still says the licence was not determined", () => {
    const row: Row = { name: "odd", version: "1.0.0", state: "undetermined", licence: undefined, why: undefined, readFrom: undefined };
    const document = renderDocument(input({ packages: [], manifests: [], tracked: undefined }), [row]);
    expect(document).toContain("| odd | 1.0.0 | NOT DETERMINED:  |");
  });
});

describe("what the run says about itself", () => {
  test("counts the packages, the manifests and the rules it ran", () => {
    const { report } = checkBillOfMaterials(input());
    expect(report.lines[0]).toBe(
      "examined 1 package(s) named by pnpm-lock.yaml against 1 manifest(s) read from the store, under 3 of 3 rule(s).",
    );
  });

  // A store keeps the directories of packages that were resolved once and are not
  // resolved now. They are outside the document, and a number nobody prints is
  // indistinguishable from none.
  test("counts the store directories it passed over", () => {
    const { report } = checkBillOfMaterials(input({ ignoredStoreEntries: 23 }));
    expect(report.lines).toContain(
      "23 store director(ies) were passed over because pnpm-lock.yaml does not name them, so they are outside this document rather than silently inside it.",
    );
  });

  test("names the lock files it read and says upstream's set is reached by none of them", () => {
    const { report } = checkBillOfMaterials(input());
    expect(report.lines).toContain(
      "lock files this repository tracks: pnpm-lock.yaml. The upstream design tool's own dependency set is reached by none of them, so no run here is evidence about it.",
    );
  });

  test("prints what each rule prevents and what it does not reach", () => {
    const { report } = checkBillOfMaterials(input());
    for (const rule of rules) {
      expect(report.lines).toContain(`${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`);
    }
  });

  test("a clean run does not print the disabled line at all", () => {
    const { report } = checkBillOfMaterials(input());
    expect(report.lines.some((line) => line.startsWith("NOT run"))).toBe(false);
  });

  test("names every offending package rather than the first", () => {
    const { report } = checkBillOfMaterials(
      input({
        packages: [locked("a", "1.0.0"), locked("b", "1.0.0")],
        manifests: [manifest("a", "1.0.0", "UNLICENSED"), manifest("b", "1.0.0", undefined)],
      }),
    );
    expect(report.refusals).toHaveLength(2);
  });
});

describe("the tree carrying no document at all", () => {
  // The first run on a tree that has never generated one has to refuse rather than
  // pass, or the check would be green on the state it exists to end.
  test("is refused, naming the document that would be generated", () => {
    const { report } = checkBillOfMaterials(input({ tracked: undefined }));
    expect(report.refusals).toEqual([
      "bill-of-materials-out-of-date: docs/legal/bill-of-materials.md: does not exist, and this run would generate it",
    ]);
  });
});

// This repository declares no `.gitattributes`, so a clone with `core.autocrlf`
// set materialises a tracked LF document with a carriage return on every line.
// A byte comparison called that a hand edit and refused a document nobody had
// touched, which was measured on a fresh checkout of the commit that introduced
// the check.
describe("a working tree that carries the document with carriage returns", () => {
  const clean = input({ tracked: undefined });
  const generated = renderDocument(clean, billOfMaterials(clean));
  const asWindowsCheckedItOut = generated.replaceAll("\n", "\r\n");

  test("passes, because the difference is the checkout and not the dependencies", () => {
    const { report } = checkBillOfMaterials(input({ tracked: asWindowsCheckedItOut }));
    expect(report.refusals).toEqual([]);
  });

  // The leg that matters. Folding the carriage returns must not fold away a real
  // drift that happens to arrive on a machine where the setting is on, which is
  // the same machine the fix above was written for.
  test("still refuses a real edit that arrives with those carriage returns", () => {
    const edited = asWindowsCheckedItOut.replace("| vitest | 4.1.10 | MIT |", "| vitest | 4.1.11 | MIT |");
    expect(edited).not.toBe(asWindowsCheckedItOut);
    const { report } = checkBillOfMaterials(input({ tracked: edited }));
    expect(report.refusals).toEqual([
      "bill-of-materials-out-of-date: docs/legal/bill-of-materials.md: differs from what this run generates, so the tracked copy was edited by hand or the lock file moved under it",
    ]);
  });
});
