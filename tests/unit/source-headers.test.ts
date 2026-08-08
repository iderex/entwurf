// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The proof for the licence header rule. Each of the three refusals carries a
// near miss rather than an obvious violation, and each fixture is also run with
// that refusal switched off, where it has to pass. The second run is what says
// the refusal came from the rule under test rather than from somewhere else.
//
// The near misses are the mistakes somebody actually makes here. A file headed
// AGPL-3.0 rather than AGPL-3.0-only, because the repository metadata reports the
// first spelling and it reads as the same thing. A file written under tests/ or
// tools/ carrying the upstream licence, because it was copied from a file that
// legitimately does. And a new top-level directory, which is how a source file
// arrives in a place no rule covers.

import { describe, expect, test } from "vitest";
import {
  checkSourceHeaders,
  declaredLicence,
  declaresCopyright,
  extensionOf,
  headerLines,
  headerWindow,
  lineCommentByExtension,
  locationRules,
  ruleFor,
  withHeader,
  type SourceFile,
} from "../../tools/src/checks/source-headers.ts";
import { passed } from "../../tools/src/checks/report.ts";

const every = new Set(["header-missing", "header-names-another-licence", "location-has-no-rule"]);

function without(refusal: string): Set<string> {
  return new Set([...every].filter((id) => id !== refusal));
}

function body(licence: string, comment = "//"): string {
  return [...headerLines(comment, licence), "", "export const x = 1;", ""].join("\n");
}

function judge(files: readonly SourceFile[], enabled: ReadonlySet<string> = every) {
  return checkSourceHeaders(files, enabled);
}

describe("a correctly headed tree passes", () => {
  const good: SourceFile[] = [
    { path: "tools/src/a.ts", text: body("AGPL-3.0-only") },
    { path: "tests/unit/b.test.ts", text: body("AGPL-3.0-only") },
    { path: "overlay/c.ts", text: body("MPL-2.0") },
    { path: "upstream/d.rs", text: body("MPL-2.0") },
    { path: "docs/legal/assets.md", text: "not source" },
    { path: "package.json", text: "{}" },
  ];

  test("nothing is refused", () => {
    expect(judge(good).refusals).toEqual([]);
    expect(passed(judge(good))).toBe(true);
  });

  test("the run says what it examined and what it does not judge", () => {
    const report = judge(good);
    expect(report.lines[0]).toContain("AGPL-3.0-only (2)");
    expect(report.lines[0]).toContain("MPL-2.0 (2)");
    expect(report.lines.join("\n")).toContain("It does NOT judge whether the licence a file declares");
  });

  test("a Clojure file is judged under its own comment syntax", () => {
    const clojure: SourceFile = { path: "overlay/e.cljs", text: body("MPL-2.0", ";;") };
    expect(judge([clojure]).refusals).toEqual([]);
    expect(judge([{ path: "overlay/f.cljs", text: body("MPL-2.0", "//") }]).refusals).toHaveLength(1);
  });
});

describe("header-missing", () => {
  const noHeader: SourceFile = { path: "tools/src/a.ts", text: "export const x = 1;\n" };

  test("a source file with no identifier is refused, and the refusal names the licence its location says", () => {
    const refusals = judge([noHeader]).refusals;
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toContain("header-missing");
    expect(refusals[0]).toContain("AGPL-3.0-only");
  });

  test("the same fixture passes with the refusal switched off", () => {
    expect(judge([noHeader], without("header-missing")).refusals).toEqual([]);
  });

  // The near miss: an identifier that is present and correct but sits below the
  // window, which is what happens when the header is put under a file's existing
  // opening comment instead of above it.
  test("an identifier below the window is not seen", () => {
    const buried: SourceFile = {
      path: "tools/src/a.ts",
      text: ["// one", "// two", "// three", "// four", "// five", "// SPDX-License-Identifier: AGPL-3.0-only", ""].join("\n"),
    };
    expect(judge([buried]).refusals).toHaveLength(1);
    expect(declaredLicence(buried.text, "//")).toBeUndefined();
  });

  test("an identifier at the last line of the window is seen", () => {
    const edge = ["// one", "// two", "// three", "// four", "// SPDX-License-Identifier: AGPL-3.0-only", ""].join("\n");
    expect(declaredLicence(edge, "//")).toBe("AGPL-3.0-only");
    expect(headerWindow).toBe(5);
  });

  test("an identifier with no copyright line beside it is refused", () => {
    const bare: SourceFile = { path: "tools/src/a.ts", text: "// SPDX-License-Identifier: AGPL-3.0-only\n\nexport const x = 1;\n" };
    const refusals = judge([bare]).refusals;
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toContain("no SPDX-FileCopyrightText");
    expect(judge([bare], without("header-missing")).refusals).toEqual([]);
    expect(declaresCopyright(bare.text, "//")).toBe(false);
  });
});

describe("header-names-another-licence", () => {
  // The near miss that matters most. The repository metadata reports AGPL-3.0 for
  // the same text this tree calls AGPL-3.0-only, so the shorter spelling reads as
  // correct to somebody who has just run the metadata command.
  const olderSpelling: SourceFile = { path: "tools/src/a.ts", text: body("AGPL-3.0") };

  test("the metadata spelling is refused, and the refusal prints both", () => {
    const refusals = judge([olderSpelling]).refusals;
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toContain("declares AGPL-3.0 and its location says AGPL-3.0-only");
  });

  test("the same fixture passes with the refusal switched off", () => {
    expect(judge([olderSpelling], without("header-names-another-licence")).refusals).toEqual([]);
  });

  test("this repository's own code carrying the upstream licence is refused", () => {
    const wrongWay: SourceFile = { path: "tests/unit/b.test.ts", text: body("MPL-2.0") };
    expect(judge([wrongWay]).refusals[0]).toContain("declares MPL-2.0 and its location says AGPL-3.0-only");
  });

  test("overlay code carrying this repository's licence is refused, which is the direction that cannot be undone", () => {
    const wrongWay: SourceFile = { path: "overlay/c.ts", text: body("AGPL-3.0-only") };
    expect(judge([wrongWay]).refusals[0]).toContain("declares AGPL-3.0-only and its location says MPL-2.0");
  });
});

describe("location-has-no-rule", () => {
  const unplaced: SourceFile = { path: "registry/server.ts", text: body("AGPL-3.0-only") };

  test("a source file no rule covers is refused even when its header is well formed", () => {
    const refusals = judge([unplaced]).refusals;
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toContain("location-has-no-rule");
  });

  test("the same fixture passes with the refusal switched off", () => {
    expect(judge([unplaced], without("location-has-no-rule")).refusals).toEqual([]);
  });

  test("a file that is not source is not refused for sitting there", () => {
    expect(judge([{ path: "registry/README.md", text: "prose" }]).refusals).toEqual([]);
  });

  test("first match wins, so the table order is the rule", () => {
    expect(ruleFor("tools/src/a.ts")?.licence).toBe("AGPL-3.0-only");
    expect(ruleFor("overlay/a.ts")?.licence).toBe("MPL-2.0");
    expect(ruleFor("nowhere/a.ts")).toBeUndefined();
    expect(locationRules.every((rule) => rule.reason.length > 0)).toBe(true);
  });
});

describe("the writer never rewrites a licence claim", () => {
  test("it applies a header to a file that has none", () => {
    const applied = withHeader({ path: "tools/src/a.ts", text: "export const x = 1;\n" });
    expect(applied.startsWith("// SPDX-FileCopyrightText: 2026 Nils Lehnen\n// SPDX-License-Identifier: AGPL-3.0-only\n\n")).toBe(true);
    expect(judge([{ path: "tools/src/a.ts", text: applied }]).refusals).toEqual([]);
  });

  test("it leaves a file declaring the wrong licence exactly as it was", () => {
    const wrong = body("MPL-2.0");
    expect(withHeader({ path: "tools/src/a.ts", text: wrong })).toBe(wrong);
  });

  test("it leaves a file no rule covers exactly as it was", () => {
    const text = "export const x = 1;\n";
    expect(withHeader({ path: "registry/server.ts", text })).toBe(text);
    expect(withHeader({ path: "docs/legal/assets.md", text })).toBe(text);
  });

  test("it uses the comment syntax of the file it is writing into", () => {
    expect(withHeader({ path: "overlay/a.cljs", text: "(ns a)\n" }).startsWith(";; SPDX-FileCopyrightText:")).toBe(true);
  });
});

describe("the extension reading, which decides what is judged at all", () => {
  test("a dotfile is not read as an extension", () => {
    expect(extensionOf(".gitignore")).toBe("");
    expect(extensionOf("tools/.gitignore")).toBe("");
  });

  test("a dotted directory does not give a file an extension", () => {
    expect(extensionOf(".github/workflows/dco.yml")).toBe(".yml");
    expect(extensionOf("tools/src/checks/report.ts")).toBe(".ts");
  });

  test("the case of the extension does not matter", () => {
    expect(extensionOf("tools/src/A.TS")).toBe(".ts");
  });

  test("every extension in the table opens a comment", () => {
    for (const [, comment] of lineCommentByExtension) expect(comment.length).toBeGreaterThan(0);
  });
});
