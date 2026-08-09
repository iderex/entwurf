// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the third-party notices. Each rule carries a fixture that is a
// near miss rather than an obvious violation: the package somebody actually
// publishes, one file or one field away from the correct one, which is also here
// and has to pass.
//
// Each rule is also run against its own fixture with the rule switched off, and
// the fixture then has to pass. That is what says the refusal came from the rule
// rather than from somewhere else in the run, which is the same thing as deleting
// the rule and watching this go green.

import { describe, expect, test } from "vitest";
import {
  checkNotices,
  headingFor,
  notices,
  renderDocument,
  rules,
  ruleIds,
  verbatim,
  type Input,
  type LicenceText,
} from "../../tools/src/checks/notices.ts";
import { billOfMaterials, type Row } from "../../tools/src/checks/bill-of-materials.ts";
import { passed } from "../../tools/src/checks/report.ts";

const mit = `MIT License

Copyright (c) 2026 Somebody

Permission is hereby granted, free of charge, to any person obtaining a copy.
`;

// The rows are derived rather than written, so a fixture here cannot disagree with
// the shape the bill of materials actually produces. A row hand-written in this
// file would go stale the first time that derivation changed a field.
function rowsFor(
  packages: readonly { name: string; version: string; os?: string[]; cpu?: string[]; declared?: string }[],
): Row[] {
  return billOfMaterials({
    lockPath: "pnpm-lock.yaml",
    packages: packages.map(({ name, version, os = [], cpu = [] }) => ({ name, version, os, cpu })),
    manifests: packages
      .filter((entry) => entry.declared !== undefined)
      .map((entry) => ({
        name: entry.name,
        version: entry.version,
        declared: entry.declared,
        readFrom: `node_modules/.pnpm/${entry.name}@${entry.version}/node_modules/${entry.name}/package.json`,
      })),
    ignoredStoreEntries: 0,
    lockFilesInTree: ["pnpm-lock.yaml"],
    tracked: undefined,
    documentPath: "docs/legal/bill-of-materials.md",
  });
}

function texts(entries: Record<string, LicenceText[]>): Map<string, LicenceText[]> {
  return new Map(Object.entries(entries));
}

function input(over: Partial<Input> = {}): Input {
  const base: Input = {
    rows: rowsFor([{ name: "vitest", version: "4.1.10", declared: "MIT" }]),
    texts: texts({ "vitest@4.1.10": [{ fileName: "LICENSE", text: mit }] }),
    billPath: "docs/legal/bill-of-materials.md",
    documentPath: "docs/legal/third-party-notices.md",
    tracked: undefined,
  };
  const merged = { ...base, ...over };
  // The drift rule compares against what this very input generates, so a fixture
  // that wants to be clean has to carry that page rather than a copy written here,
  // which would go stale the first time the renderer changed a word.
  if (over.tracked === undefined && !("tracked" in over)) {
    merged.tracked = renderDocument(merged, notices(merged));
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

const cases: readonly Case[] = [
  {
    id: "dependency-whose-terms-were-never-established",
    why:
      "publishing a manifest whose licence field points at a file, which is legal npm, names no terms, and arrives on this page whether or not the bill of materials check was run first",
    nearMiss: input({
      rows: rowsFor([{ name: "magicast", version: "0.5.4", declared: "SEE LICENSE IN LICENSE.md" }]),
      texts: texts({ "magicast@0.5.4": [{ fileName: "LICENSE.md", text: mit }] }),
    }),
    corrected: input({
      rows: rowsFor([{ name: "magicast", version: "0.5.4", declared: "MIT" }]),
      texts: texts({ "magicast@0.5.4": [{ fileName: "LICENSE.md", text: mit }] }),
    }),
    refusal:
      'dependency-whose-terms-were-never-established: magicast@0.5.4: is named by docs/legal/bill-of-materials.md and its manifest declares "SEE LICENSE IN LICENSE.md", which points at a file rather than naming terms, so there is nothing here that could be published as its notice',
  },
  {
    id: "licence-file-that-carries-no-text",
    why:
      "a package shipping a LICENSE file that was created and never filled in, which every route that asks whether the file exists reports as a notice that is present",
    nearMiss: input({
      texts: texts({ "vitest@4.1.10": [{ fileName: "LICENSE", text: "\n" }] }),
    }),
    corrected: input(),
    refusal:
      "licence-file-that-carries-no-text: vitest@4.1.10: publishes `LICENSE` with nothing in it but whitespace, so carrying it would put an empty block on the page under a heading that says a notice was carried",
  },
  {
    id: "third-party-notices-out-of-date",
    why:
      "bumping a dependency and correcting the version in the generated page by hand, which is one character and leaves every other section right",
    nearMiss: input({
      tracked: (() => {
        const older = input({ rows: rowsFor([{ name: "vitest", version: "4.1.9", declared: "MIT" }]), texts: texts({ "vitest@4.1.9": [{ fileName: "LICENSE", text: mit }] }), tracked: undefined });
        return renderDocument(older, notices(older));
      })(),
    }),
    corrected: input(),
    refusal:
      "third-party-notices-out-of-date: docs/legal/third-party-notices.md: differs from what this run generates, so the tracked copy was edited by hand or the dependency set moved under it",
  },
];

describe("the rule table", () => {
  test("carries the three rules this check names, and no rule twice", () => {
    expect([...ruleIds].sort()).toEqual([
      "dependency-whose-terms-were-never-established",
      "licence-file-that-carries-no-text",
      "third-party-notices-out-of-date",
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
    const { report } = checkNotices(entry.nearMiss);
    expect(report.refusals).toEqual([entry.refusal]);
  });

  test("passes the same fixture with this rule not run", () => {
    const { report } = checkNotices(entry.nearMiss, new Set(ruleIds.filter((id) => id !== entry.id)));
    expect(passed(report)).toBe(true);
    expect(report.lines.at(-1)).toBe(`NOT run on this run, so this run says nothing about them: ${entry.id}.`);
  });

  test("passes the corrected input", () => {
    const { report } = checkNotices(entry.corrected);
    expect(report.refusals).toEqual([]);
  });
});

describe("every package in the set is named on the page", () => {
  // The property the page exists for. It is a test rather than a rule because the
  // page is generated in full on every run, so no input can produce one that has
  // dropped a package: only a change to the renderer can, and this is what refuses
  // that change.
  const mixed = input({
    rows: rowsFor([
      { name: "carried", version: "1.0.0", declared: "MIT" },
      { name: "publishes-nothing", version: "1.0.0", declared: "MIT" },
      { name: "other-platform", version: "1.0.0", declared: "MIT", os: ["darwin"] },
    ]),
    texts: texts({ "carried@1.0.0": [{ fileName: "LICENSE", text: mit }] }),
  });

  test.each([
    ["carried", "1.0.0"],
    ["publishes-nothing", "1.0.0"],
    ["other-platform", "1.0.0"],
  ])("names %s@%s under a heading of its own", (name, version) => {
    const { document } = checkNotices(mixed);
    expect(document).toContain(headingFor({ name, version }));
  });

  test("a package that publishes no text says so where its notice would be", () => {
    const { document } = checkNotices(mixed);
    expect(document).toContain(
      "NO TEXT PUBLISHED: it declares MIT and publishes no file naming those terms, so there is no notice here to carry and the obligation that licence puts on a redistributor cannot be met from what the package ships",
    );
  });

  // A different state from the one above and kept apart from it. Nothing was read
  // for this package on this route at all, which is a fact about the machine
  // generating the page rather than about what the package ships.
  test("a package restricted to another platform says nothing was read rather than nothing published", () => {
    const { document } = checkNotices(mixed);
    expect(document).toContain(
      "NOT READ ON THIS ROUTE: the lock file restricts it to os darwin, and no route here reads a package built for a platform other than the one generating this",
    );
  });

  test("counts both states above the notices rather than only inside them", () => {
    const { document } = checkNotices(mixed);
    expect(document).toContain("1 package(s) declare a licence and publish no file naming its terms.");
    expect(document).toContain("27 package(s) are restricted".replace("27", "1"));
    expect(document).toContain("3 package(s). 1 carry a licence text here, across 1 published file(s).");
  });

  test("names what it does not cover before it names anything it does", () => {
    const { document } = checkNotices(mixed);
    expect(document.indexOf("## What this does not cover")).toBeLessThan(document.indexOf("## The notices"));
  });
});

describe("what reaches the page from a licence file", () => {
  test("the text is reproduced with nothing added inside it", () => {
    const { document } = checkNotices(input());
    expect(document).toContain(mit);
  });

  test("a package publishing two files carries both, named", () => {
    const { document } = checkNotices(
      input({
        texts: texts({
          "vitest@4.1.10": [
            { fileName: "LICENSE.md", text: mit },
            { fileName: "LICENSE.txt", text: "Second file.\n" },
          ],
        }),
      }),
    );
    expect(document).toContain("2 files below, as the package publishes them.");
    expect(document).toContain("From `LICENSE.md` in the package:");
    expect(document).toContain("From `LICENSE.txt` in the package:");
  });

  // The store walks in whatever order the filesystem hands back. Two files sorted
  // by name put the same bytes on the page on every machine.
  test("two files are ordered by name rather than by the order they arrived in", () => {
    const [entry] = notices(
      input({
        texts: texts({
          "vitest@4.1.10": [
            { fileName: "LICENSE.txt", text: "second\n" },
            { fileName: "LICENSE.md", text: "first\n" },
          ],
        }),
        tracked: undefined,
      }),
    );
    expect(entry?.texts.map((text) => text.fileName)).toEqual(["LICENSE.md", "LICENSE.txt"]);
  });
});

// The two departures the page declares, and the proof that there are no others.
describe("verbatim", () => {
  test("folds a carriage return out, because git stores this page under one line ending", () => {
    expect(verbatim("a\r\nb\r\n")).toBe("a\nb\n");
  });

  test("folds a lone carriage return too, which an old file can still carry", () => {
    expect(verbatim("a\rb\r")).toBe("a\nb\n");
  });

  // Three of the files in the current set end without one, and the closing fence
  // has to land on a line of its own rather than on the last line of the licence.
  test("adds a final newline where the file ends without one", () => {
    expect(verbatim("no trailing newline")).toBe("no trailing newline\n");
  });

  test("adds nothing where the file already ends with one", () => {
    expect(verbatim("ends properly\n")).toBe("ends properly\n");
  });

  test("changes nothing else, including the blank lines inside", () => {
    const text = "Copyright (c) 2026 Someone\n\n  indented\ttabbed\n\n";
    expect(verbatim(text)).toBe(text);
  });
});

// Nothing derives these rows today. They are here because a page that says a
// notice was carried has to be unreadable as one in every state, including the
// states where the reason or the licence went missing, and a blank where either
// belongs reads as an answer rather than as an absence.
describe("a row that arrives with a field missing", () => {
  function pageFor(row: Row): string {
    const only = input({ rows: [row], texts: texts({}), tracked: undefined });
    return renderDocument(only, notices(only));
  }

  test("an undetermined row with no reason still says the terms were never established", () => {
    const page = pageFor({ name: "odd", version: "1.0.0", state: "undetermined", licence: undefined, why: undefined, readFrom: undefined });
    expect(page).toContain("TERMS NEVER ESTABLISHED: nothing was determined about its licence");
  });

  test("an unread row with no reason still says nothing was read on this route", () => {
    const page = pageFor({ name: "odd", version: "1.0.0", state: "not-read-on-this-route", licence: undefined, why: undefined, readFrom: undefined });
    expect(page).toContain("NOT READ ON THIS ROUTE: it was not read on this route");
  });

  test("a determined row with no licence still names the gap rather than leaving it blank", () => {
    const page = pageFor({ name: "odd", version: "1.0.0", state: "determined", licence: undefined, why: undefined, readFrom: undefined });
    expect(page).toContain("NO TEXT PUBLISHED: it declares a licence and publishes no file naming those terms");
  });

  test("the refusal for an undetermined row with no reason still names one", () => {
    const { report } = checkNotices(
      input({
        rows: [{ name: "odd", version: "1.0.0", state: "undetermined", licence: undefined, why: undefined, readFrom: undefined }],
        texts: texts({}),
      }),
    );
    expect(report.refusals).toEqual([
      "dependency-whose-terms-were-never-established: odd@1.0.0: is named by docs/legal/bill-of-materials.md and nothing was determined about its licence, so there is nothing here that could be published as its notice",
    ]);
  });

  // A carried notice whose licence identifier went missing. The text is the thing
  // that matters and it is still reproduced; the sentence above it simply has
  // nothing to name.
  test("a carried notice with no licence identifier still carries the text", () => {
    const page = renderDocument(input({ rows: [], texts: texts({}), tracked: undefined }), [
      { name: "odd", version: "1.0.0", licence: undefined, state: "carried", texts: [{ fileName: "LICENSE", text: mit }], why: undefined },
    ]);
    expect(page).toContain("Declared as  in the package's own package.json.");
    expect(page).toContain(mit);
  });

  test("a state that carries no text and no reason prints the label and nothing after it", () => {
    const page = renderDocument(input({ rows: [], texts: texts({}), tracked: undefined }), [
      { name: "odd", version: "1.0.0", licence: "MIT", state: "not-published", texts: [], why: undefined },
    ]);
    expect(page).toContain("NO TEXT PUBLISHED: ");
  });
});

describe("what the run says about itself", () => {
  test("counts the packages and the rules it ran", () => {
    const { report } = checkNotices(input());
    expect(report.lines[0]).toBe(
      "examined 1 package(s) named by docs/legal/bill-of-materials.md, under 3 of 3 rule(s).",
    );
  });

  test("prints what each rule prevents and what it does not reach", () => {
    const { report } = checkNotices(input());
    for (const rule of rules) {
      expect(report.lines).toContain(`${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`);
    }
  });

  test("says the set is one ecosystem, so a green run is not read as covering upstream's", () => {
    const { report } = checkNotices(input());
    expect(report.lines).toContain(
      "the set is one lock file and therefore one ecosystem. The upstream design tool's own dependency set is reached by none of it, so no run here is evidence about it.",
    );
  });

  test("a clean run does not print the disabled line at all", () => {
    const { report } = checkNotices(input());
    expect(report.lines.some((line) => line.startsWith("NOT run"))).toBe(false);
  });

  test("names every offending package rather than the first", () => {
    const { report } = checkNotices(
      input({
        rows: rowsFor([
          { name: "a", version: "1.0.0", declared: "UNLICENSED" },
          { name: "b", version: "1.0.0", declared: "unknown" },
        ]),
        texts: texts({}),
      }),
    );
    expect(report.refusals).toHaveLength(2);
  });
});

describe("the tree carrying no page at all", () => {
  // The first run on a tree that has never generated one has to refuse rather than
  // pass, or the check would be green on the state it exists to end.
  test("is refused, naming the page that would be generated", () => {
    const { report } = checkNotices(input({ tracked: undefined }));
    expect(report.refusals).toEqual([
      "third-party-notices-out-of-date: docs/legal/third-party-notices.md: does not exist, and this run would generate it",
    ]);
  });
});

// This repository declares no `.gitattributes`, so a clone with `core.autocrlf`
// set materialises a tracked LF page with a carriage return on every line. A byte
// comparison called that a hand edit and refused a document nobody had touched,
// which was measured on the bill of materials before this page existed.
describe("a working tree that carries the page with carriage returns", () => {
  const clean = input({ tracked: undefined });
  const generated = renderDocument(clean, notices(clean));
  const asWindowsCheckedItOut = generated.replaceAll("\n", "\r\n");

  test("passes, because the difference is the checkout and not the dependencies", () => {
    const { report } = checkNotices(input({ tracked: asWindowsCheckedItOut }));
    expect(report.refusals).toEqual([]);
  });

  // The leg that matters. Folding the carriage returns must not fold away a real
  // drift that happens to arrive on a machine where the setting is on.
  test("still refuses a real edit that arrives with those carriage returns", () => {
    const edited = asWindowsCheckedItOut.replace("Copyright (c) 2026 Somebody", "Copyright (c) 2026 Somebody Else");
    expect(edited).not.toBe(asWindowsCheckedItOut);
    const { report } = checkNotices(input({ tracked: edited }));
    expect(report.refusals).toEqual([
      "third-party-notices-out-of-date: docs/legal/third-party-notices.md: differs from what this run generates, so the tracked copy was edited by hand or the dependency set moved under it",
    ]);
  });
});
