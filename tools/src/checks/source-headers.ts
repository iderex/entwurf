// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Which licence each source file declares, decided by where the file sits.
//
// This repository is AGPL-3.0-only and the tool it is built on is MPL-2.0. That
// copyleft is per file and travels with the file, so a file derived from the
// upstream tool stays MPL whatever this repository chooses, and a file written to
// be offered upstream is MPL from its first line rather than relicensed once per
// patch. Two categories, decided by location, and a source file in neither is
// refused rather than defaulted: a default here would silently put this
// repository's licence on a file that cannot carry it.
//
// The header is the SPDX short form rather than the licence's own boilerplate.
// The boilerplate restates the terms in every file, which is the thing the readme
// and the notice are told not to do, and a paragraph copied into forty files is
// forty places for it to drift from LICENSE. The short form is a reference to the
// text at the root, and it is the form a notices route reads.
//
// Reads no file and runs no git command: the runner supplies the paths and their
// text, so the suite can put a wrongly headed file in front of this without one
// existing in the tree.

import type { Report } from "./report.ts";

export const copyrightHolder = "2026 Nils Lehnen";

// How a line comment opens, per extension. This map is also the set of files this
// check judges, and that is its first bound: a source file whose comment syntax is
// not here is refused rather than skipped, so the way to add a language is to add
// it here rather than to discover it was never covered.
export const lineCommentByExtension: ReadonlyMap<string, string> = new Map([
  [".ts", "//"],
  [".tsx", "//"],
  [".mts", "//"],
  [".cts", "//"],
  [".js", "//"],
  [".mjs", "//"],
  [".cjs", "//"],
  [".jsx", "//"],
  [".rs", "//"],
  [".clj", ";;"],
  [".cljc", ";;"],
  [".cljs", ";;"],
  [".edn", ";;"],
]);

export type LocationRule = {
  // A tracked path prefix. First match wins, so a longer prefix goes above the
  // shorter one it sits inside.
  prefix: string;
  // The SPDX identifier a file under that prefix declares.
  licence: string;
  // Why that licence and not the other, printed on every run.
  reason: string;
};

export const locationRules: readonly LocationRule[] = [
  {
    prefix: "upstream/",
    licence: "MPL-2.0",
    reason: "derived from the upstream tool, whose copyleft is per file and travels with the file rather than being this repository's to change",
  },
  {
    prefix: "overlay/",
    licence: "MPL-2.0",
    reason: "written to be offered upstream, so it carries the licence it will travel under from its first line rather than being relicensed once per patch",
  },
  {
    prefix: "tools/",
    licence: "AGPL-3.0-only",
    reason: "this repository's own code, under the licence in LICENSE",
  },
  {
    prefix: "tests/",
    licence: "AGPL-3.0-only",
    reason: "this repository's own code, under the licence in LICENSE",
  },
];

export const repair =
  "run `corepack pnpm run headers` to apply a missing header. A header that names the wrong licence is never rewritten by that command and is repaired by hand, because a tool that silently changes which licence a file claims is the one thing this check exists against. A file no rule covers needs a rule in locationRules with its reason.";

export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

export function ruleFor(path: string): LocationRule | undefined {
  return locationRules.find((rule) => path.startsWith(rule.prefix));
}

export function headerLines(comment: string, licence: string): string[] {
  return [
    `${comment} SPDX-FileCopyrightText: ${copyrightHolder}`,
    `${comment} SPDX-License-Identifier: ${licence}`,
  ];
}

// How far into a file a header may sit. A licence declaration below this is a
// declaration somebody has to scroll to find, and the tools that read the short
// form look at the top of the file.
export const headerWindow = 5;

// The identifier a file declares, or undefined where it declares none. Only the
// window above is read.
export function declaredLicence(text: string, comment: string): string | undefined {
  for (const line of text.split("\n").slice(0, headerWindow)) {
    const found = line.trim().match(/^(?:\/\/|;;)\s*SPDX-License-Identifier:\s*(\S+)\s*$/);
    if (found?.[1] !== undefined && line.trim().startsWith(comment)) return found[1];
  }
  return undefined;
}

export function declaresCopyright(text: string, comment: string): boolean {
  return text
    .split("\n")
    .slice(0, headerWindow)
    .some((line) => line.trim().startsWith(`${comment} SPDX-FileCopyrightText:`));
}

export type SourceFile = { path: string; text: string };

// The header put on a file that has none. A file that already declares an
// identifier is returned unchanged, whatever that identifier says, so this never
// rewrites a licence claim.
export function withHeader(file: SourceFile): string {
  const comment = lineCommentByExtension.get(extensionOf(file.path));
  const rule = ruleFor(file.path);
  if (comment === undefined || rule === undefined) return file.text;
  if (declaredLicence(file.text, comment) !== undefined) return file.text;
  return `${headerLines(comment, rule.licence).join("\n")}\n\n${file.text}`;
}

export function checkSourceHeaders(
  files: readonly SourceFile[],
  // Which of the three refusals are in force. The suite runs each fixture with
  // its own refusal switched off, where the fixture has to pass.
  enabled: ReadonlySet<string> = new Set(["header-missing", "header-names-another-licence", "location-has-no-rule"]),
): Report {
  const refusals: string[] = [];
  const counted = new Map<string, number>();

  for (const file of files) {
    const comment = lineCommentByExtension.get(extensionOf(file.path));
    if (comment === undefined) continue;

    const rule = ruleFor(file.path);
    if (rule === undefined) {
      if (enabled.has("location-has-no-rule")) {
        refusals.push(`location-has-no-rule: ${file.path} is source and no rule in the table covers where it sits, so which licence it carries is undecided`);
      }
      continue;
    }

    counted.set(rule.licence, (counted.get(rule.licence) ?? 0) + 1);

    const declared = declaredLicence(file.text, comment);
    if (declared === undefined) {
      if (enabled.has("header-missing")) {
        refusals.push(`header-missing: ${file.path} declares no SPDX-License-Identifier in its first ${headerWindow} line(s), and its location says ${rule.licence}`);
      }
      continue;
    }
    if (declared !== rule.licence) {
      if (enabled.has("header-names-another-licence")) {
        refusals.push(`header-names-another-licence: ${file.path} declares ${declared} and its location says ${rule.licence}`);
      }
      continue;
    }
    if (!declaresCopyright(file.text, comment) && enabled.has("header-missing")) {
      refusals.push(`header-missing: ${file.path} declares ${declared} with no SPDX-FileCopyrightText line beside it`);
    }
  }

  const judged = [...counted.entries()].map(([licence, count]) => `${licence} (${count})`).sort();
  const lines = [
    `examined ${files.length} tracked path(s) for a licence header: ${judged.length > 0 ? judged.join(", ") : "no source file"}.`,
    ...locationRules.map((rule) => `${rule.prefix} is ${rule.licence}: ${rule.reason}.`),
    `it reaches only the extensions it knows a line comment for, and only the first ${headerWindow} line(s) of a file. It does NOT judge whether the licence a file declares is the licence its contents may lawfully carry, which is a reading of the file rather than of the tree.`,
  ];

  return { lines, refusals, repair };
}
