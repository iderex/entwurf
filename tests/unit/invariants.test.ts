// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the invariant table. Each invariant carries a fixture that is a
// near miss rather than an obvious violation: the line somebody actually writes,
// one edit away from the correct one, which is also here and has to pass. A
// fixture built out of an obvious violation proves the pattern matches itself and
// nothing about the mistake the check exists for.
//
// Each invariant is also run against its own fixture with the invariant switched
// off, and the fixture then has to pass. That is what says the refusal came from
// the invariant rather than from somewhere else in the run, which is the same
// thing as deleting the check and watching this go green.
//
// Every fixture is assembled from parts rather than written out. This file is
// tracked, and the check reads every tracked text file, so a token or a home
// directory written here as a literal would be a finding against the file that
// proves the check.

import { describe, expect, test } from "vitest";
import {
  checkInvariants,
  checkNameList,
  checkRunNames,
  checkRunNamesIn,
  declaredCheckNames,
  invariantIds,
  invariants,
  listedCheckNamesIn,
  notCheckNames,
  type Context,
  type TextFile,
} from "../../tools/src/checks/invariants.ts";
import { passed } from "../../tools/src/checks/report.ts";

function assemble(...parts: readonly string[]): string {
  return parts.join("");
}

const context: Context = {
  declaredNames: new Set(["unit-suite", "document-lint", "check:locks", "check:pins"]),
  checkRunNames: new Set(["unit-suite", "document-lint"]),
  // The renamed job in the stability fixture below is listed here on purpose, so
  // that fixture is somebody who did update the page. The rename is then refused
  // for what the new name carries rather than for the page lagging behind it,
  // which is the only way to tell the two rules apart.
  listedCheckNames: new Set(["unit-suite", "document-lint", "unit-suite (node 24.18.1)"]),
};

// A payload of the length the shape requires. On its own it carries no prefix and
// matches nothing.
const tokenPayload = "u9RmT2xK4bV7nQ1sZ6yA3wL8cE5dJ0fH2gN4";
const leakedToken = assemble("gh", "p_", tokenPayload);

// A checkout path under a home directory, on the platform this tree is most often
// written on.
const homePath = assemble("C:", "\\", "Users", "\\", "dana", "\\", "Documents", "\\", "GitHub", "\\", "entwurf");

type Row = {
  id: string;
  // What the mistake looks like when somebody makes it.
  nearMiss: TextFile;
  // The same passage written correctly. Without this the fixture proves the check
  // fires somewhere in the neighbourhood and not that it separates the two.
  corrected: TextFile;
  // The refusal in full, so a message that stopped naming the invariant or stopped
  // naming the line is caught here rather than read past.
  refusal: string;
  // Why this is the mistake somebody will actually make.
  why: string;
};

const rows: readonly Row[] = [
  {
    id: "no-secret-shaped-value",
    why: "documenting a command by pasting the line that was run, with the credential still in it",
    nearMiss: {
      path: "docs/ops/first-run.md",
      text: [
        "Authenticate the deployment once, with the token made for it:",
        "",
        assemble("    gh auth login --with-token <<< ", leakedToken),
      ].join("\n"),
    },
    corrected: {
      path: "docs/ops/first-run.md",
      text: [
        "Authenticate the deployment once, with the token made for it:",
        "",
        "    gh auth login --with-token <<< ghp_THE_DEPLOYMENT_TOKEN",
      ].join("\n"),
    },
    refusal: "no-secret-shaped-value: docs/ops/first-run.md:3: carries a GitHub token",
  },
  {
    id: "no-developer-machine-path",
    why:
      "pasting one line more of a command's output than the passage needs, where that line carries the checkout it ran in",
    nearMiss: {
      path: "CONTRIBUTING.md",
      text: [
        "    [ERR_PNPM_UNSUPPORTED_ENGINE] Unsupported environment",
        assemble('    Your Node version is incompatible with "', homePath, '".'),
        "    Expected version: 24.18.1",
      ].join("\n"),
    },
    corrected: {
      path: "CONTRIBUTING.md",
      text: [
        "    [ERR_PNPM_UNSUPPORTED_ENGINE] Unsupported environment",
        "    Expected version: 24.18.1",
        "    Got: v24.18.0",
      ].join("\n"),
    },
    refusal: assemble(
      "no-developer-machine-path: CONTRIBUTING.md:2: names ",
      "C:",
      "\\",
      "Users",
      "\\",
      "dana",
      ", which is a path on somebody's own machine",
    ),
  },
  {
    id: "no-unknown-check-name",
    why: "naming a check in the singular when the script that exists is plural",
    nearMiss: {
      path: "docs/checks.md",
      text: "The lock file is judged by `check:lock`, which refuses a resolve that would rewrite it.",
    },
    corrected: {
      path: "docs/checks.md",
      text: "The lock file is judged by `check:locks`, which refuses a resolve that would rewrite it.",
    },
    refusal:
      "no-unknown-check-name: docs/checks.md:1: names `check:lock`, which no workflow declares and package.json does not define",
  },
  {
    id: "no-unpaired-performance-number",
    why:
      "quoting the median because it is the number the profile prints first, in a sentence that reads as complete without the spread",
    nearMiss: {
      path: "docs/performance/page-switch.md",
      text: [
        "On the large corpus size the page switch takes 184 ms at the median,",
        "measured with the harness.",
      ].join("\n"),
    },
    corrected: {
      path: "docs/performance/page-switch.md",
      text: [
        "On the large corpus size the page switch takes 184 ms at the median and",
        "470 ms at the 95th percentile, measured with the harness.",
      ].join("\n"),
    },
    refusal:
      "no-unpaired-performance-number: docs/performance/page-switch.md:1: quotes 184 ms with no 95th percentile beside it in the same paragraph",
  },
  {
    id: "check-name-is-stable",
    why:
      "putting the runtime the job runs under into its name, on the day a second runtime is added, which is the one moment the name reads as incomplete without it",
    nearMiss: {
      path: ".github/workflows/unit-suite.yml",
      text: [
        "name: unit-suite",
        "jobs:",
        "  unit-suite:",
        "    name: unit-suite (node 24.18.1)",
        "    runs-on: ubuntu-latest",
      ].join("\n"),
    },
    corrected: {
      path: ".github/workflows/unit-suite.yml",
      text: [
        "name: unit-suite",
        "jobs:",
        "  unit-suite:",
        "    name: unit-suite",
        "    runs-on: ubuntu-latest",
      ].join("\n"),
    },
    refusal:
      'check-name-is-stable: .github/workflows/unit-suite.yml:4: reports a check run under "unit-suite (node 24.18.1)", which carries a version',
  },
  {
    id: "check-name-is-listed",
    why:
      "adding a second job to a workflow that already has one, where the workflow is already listed and the new check run is not the thing being thought about",
    nearMiss: {
      path: ".github/workflows/document-lint.yml",
      text: [
        "name: document-lint",
        "jobs:",
        "  document-lint:",
        "    runs-on: ubuntu-latest",
        "  document-lint-proof:",
        "    runs-on: ubuntu-latest",
      ].join("\n"),
    },
    corrected: {
      path: ".github/workflows/document-lint.yml",
      text: ["name: document-lint", "jobs:", "  document-lint:", "    runs-on: ubuntu-latest"].join("\n"),
    },
    refusal: `check-name-is-listed: .github/workflows/document-lint.yml:5: reports a check run under "document-lint-proof", which ${checkNameList} gives no entry`,
  },
];

describe("the invariant table", () => {
  test("carries the six invariants this tree names, and no invariant twice", () => {
    expect([...invariantIds].sort()).toEqual([
      "check-name-is-listed",
      "check-name-is-stable",
      "no-developer-machine-path",
      "no-secret-shaped-value",
      "no-unknown-check-name",
      "no-unpaired-performance-number",
    ]);
  });

  test("every invariant says what it prevents and what it does not reach", () => {
    for (const invariant of invariants) {
      expect(invariant.prevents.length, invariant.id).toBeGreaterThan(0);
      expect(invariant.bound.length, invariant.id).toBeGreaterThan(0);
    }
  });

  // An invariant added to the table without a fixture here is one nothing proves,
  // and it would ship looking exactly like the four that are proved.
  test("every invariant in the table has a fixture in this file", () => {
    expect(rows.map((row) => row.id).sort()).toEqual([...invariantIds].sort());
  });
});

describe.each(rows)("$id", (row) => {
  test("refuses the near miss, naming the invariant and the line", () => {
    const report = checkInvariants([row.nearMiss], context);
    expect(report.refusals).toEqual([row.refusal]);
  });

  test("passes the same fixture with this invariant not run", () => {
    const report = checkInvariants(
      [row.nearMiss],
      context,
      new Set(invariantIds.filter((id) => id !== row.id)),
    );
    expect(passed(report)).toBe(true);
    expect(report.lines.at(-1)).toBe(
      `NOT run on this run, so this run says nothing about them: ${row.id}.`,
    );
  });

  test("passes the corrected passage", () => {
    const report = checkInvariants([row.corrected], context);
    expect(report.refusals).toEqual([]);
  });
});

describe("what the run says about itself", () => {
  test("counts the files, the invariants it ran and the names it judged against", () => {
    const report = checkInvariants(rows.map((row) => row.corrected), context);
    expect(report.lines[0]).toBe(
      "examined 6 tracked text file(s) against 6 of 6 invariant(s), judged against 4 declared check name(s).",
    );
  });

  // The required set is the half of this that no run reads, and a run that did
  // not say so would be read as having compared against it.
  test("counts the names the workflows report and the names the list carries, and disclaims the required set", () => {
    const report = checkInvariants([], context);
    expect(report.lines[1]).toBe(
      "the workflows report 2 check run name(s), and the list gives an entry to 3. Which of them the default branch requires is read by no run here.",
    );
  });

  test("prints what each invariant prevents and what it does not reach", () => {
    const report = checkInvariants([], context);
    for (const invariant of invariants) {
      expect(report.lines).toContain(
        `${invariant.id} prevents ${invariant.prevents}. It reaches ${invariant.bound}.`,
      );
    }
  });

  // A run that examined part of the set has to be unreadable as one that examined
  // the whole of it, which is the only reason the disabled set is printed at all.
  test("says nothing about the invariants it did not run", () => {
    const report = checkInvariants([], context, new Set(["no-secret-shaped-value"]));
    expect(report.lines[0]).toMatch(/against 1 of 6 invariant\(s\)/);
    expect(report.lines.at(-1)).toMatch(/^NOT run on this run/);
  });

  test("a clean run does not print the disabled line at all", () => {
    const report = checkInvariants([], context);
    expect(report.lines.some((line) => line.startsWith("NOT run"))).toBe(false);
  });

  test("names every offending line rather than the first", () => {
    const report = checkInvariants(rows.map((row) => row.nearMiss), context);
    expect(report.refusals).toHaveLength(rows.length);
  });
});

describe("the register of spans that are not check names", () => {
  test("every entry carries its reason, and is a span the check would otherwise refuse", () => {
    for (const [span, reason] of notCheckNames) {
      expect(reason.length, span).toBeGreaterThan(0);

      const excused = checkInvariants([{ path: "docs/x.md", text: assemble("`", span, "`") }], context);
      expect(excused.refusals, span).toEqual([]);

      // The same span with one character added is the same shape and is not in the
      // register, so it has to be refused. An entry that failed this would be
      // excusing something the check was never going to judge.
      const neighbour = assemble("`", span, "x`");
      const refused = checkInvariants([{ path: "docs/x.md", text: neighbour }], context);
      expect(refused.refusals, span).toHaveLength(1);
    }
  });
});

describe("what each invariant declines to judge", () => {
  test("the check-name and performance invariants judge Markdown and leave source alone", () => {
    const asSource = rows.map((row) => ({ ...row.nearMiss, path: "tools/src/example.ts" }));
    const report = checkInvariants(asSource, context);
    expect(report.refusals.map((refusal) => refusal.split(":")[0]).sort()).toEqual([
      "no-developer-machine-path",
      "no-secret-shaped-value",
    ]);
  });

  // The lock file carries base64 integrity hashes on every line and the manifest
  // pins the package manager by a sha512. A rule about randomness would refuse
  // both, which is why the shapes are prefixed rather than entropic.
  test("a long base64 payload with no credential prefix is not a secret", () => {
    const integrity = assemble(
      "  resolution: {integrity: sha512-",
      "9a6f330a95b66446ea088faf1521405a8a01f07fde7124cc9958dfed52d4bb43",
      "}",
    );
    const report = checkInvariants([{ path: "pnpm-lock.yaml", text: integrity }], context);
    expect(passed(report)).toBe(true);
  });

  // A path under a drive root or under /opt is outside the shape, and the bound
  // says so. This is here so the sentence in the table is measured rather than
  // trusted.
  test("an absolute path that is not under a home directory is not reached", () => {
    const elsewhere = assemble("Run it from ", "/opt", "/entwurf or from ", "D:", "\\", "builds", "\\", "entwurf.");
    const report = checkInvariants([{ path: "docs/ops/deploy.md", text: elsewhere }], context);
    expect(passed(report)).toBe(true);
  });

  // A bare word in this tree's prose is more often a tool or an option than a
  // check, so the shape needs a hyphen or a colon before anything is judged.
  test("a backticked word with no separator is not read as a check name", () => {
    const report = checkInvariants([{ path: "docs/x.md", text: "`vitest` and `corepack` are not checks." }], context);
    expect(passed(report)).toBe(true);
  });

  test("a byte count is not a duration", () => {
    const report = checkInvariants([{ path: "docs/x.md", text: "The image is 184 MB." }], context);
    expect(passed(report)).toBe(true);
  });

  // The spread has to be in the same paragraph. A document that states its
  // percentile once in an introduction and then quotes medians for pages is the
  // shape this refuses, and it is the shape that reads as fine.
  test("a spread in a different paragraph does not cover the paragraph quoting the median", () => {
    const document = [
      "Every number below is a median, and the 95th percentile is in the result files.",
      "",
      "The page switch takes 184 ms.",
    ].join("\n");
    const report = checkInvariants([{ path: "docs/x.md", text: document }], context);
    expect(report.refusals).toEqual([
      "no-unpaired-performance-number: docs/x.md:3: quotes 184 ms with no 95th percentile beside it in the same paragraph",
    ]);
  });

  test("p95 counts as the spread as well as the words", () => {
    const report = checkInvariants(
      [{ path: "docs/x.md", text: "The page switch takes 184 ms, and 470 ms at p95." }],
      context,
    );
    expect(passed(report)).toBe(true);
  });
});

describe("declaredCheckNames", () => {
  const workflow: TextFile = {
    path: ".github/workflows/example.yml",
    text: [
      "name: example-suite",
      "on:",
      "  pull_request:",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  example-suite:",
      "    name: example-suite",
      "    runs-on: ubuntu-latest",
      "  second-job:",
      "    runs-on: ubuntu-latest",
    ].join("\n"),
  };

  test("reads the workflow name, the job ids, the job names and the script names", () => {
    const names = declaredCheckNames([workflow], ["check:pins", "test"]);
    expect([...names].sort()).toEqual(["check:pins", "example-suite", "second-job", "test"]);
  });

  // A key two spaces in under `on:` is a trigger, not a job. Reading it as a job
  // id would declare names no check run ever produces, and a document naming one
  // would then pass.
  test("reads a key two spaces in only while inside the jobs block", () => {
    const names = declaredCheckNames([workflow], []);
    expect(names.has("pull_request")).toBe(false);
    expect(names.has("contents")).toBe(false);
  });

  test("a file with no jobs block declares only its own name", () => {
    const bare: TextFile = { path: ".github/workflows/bare.yml", text: "name: bare\non:\n  workflow_dispatch:\n" };
    expect([...declaredCheckNames([bare], [])]).toEqual(["bare"]);
  });

  // Indentation this parser does not read leaves names out, which reddens a
  // document that names them. It never invents a name that would let one pass.
  test("an unread indentation declares fewer names rather than more", () => {
    const odd: TextFile = { path: ".github/workflows/odd.yml", text: "jobs:\n    deep-job:\n      runs-on: x\n" };
    expect([...declaredCheckNames([odd], [])]).toEqual([]);
  });
});

describe("the names a workflow reports a check run under", () => {
  const workflow: TextFile = {
    path: ".github/workflows/example.yml",
    text: [
      "name: example-suite",
      "on:",
      "  pull_request:",
      "jobs:",
      "  named-job:",
      "    name: the name it reports under",
      "    runs-on: ubuntu-latest",
      "  unnamed-job:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: a step, which reports nothing of its own",
      "        run: true",
    ].join("\n"),
  };

  test("takes a job's own name where it has one and its id where it has none", () => {
    expect(checkRunNamesIn(workflow).map((found) => found.name)).toEqual([
      "the name it reports under",
      "unnamed-job",
    ]);
  });

  // A step's name is not a check run name. Reading one would list names the
  // server never reports, and the page would then be refused for carrying them.
  test("reads a name four spaces in and leaves a step's name alone", () => {
    expect(checkRunNames([workflow]).has("a step, which reports nothing of its own")).toBe(false);
  });

  test("points at the line the name is declared on, so a refusal lands on it", () => {
    expect(checkRunNamesIn(workflow)).toEqual([
      { name: "the name it reports under", line: 6 },
      { name: "unnamed-job", line: 8 },
    ]);
  });

  // The workflow name sits above the jobs and produces no check run of its own.
  test("does not report the workflow's own name", () => {
    expect(checkRunNames([workflow]).has("example-suite")).toBe(false);
  });
});

describe("the entries the list carries", () => {
  const list: TextFile = {
    path: checkNameList,
    text: [
      "# The check names",
      "",
      "The suite is `unit-suite`, and this sentence is a mention rather than an entry.",
      "",
      "### `unit-suite`",
      "",
      "Refuses a failing test.",
      "",
      "## `not-an-entry`",
    ].join("\n"),
  };

  test("reads a level-three heading carrying one backticked span, and nothing else on the page", () => {
    expect([...listedCheckNamesIn(list)]).toEqual([["unit-suite", 5]]);
  });

  test("a page that is not there lists nothing, which refuses every name rather than none", () => {
    expect([...listedCheckNamesIn(undefined)]).toEqual([]);

    const workflow: TextFile = {
      path: ".github/workflows/unit-suite.yml",
      text: ["jobs:", "  unit-suite:", "    runs-on: ubuntu-latest"].join("\n"),
    };
    const report = checkInvariants([workflow], { ...context, listedCheckNames: new Set() });
    expect(report.refusals).toEqual([
      `check-name-is-listed: .github/workflows/unit-suite.yml:2: reports a check run under "unit-suite", which ${checkNameList} gives no entry`,
    ]);
  });

  // The other direction. An entry left behind by a rename sends a reader looking
  // for a check run nothing produces, and it reads exactly like a current one.
  test("refuses an entry no job declares", () => {
    const stale: TextFile = {
      path: checkNameList,
      text: ["### `unit-suite`", "", "### `document-lints`"].join("\n"),
    };
    // Two refusals rather than one, for two different reasons: the entry names a
    // check that does not exist, which is what the older invariant is about, and
    // it is an entry on this page in particular, which is what this one is about.
    // A page that lost one of the two would still be refused by the other, and
    // the reader would be told less about why.
    const report = checkInvariants([stale], context);
    expect(report.refusals).toEqual([
      "no-unknown-check-name: docs/quality/check-names.md:3: names `document-lints`, which no workflow declares and package.json does not define",
      `check-name-is-listed: ${checkNameList}:3: lists "document-lints", which no job in a tracked workflow reports a check run under`,
    ]);
  });

  test("passes a page whose entries are the names the workflows report", () => {
    const current: TextFile = {
      path: checkNameList,
      text: ["### `unit-suite`", "", "### `document-lint`"].join("\n"),
    };
    expect(passed(checkInvariants([current], context))).toBe(true);
  });
});

describe("what the check name rules decline to judge", () => {
  // The three shapes are what a name carries from outside itself. A name with a
  // digit in it that is not a version does not move on its own, and refusing one
  // would be a rule about spelling rather than about stability.
  test("a digit that is not a version, a date or an expression is not unstable", () => {
    const workflow: TextFile = {
      path: ".github/workflows/example.yml",
      text: ["jobs:", "  second-analyser:", "    name: second-analyser", "    runs-on: x"].join("\n"),
    };
    const report = checkInvariants([workflow], {
      ...context,
      listedCheckNames: new Set(["second-analyser"]),
    });
    expect(passed(report)).toBe(true);
  });

  test("a matrix value in the name is refused before any matrix exists to fill it", () => {
    const workflow: TextFile = {
      path: ".github/workflows/example.yml",
      text: ["jobs:", "  unit-suite:", "    name: unit-suite (${{ matrix.node }})", "    runs-on: x"].join("\n"),
    };
    const report = checkInvariants([workflow], {
      ...context,
      listedCheckNames: new Set(["unit-suite (${{ matrix.node }})"]),
    });
    expect(report.refusals).toEqual([
      'check-name-is-stable: .github/workflows/example.yml:3: reports a check run under "unit-suite (${{ matrix.node }})", which carries an expression the runner substitutes',
    ]);
  });

  // The list is a page in this tree and the required set is a repository setting.
  // Nothing here reads the second, and a rule that appeared to would be worse
  // than the absence, because the page would look guarded in the half it is not.
  test("says nothing about a name the list carries and the default branch does not require", () => {
    const current: TextFile = { path: checkNameList, text: "### `document-lint`" };
    expect(passed(checkInvariants([current], context))).toBe(true);
  });
});
