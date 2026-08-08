// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from "vitest";
import { checkLanguages, languageByExtension } from "../../tools/src/checks/languages.ts";
import { passed } from "../../tools/src/checks/report.ts";

const allowed = new Set(["clojure", "clojurescript", "rust", "typescript"]);

describe("checkLanguages", () => {
  test("passes a tree carrying only named languages", () => {
    const report = checkLanguages(["tools/src/pins.ts", "overlay/engine/lib.rs", "backend/deps.edn"], allowed);
    expect(passed(report)).toBe(true);
  });

  test("refuses a file in a language the table does not name", () => {
    const report = checkLanguages(["tools/src/pins.ts", "tools/helper.py"], allowed);
    expect(report.refusals).toEqual(["tools/helper.py is python, which tools/toolchains.json does not name"]);
  });

  test("names every offending path rather than only the first", () => {
    const report = checkLanguages(["a.py", "b.sh", "c.rb"], allowed);
    expect(report.refusals).toHaveLength(3);
  });

  // The count of what was not judged is the honest half of the report. Without it
  // a clean run reads as a statement about every tracked file, and it is a
  // statement about the ones this check can classify.
  test("counts what it could not classify and says so", () => {
    const report = checkLanguages(["README.md", "LICENSE", ".gitignore", "tools/src/pins.ts"], allowed);
    expect(passed(report)).toBe(true);
    expect(report.lines[0]).toBe(
      "examined 4 tracked path(s) by extension: typescript (1); 3 path(s) carry an extension this check does not classify and were NOT judged.",
    );
  });

  test("says so when nothing at all was classified", () => {
    const report = checkLanguages(["README.md"], allowed);
    expect(report.lines[0]).toMatch(/no classified source file/);
  });

  // A dotfile has no extension in the sense this check means. Reading ".gitignore"
  // as an extension would classify half the tree by accident.
  test("does not read a leading dot as an extension", () => {
    const report = checkLanguages([".ts", "dir.py/name"], allowed);
    expect(passed(report)).toBe(true);
    expect(report.lines[0]).toMatch(/2 path\(s\) carry an extension this check does not classify/);
  });

  test("classifies regardless of the case of the extension", () => {
    const report = checkLanguages(["Tools/Helper.PY"], allowed);
    expect(report.refusals[0]).toMatch(/is python/);
  });

  test("prints the languages it judged against", () => {
    const report = checkLanguages([], allowed);
    expect(report.lines[1]).toBe(
      "languages named by tools/toolchains.json: clojure, clojurescript, rust, typescript",
    );
  });

  // The table is the thing a reader trusts when a run passes, so an entry that
  // maps to nothing would quietly excuse a whole language.
  test("maps every extension in the table to a non-empty language", () => {
    for (const [extension, language] of languageByExtension) {
      expect(extension.startsWith("."), extension).toBe(true);
      expect(language.length, extension).toBeGreaterThan(0);
    }
  });
});
