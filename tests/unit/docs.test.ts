// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the document rules. Each rule carries a fixture that is a near
// miss rather than an obvious violation: the mistake somebody actually makes, one
// character away from the correct version, which is also here and has to pass. A
// fixture built out of an obvious violation proves the pattern matches itself and
// nothing about the mistake the rule exists for.
//
// Each rule is also run against its own near miss with that rule switched off, and
// the fixture then has to pass. That is what says the refusal came from the rule
// rather than from somewhere else in the run, which is the same thing as deleting
// the rule and watching this go green.

import { describe, expect, test } from "vitest";
import {
  anchorFor,
  anchorsIn,
  checkDocuments,
  plannedPaths,
  resolveRelative,
  ruleIds,
  type Context,
  type TextFile,
} from "../../tools/src/checks/docs.ts";
import { passed } from "../../tools/src/checks/report.ts";

type Tree = Omit<Context, "documents">;

function tree(paths: readonly string[], produced: readonly string[] = []): Tree {
  const directories = new Set(
    paths.flatMap((path) => {
      const parts = path.split("/");
      return parts.slice(0, -1).map((_, index) => `${parts.slice(0, index + 1).join("/")}/`);
    }),
  );
  return {
    trackedPaths: new Set(paths),
    trackedDirectories: directories,
    producedPaths: new Set(produced),
  };
}

const standard = tree(
  [
    "CONTRIBUTING.md",
    "docs/decisions/0001-means.md",
    "docs/decisions/0002-upstream-relationship.md",
    "tools/src/checks/docs.ts",
    "LICENSE",
  ],
  ["coverage/coverage-summary.json"],
);

// A record that satisfies the convention, so a fixture only has to say how it
// departs from one.
function record(number: string, title: string, body = ""): string {
  return [`# ${number}. ${title}`, "", "Status: accepted.", `Issue: #1.`, "", body].join("\n");
}

type Row = {
  id: string;
  // What the mistake looks like when somebody makes it.
  nearMiss: readonly TextFile[];
  // The same passage written correctly. Without this the fixture proves the rule
  // fires somewhere in the neighbourhood and not that it separates the two.
  corrected: readonly TextFile[];
  // The tree the fixture is judged against.
  against: Tree;
  // The refusal in full, so a message that stopped naming the rule or stopped
  // naming the line is caught here rather than read past.
  refusals: readonly string[];
  // Why this is the mistake somebody will actually make.
  why: string;
};

const rows: readonly Row[] = [
  {
    id: "named-path-resolves",
    why: "naming a module in the singular, which is what it is called in the sentence around it and not what it is called in the tree",
    against: standard,
    nearMiss: [{ path: "docs/quality/route.md", text: "The rules are in `tools/src/checks/doc.ts`.\n" }],
    corrected: [{ path: "docs/quality/route.md", text: "The rules are in `tools/src/checks/docs.ts`.\n" }],
    refusals: [
      "named-path-resolves: docs/quality/route.md:1: names `tools/src/checks/doc.ts`, which is neither a tracked path, a path this tree's runs write, nor a planned path the register in tools/src/checks/docs.ts declares",
    ],
  },
  {
    id: "link-resolves",
    why: "linking a decision record by a title that reads naturally in the plural, when the file is singular",
    against: standard,
    nearMiss: [
      {
        path: "docs/quality/route.md",
        text: "See [the record](../decisions/0002-upstream-relationships.md).\n",
      },
    ],
    corrected: [
      {
        path: "docs/quality/route.md",
        text: "See [the record](../decisions/0002-upstream-relationship.md).\n",
      },
    ],
    refusals: [
      "link-resolves: docs/quality/route.md:1: links to ../decisions/0002-upstream-relationships.md, and docs/decisions/0002-upstream-relationships.md is not in this tree",
    ],
  },
  {
    id: "record-follows-the-convention",
    why: "allocating the next number in the file name and leaving the heading on the number of the record it was copied from",
    against: standard,
    nearMiss: [{ path: "docs/decisions/0007-storage.md", text: record("0006", "The storage model") }],
    corrected: [{ path: "docs/decisions/0007-storage.md", text: record("0007", "The storage model") }],
    refusals: [
      "record-follows-the-convention: docs/decisions/0007-storage.md:1: is numbered 0007 by its file name and 0006 by its heading, so a reader looking for either one finds a record claiming to be the other",
    ],
  },
  {
    id: "record-number-is-unique",
    why: "two efforts allocating the same next number from the same base, which is invisible until both have landed",
    against: standard,
    nearMiss: [
      { path: "docs/decisions/0007-storage.md", text: record("0007", "The storage model") },
      { path: "docs/decisions/0007-retention.md", text: record("0007", "Retention") },
    ],
    corrected: [
      { path: "docs/decisions/0007-storage.md", text: record("0007", "The storage model") },
      { path: "docs/decisions/0013-retention.md", text: record("0013", "Retention") },
    ],
    refusals: [
      "record-number-is-unique: docs/decisions/0007-retention.md and docs/decisions/0007-storage.md both claim number 0007",
    ],
  },
  {
    id: "planned-path-has-arrived",
    why: "the planned path landing, which is the moment the register stops describing the tree and nobody is looking at the register",
    against: tree(["overlay/first-change.patch", "docs/decisions/0001-means.md"]),
    nearMiss: [{ path: "docs/architecture.md", text: "Changes live under `overlay/`.\n" }],
    // Nothing about the document is wrong here. What retires the refusal is the
    // register entry going, so the corrected fixture is the same document judged
    // against a tree where the planned path has not arrived.
    corrected: [{ path: "docs/architecture.md", text: "Changes live under `overlay/`.\n" }],
    refusals: [
      "planned-path-has-arrived: the register still declares `overlay/` absent and the tree now carries it, so the entry is stale. What retires it was the first change that lands one, which is what issues #4 and #10 wait for",
    ],
  },
];

describe.each(rows)("$id", (row) => {
  test(`refuses the near miss: ${row.why}`, () => {
    const report = checkDocuments(row.nearMiss, row.against);
    expect(report.refusals).toEqual(row.refusals);
  });

  test("passes the corrected fixture", () => {
    const against = row.id === "planned-path-has-arrived" ? standard : row.against;
    expect(passed(checkDocuments(row.corrected, against))).toBe(true);
  });

  // Deleting the rule and watching this go green, written as a run with the rule
  // switched off.
  test("passes the near miss with the rule switched off", () => {
    const enabled = new Set(ruleIds.filter((id) => id !== row.id));
    const report = checkDocuments(row.nearMiss, row.against, enabled);
    expect(report.refusals).toEqual([]);
    expect(report.lines.at(-1)).toBe(
      `NOT run on this run, so this run says nothing about them: ${row.id}.`,
    );
  });
});

describe("every rule has a proof", () => {
  test("no rule in the table is unproved", () => {
    expect([...rows].map((row) => row.id).sort()).toEqual([...ruleIds].sort());
  });
});

describe("named-path-resolves", () => {
  test("takes a path a run writes rather than one git tracks", () => {
    const files = [{ path: "CONTRIBUTING.md", text: "It writes `coverage/coverage-summary.json`.\n" }];
    expect(passed(checkDocuments(files, standard))).toBe(true);
  });

  test("takes a directory through the files under it, and refuses one with nothing under it", () => {
    expect(passed(checkDocuments([{ path: "a.md", text: "`tools/src/`" }], standard))).toBe(true);
    expect(passed(checkDocuments([{ path: "a.md", text: "`tools/gone/`" }], standard))).toBe(false);
  });

  // The record that states the naming convention has to be able to state it.
  test("leaves a placeholder alone", () => {
    const files = [{ path: "a.md", text: "A record is `docs/decisions/NNNN-slug.md`, and a run is `tools/<name>/x.ts`." }];
    expect(passed(checkDocuments(files, standard))).toBe(true);
  });

  test("leaves a planned path alone while it is still absent", () => {
    expect(plannedPaths.has("overlay/")).toBe(true);
    expect(passed(checkDocuments([{ path: "a.md", text: "`overlay/`" }], standard))).toBe(true);
  });

  test("judges Markdown and nothing else", () => {
    expect(passed(checkDocuments([{ path: "tools/src/x.ts", text: "// `tools/gone.ts`" }], standard))).toBe(true);
  });
});

describe("link-resolves", () => {
  test("leaves a link to another host alone, and says so", () => {
    const files = [{ path: "a.md", text: "[upstream](https://example.invalid/a) and [mail](mailto:someone@example.invalid)" }];
    const report = checkDocuments(files, standard);
    expect(passed(report)).toBe(true);
    expect(report.lines.join("\n")).toContain("A link to another host is not fetched");
  });

  test("resolves an anchor inside the document that carries it", () => {
    const text = "## The coverage floor\n\nSee [above](#the-coverage-floor).\n";
    expect(passed(checkDocuments([{ path: "a.md", text }], standard))).toBe(true);
  });

  test("refuses an anchor no heading carries", () => {
    const text = "## The coverage floor\n\nSee [above](#the-coverage-floors).\n";
    const report = checkDocuments([{ path: "a.md", text }], standard);
    expect(report.refusals).toEqual([
      "link-resolves: a.md:3: links to #the-coverage-floors, and no heading in a.md carries the anchor #the-coverage-floors",
    ]);
  });

  test("resolves an anchor into another document", () => {
    const files = [
      { path: "docs/a.md", text: "See [there](b.md#the-second-part).\n" },
      { path: "docs/b.md", text: "## The second part\n" },
    ];
    expect(passed(checkDocuments(files, tree(["docs/a.md", "docs/b.md"])))).toBe(true);
  });

  // A tracked file that is not a document is not read, so nothing here can say
  // which anchors it carries. Refusing is the direction that fails closed.
  test("refuses an anchor into a target this run did not read", () => {
    const files = [{ path: "a.md", text: "See [the licence](LICENSE#section-3).\n" }];
    const report = checkDocuments(files, standard);
    expect(report.refusals).toEqual([
      "link-resolves: a.md:1: links to LICENSE#section-3, and no heading in LICENSE carries the anchor #section-3",
    ]);
  });

  test("takes a link to a directory", () => {
    expect(passed(checkDocuments([{ path: "a.md", text: "[the records](docs/decisions/)" }], standard))).toBe(true);
  });

  test("takes a link written with a title after the target", () => {
    const files = [{ path: "a.md", text: '[the licence](LICENSE "the terms")' }];
    expect(passed(checkDocuments(files, standard))).toBe(true);
  });
});

describe("record-follows-the-convention", () => {
  test("refuses a file name that is not four digits and a hyphenated slug", () => {
    const files = [{ path: "docs/decisions/storage-model.md", text: record("0007", "The storage model") }];
    expect(checkDocuments(files, standard).refusals).toEqual([
      "record-follows-the-convention: docs/decisions/storage-model.md:1: is named against the convention record 0001 states: four digits, a hyphen, then lower case words joined by hyphens",
    ]);
  });

  test("refuses a record whose first line is not the numbered heading", () => {
    const files = [{ path: "docs/decisions/0007-storage.md", text: "# The storage model\n\nStatus: accepted.\nIssue: #1.\n" }];
    expect(checkDocuments(files, standard).refusals).toEqual([
      'record-follows-the-convention: docs/decisions/0007-storage.md:1: opens with "# The storage model" rather than a level-one heading reading the four-digit number, a full stop, and a sentence naming the decision',
    ]);
  });

  test("refuses a status line with no full stop on the end", () => {
    const text = "# 0007. The storage model\n\nStatus: accepted\nIssue: #1.\n";
    expect(checkDocuments([{ path: "docs/decisions/0007-storage.md", text }], standard).refusals).toEqual([
      "record-follows-the-convention: docs/decisions/0007-storage.md:3: does not carry `Status:` as the first line under its heading, ending in a full stop",
    ]);
  });

  test("refuses a record with no header lines at all, and points at its first line", () => {
    const text = "# 0007. The storage model\n";
    expect(checkDocuments([{ path: "docs/decisions/0007-storage.md", text }], standard).refusals).toEqual([
      "record-follows-the-convention: docs/decisions/0007-storage.md:1: does not carry `Status:` as the first line under its heading, ending in a full stop",
      "record-follows-the-convention: docs/decisions/0007-storage.md:1: does not carry `Issue:` as the second line under its heading, ending in a full stop",
    ]);
  });

  // A checkout on Windows leaves a carriage return on the end of every line. A
  // rule that compares a whole line has to survive it, or it is green on one
  // platform and red on another.
  test("survives a document with carriage returns in it", () => {
    const text = record("0007", "The storage model").replaceAll("\n", "\r\n");
    expect(passed(checkDocuments([{ path: "docs/decisions/0007-storage.md", text }], standard))).toBe(true);
  });
});

describe("anchorFor", () => {
  test("lower cases, drops punctuation and joins words with hyphens", () => {
    expect(anchorFor("The coverage floor")).toBe("the-coverage-floor");
    expect(anchorFor("Why `check:bom` exists, and what it does not reach")).toBe(
      "why-checkbom-exists-and-what-it-does-not-reach",
    );
  });

  test("keeps letters outside the ASCII range", () => {
    expect(anchorFor("Größe")).toBe("größe");
  });
});

describe("anchorsIn", () => {
  test("reads every heading level", () => {
    expect([...anchorsIn("# One\n### Three\n")]).toEqual(["one", "three"]);
  });

  test("gives a repeated heading the suffix the renderer gives it", () => {
    expect([...anchorsIn("## Bounds\n## Bounds\n## Bounds\n")]).toEqual(["bounds", "bounds-1", "bounds-2"]);
  });

  test("reads no heading out of a line that only starts with a hash", () => {
    expect([...anchorsIn("#not-a-heading\n")]).toEqual([]);
  });
});

describe("resolveRelative", () => {
  test("resolves against the directory the document sits in", () => {
    expect(resolveRelative("docs/quality/a.md", "b.md")).toBe("docs/quality/b.md");
    expect(resolveRelative("docs/quality/a.md", "../decisions/0001-means.md")).toBe("docs/decisions/0001-means.md");
    expect(resolveRelative("docs/quality/a.md", "../../LICENSE")).toBe("LICENSE");
    expect(resolveRelative("docs/a.md", "./b.md")).toBe("docs/b.md");
  });

  test("keeps the trailing slash that makes a target a directory", () => {
    expect(resolveRelative("README.md", "docs/decisions/")).toBe("docs/decisions/");
  });
});

describe("the report", () => {
  test("says what it examined before it says what it refused", () => {
    const files = [
      { path: "docs/decisions/0001-means.md", text: record("0001", "The means") },
      { path: "CONTRIBUTING.md", text: "" },
    ];
    const report = checkDocuments(files, standard);
    expect(report.lines[0]).toBe("examined 2 tracked document(s), 1 of them decision records, against 5 of 5 rule(s).");
  });

  test("prints the planned-path register with the reason each entry is there", () => {
    const report = checkDocuments([], standard);
    expect(report.lines.at(-1)).toContain("the planned-path register declares 1 path(s)");
    expect(report.lines.at(-1)).toContain("fixed by record 0002 before any such change exists");
  });

  test("names every rule it ran, with what it prevents and what it does not reach", () => {
    const printed = checkDocuments([], standard).lines.join("\n");
    for (const id of ruleIds) expect(printed).toContain(`${id} prevents `);
    expect(printed.match(/It reaches /g)).toHaveLength(ruleIds.length);
  });

  test("names every stale reference rather than the first", () => {
    const files = [{ path: "a.md", text: "`x/one.ts` and `x/two.ts` and [three](x/three.ts)" }];
    expect(checkDocuments(files, standard).refusals).toHaveLength(3);
  });
});
