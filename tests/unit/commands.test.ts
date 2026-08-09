// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the command-block convention. Each rule carries the near miss
// rather than an obvious violation: the block somebody actually writes, one edit
// away from the correct one, which is here too and has to pass.
//
// The rule that matters most is the absence one. A block with no marker is the
// only shape that arrives by nobody doing anything, so it is the shape the
// convention exists against, and it is proved here twice: once refused, and once
// with the marker added, where it passes.

import { describe, expect, test } from "vitest";
import { blocksIn, checkCommands, decide, isFollowedDocument, type TextFile } from "../../tools/src/checks/commands.ts";
import { passed } from "../../tools/src/checks/report.ts";

function guide(...body: readonly string[]): TextFile {
  return { path: "CONTRIBUTING.md", text: body.join("\n") };
}

describe("which documents are followed", () => {
  test("the guide and an operator guide, and no other document", () => {
    expect(isFollowedDocument("CONTRIBUTING.md")).toBe(true);
    expect(isFollowedDocument("docs/operator/install.md")).toBe(true);
    expect(isFollowedDocument("docs/quality/check-names.md")).toBe(false);
    expect(isFollowedDocument("README.md")).toBe(false);
  });

  // A document nobody follows is not judged, and the run says how many it read,
  // so a route that stopped reading the guide is not a green run.
  test("a block in a document nobody follows is not judged", () => {
    const elsewhere: TextFile = { path: "docs/quality/x.md", text: "\n    corepack pnpm run check:pins\n" };
    const report = checkCommands([elsewhere]);
    expect(passed(report)).toBe(true);
    expect(report.lines[0]).toMatch(/examined 0 followed document\(s\)/);
  });
});

describe("a block with no marker", () => {
  // Somebody adding a command to a page that already has ten of them, in the
  // paragraph they were editing, and never seeing the comment above the others.
  const nearMiss = guide("Run the checks:", "", "    corepack pnpm run check:pins", "");

  test("is refused, naming the line and what the block starts with", () => {
    const report = checkCommands([nearMiss]);
    expect(report.refusals).toEqual([
      'CONTRIBUTING.md:3: carries no marker, so nothing says whether the commands in it are run. Blocks starting: "corepack pnpm run check:pins"',
    ]);
  });

  test("passes with the marker added, and the block is then one the runner runs", () => {
    const corrected = guide("Run the checks:", "", "<!-- run -->", "", "    corepack pnpm run check:pins", "");
    const decision = decide([corrected]);
    expect(decision.refusals).toEqual([]);
    expect(decision.run).toEqual([{ path: "CONTRIBUTING.md", line: 5, commands: ["corepack pnpm run check:pins"] }]);
  });
});

describe("a block marked as not run", () => {
  test("is not run, and the reason is printed with it", () => {
    const document = guide("<!-- not run: it needs a credential -->", "", "    gh api repos/iderex/entwurf", "");
    const report = checkCommands([document]);
    expect(passed(report)).toBe(true);
    expect(report.lines).toContain("NOT run, it needs a credential: CONTRIBUTING.md:3.");
  });

  // The near miss for this one is the marker written without its reason, which is
  // what somebody writes when the reason feels obvious while they are writing it.
  test("is refused when it gives no reason", () => {
    const document = guide("<!-- not run: -->", "", "    gh api repos/iderex/entwurf", "");
    expect(checkCommands([document]).refusals).toEqual([
      "CONTRIBUTING.md:3: is marked as not run and gives no reason, which is the same as no marker to a reader deciding whether to trust it",
    ]);
  });

  test("says what it does not judge, so a green run is not read as the reasons being true", () => {
    const report = checkCommands([guide("<!-- not run: it needs a credential -->", "", "    gh api x", "")]);
    expect(report.lines.at(-1)).toBe(
      "whether a reason given for not running a block is true is not judged here, and neither is whether the output pasted under a command is what it produces today.",
    );
  });
});

describe("a block marked as run that the route cannot run", () => {
  // The mistake is marking a transcript as runnable because its first line is a
  // command, when the line carries a pipe into another program.
  test("is refused when a command carries shell syntax, naming the command", () => {
    const document = guide("<!-- run -->", "", "    git ls-files | wc -l", "");
    expect(checkCommands([document]).refusals).toEqual([
      'CONTRIBUTING.md:3: is marked as run and carries shell syntax, which the route does not give a shell to interpret: "git ls-files | wc -l"',
    ]);
  });

  test("passes when the same block is written as a command the route can spawn", () => {
    const corrected = guide("<!-- run -->", "", "    git ls-files", "");
    expect(passed(checkCommands([corrected]))).toBe(true);
  });
});

describe("what a block is", () => {
  test("an indented block and a fenced block are both read", () => {
    const document = guide("<!-- run -->", "", "    one", "", "<!-- run -->", "", "```", "two", "```", "");
    expect(blocksIn(document).map((block) => block.commands)).toEqual([["one"], ["two"]]);
  });

  // A transcript is a command and the output it produced, separated by a blank
  // line and indented throughout. Ending the block at the blank line would leave
  // the output as a second, unmarked block and refuse a page that is correct.
  test("a blank line inside an indented block does not end it", () => {
    const document = guide("<!-- not run: transcript -->", "", "    the command", "", "    what it printed", "");
    expect(blocksIn(document).map((block) => block.commands)).toEqual([["the command", "what it printed"]]);
  });

  test("a marker with prose between it and the block does not carry to the block", () => {
    const document = guide("<!-- run -->", "", "A sentence.", "", "    a command", "");
    expect(decide([document]).refusals).toHaveLength(1);
  });

  test("a paragraph carrying no block is not a block", () => {
    expect(blocksIn(guide("Just prose, and a `backticked span`."))).toEqual([]);
  });
});

describe("what the run says about itself", () => {
  test("counts the documents, the blocks it runs and the commands in them", () => {
    const document = guide(
      "<!-- run -->",
      "",
      "    one",
      "    two",
      "",
      "<!-- not run: output -->",
      "",
      "    what it printed",
      "",
    );
    expect(checkCommands([document]).lines[0]).toBe(
      "examined 1 followed document(s): 1 block(s) run, carrying 2 command(s), and 1 block(s) the document says are not run.",
    );
  });

  // A machine that could not start a command is not a machine that ran it. The
  // distinction is the whole reason the line exists: without it a run on a
  // platform where nothing started reads exactly like a run where everything
  // passed.
  test("says how many commands it could not start, and why, without refusing them", () => {
    const document = guide("<!-- run -->", "", "    one", "");
    const report = checkCommands([document], [], [{ command: "one", reason: "the machine cannot start it" }]);
    expect(passed(report)).toBe(true);
    expect(report.lines.at(-1)).toBe(
      "1 of those command(s) were NOT started on this machine, so this run says nothing about them: the machine cannot start it. They are started where the checks run.",
    );
  });

  test("a run that started everything does not print that line at all", () => {
    const report = checkCommands([guide("<!-- run -->", "", "    one", "")]);
    expect(report.lines.some((line) => line.includes("NOT started"))).toBe(false);
  });

  test("a command that failed is refused, naming the block, the command and what it said", () => {
    const document = guide("<!-- run -->", "", "    one", "");
    const report = checkCommands([document], [
      { path: "CONTRIBUTING.md", line: 3, command: "one", detail: "exited 1: not found" },
    ]);
    expect(report.refusals).toEqual(['CONTRIBUTING.md:3: "one" exited 1: not found']);
  });
});
