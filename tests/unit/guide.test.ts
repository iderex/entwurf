// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from "vitest";
import { checkGuide, looksLikeATrackedPath } from "../../tools/src/checks/guide.ts";
import { passed } from "../../tools/src/checks/report.ts";

const tracked = ["CONTRIBUTING.md", "tools/src/pins.ts", "docs/decisions/0001-means.md", "upstream/pin.json"];
const scripts = ["check", "check:pins", "test"];

describe("looksLikeATrackedPath", () => {
  test("takes a span with a slash in it", () => {
    expect(looksLikeATrackedPath("tools/src/pins.ts")).toBe(true);
    expect(looksLikeATrackedPath("docs/decisions/")).toBe(true);
  });

  // The reason this filter exists at all. A guide talks about settings and
  // fields, and judging those as paths would refuse it for being accurate.
  test("leaves a field name, a setting and a quoted line alone", () => {
    for (const span of ["engines.node", "packageManager", "engineStrict", "corepack pnpm test", "@playwright/test"]) {
      expect(looksLikeATrackedPath(span), span).toBe(false);
    }
  });

  test("leaves a link alone", () => {
    expect(looksLikeATrackedPath("https://example.invalid/a/b")).toBe(false);
  });
});

describe("checkGuide", () => {
  test("passes a guide naming only paths and scripts that exist", () => {
    const guide = "See `tools/src/pins.ts` and `docs/decisions/`, then run\n\n    corepack pnpm run check:pins\n";
    const report = checkGuide(guide, tracked, [], scripts);
    expect(passed(report)).toBe(true);
    expect(report.lines[0]).toBe(
      "examined the guide: 2 backticked path(s), of which 0 are paths a run writes rather than tracked files, and 1 script name(s).",
    );
  });

  test("refuses a path that is neither tracked nor written by a run", () => {
    const report = checkGuide("See `tools/src/gone.ts`.", tracked, [], scripts);
    expect(report.refusals).toEqual([
      "the guide names `tools/src/gone.ts`, which is neither a tracked path nor a path this tree's runs write",
    ]);
  });

  // The guide is allowed to say where a run puts its output, and such a path is
  // never tracked. Counting it apart from the tracked ones is what keeps the
  // first line an honest statement of what was judged against the tree.
  test("accepts a path a run writes, and counts it apart", () => {
    const report = checkGuide("Results land in `coverage/coverage-summary.json`.", tracked, ["coverage/coverage-summary.json"], scripts);
    expect(passed(report)).toBe(true);
    expect(report.lines[0]).toContain("of which 1 are paths a run writes");
  });

  // A directory resolves when something tracked sits under it, which is the only
  // sense in which git has directories at all.
  test("resolves a directory through the files under it", () => {
    expect(passed(checkGuide("`docs/decisions/`", tracked, [], scripts))).toBe(true);
    expect(passed(checkGuide("`docs/nothing/`", tracked, [], scripts))).toBe(false);
  });

  test("refuses a script package.json does not define", () => {
    const report = checkGuide("Run\n\n    corepack pnpm run check:gone\n", tracked, [], scripts);
    expect(report.refusals).toEqual(["the guide names the script `check:gone`, which package.json does not define"]);
  });

  test("names every stale reference rather than the first", () => {
    const guide = "`a/b.ts` and `c/d.ts`, then corepack pnpm run gone-one and corepack pnpm run gone-two";
    expect(checkGuide(guide, tracked, [], scripts).refusals).toHaveLength(4);
  });

  // What it does not judge is printed with what it does, so a green run cannot be
  // read as a statement that every sentence in the guide is true.
  test("says what it did not judge", () => {
    const report = checkGuide("", tracked, [], scripts);
    expect(report.lines[1]).toContain("it does NOT judge");
    expect(report.lines[1]).toContain("whether any sentence in the guide is true");
  });
});
