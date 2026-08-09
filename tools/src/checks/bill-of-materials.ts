// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Decides what this repository's bill of materials says, and refuses the two
// states that would let a dependency ship with nobody knowing what it may be used
// under. Reads no file and runs no command: the runner hands over the packages the
// lock file names and the manifests it managed to read, so the suite can put a
// dependency with no licence in front of this without one being installed.
//
// The set comes from the lock file and never from the installed tree. Those are
// different sets, and the difference is not theoretical: a working checkout keeps
// the store directories of packages that were installed once and are no longer
// resolved, so a list built by walking node_modules reports packages this
// repository does not depend on. The run says how many such directories it passed
// over, because a number nobody prints is indistinguishable from none.
//
// What it does not reach. One lock file is one ecosystem. The rendering library,
// its binaries and the three-language dependency set of the upstream design tool
// arrive with a checkout this repository holds a pin to and no route to build, so
// no run here is evidence about any of them, and the document it generates says so
// on its own first screen rather than leaving a true list to read as a complete
// one.
//
// It also cannot judge whether a licence a package declares about itself is the
// licence its files actually carry. Nothing that reads a manifest could. What it
// refuses is the absent field, the placeholder, and the declaration that points at
// a file instead of naming terms, which are the three states a package is in when
// nobody has looked.

import type { Report } from "./report.ts";

// A package the lock file names, before anything is known about its licence. The
// platform constraints come from the lock file rather than from the machine: a
// package restricted to another operating system or another processor is not
// installed here and its terms cannot be read here, and taking that from the lock
// file rather than from what happens to be on disk is what makes the generated
// document the same bytes on every machine.
export type LockedPackage = {
  name: string;
  version: string;
  // Verbatim, as the lock file writes them. Empty where the lock file declares no
  // constraint, which is the ordinary case.
  os: readonly string[];
  cpu: readonly string[];
};

// A package manifest the runner managed to read out of the store, with the path
// it was read from so a row in the document can be re-checked against the thing
// it describes.
export type Manifest = {
  name: string;
  version: string;
  // What the manifest declares, verbatim and untranslated, or undefined where it
  // declares nothing at all.
  declared: string | undefined;
  readFrom: string;
};

export type Input = {
  // Where the package set was read from, named in a refusal so a reader knows
  // which file decides membership.
  lockPath: string;
  packages: readonly LockedPackage[];
  manifests: readonly Manifest[];
  // Store directories the runner found and passed over because the lock file does
  // not name them. Counted rather than listed, and counted rather than dropped.
  ignoredStoreEntries: number;
  // The lock files this repository tracks. One entry is the honest state today and
  // the run prints it, because "generated from the lock files" reads as plural.
  lockFilesInTree: readonly string[];
  // The bill of materials as the tree currently carries it, or undefined where the
  // tree carries none yet.
  tracked: string | undefined;
  documentPath: string;
};

export type Refusal = { where: string; detail: string };

export type Rule = {
  // The stable name a refusal is reported under.
  id: string;
  // What goes wrong when this is violated, printed on every run.
  prevents: string;
  // What this one does not reach, printed on every run beside the failure it
  // prevents, because a rule whose bound is not stated is read as covering
  // everything it plausibly could.
  bound: string;
  find: (input: Input, rows: readonly Row[], document: string) => Refusal[];
};

// One line of the bill of materials, after the lock file and the manifests have
// been put together.
//
// Three states rather than two, and the third is the one worth keeping separate. A
// package restricted to another platform has terms nobody here read, which is not
// the same as terms nobody established: one machine cannot install every
// platform's binaries, so collapsing the two would make this check red by
// construction on every machine and therefore worth nothing. The third state is
// counted, listed with its constraint, and never reported as a licence.
export type State = "determined" | "undetermined" | "not-read-on-this-route";

export type Row = {
  name: string;
  version: string;
  state: State;
  // The identifier the package declares, present only where the state is
  // determined.
  licence: string | undefined;
  // Why there is no licence, for the refusal and the document to name. Absent on a
  // row that determined one.
  why: string | undefined;
  readFrom: string | undefined;
};

export const repair =
  "regenerate the document with the bom script, and where a dependency carries no licence anybody can read, establish its terms or remove the dependency rather than shipping it with the field blank.";

// Words a manifest carries in place of a licence. An emptiness check alone walks
// straight past every one of them, and each is the shape of an intention to come
// back rather than an answer. The same register the asset check keeps, for the
// same reason, over a different kind of file.
export const placeholderLicences: readonly string[] = [
  "unlicensed",
  "unknown",
  "none",
  "tbd",
  "todo",
  "n/a",
  "na",
  "-",
  "?",
  "see license",
  "proprietary",
];

// A manifest may point at a file instead of naming terms. That is legal npm and it
// is not a determination: the string names no licence, so a document built from it
// would carry a sentence about a file nobody read.
const pointsAtAFile = /^see\s+licen[cs]e/i;

function determine(manifest: Manifest | undefined): { licence: string | undefined; why: string | undefined } {
  if (manifest === undefined) {
    return { licence: undefined, why: "no manifest for it was found, so nothing about its terms was read" };
  }
  // The reason names the manifest and never the path it was read from. A store
  // path carries the peer-dependency hash of the machine that resolved it, so a
  // document holding one would drift between two checkouts of the same lock file
  // and the drift rule would be reporting the store rather than the dependencies.
  const declared = manifest.declared?.trim();
  if (declared === undefined || declared.length === 0) {
    return { licence: undefined, why: "its own package.json declares no licence" };
  }
  if (pointsAtAFile.test(declared)) {
    return {
      licence: undefined,
      why: `its manifest declares "${declared}", which points at a file rather than naming terms`,
    };
  }
  if (placeholderLicences.includes(declared.toLowerCase())) {
    return {
      licence: undefined,
      why: `its manifest declares "${declared}", which is a note to come back rather than a licence`,
    };
  }
  return { licence: declared, why: undefined };
}

function describePlatform(locked: LockedPackage): string {
  const parts: string[] = [];
  if (locked.os.length > 0) parts.push(`os ${locked.os.join(" or ")}`);
  if (locked.cpu.length > 0) parts.push(`cpu ${locked.cpu.join(" or ")}`);
  return parts.join(", ");
}

// Nothing here orders by locale. `localeCompare` reads the runtime's collation
// data and its default locale, so two checkouts of one lock file on two machines
// can put the same two rows in a different order, and the drift rule below would
// then be reporting the machine that ran it. Code units are the same everywhere.
function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

// Versions compare segment by segment, and numerically where both segments are
// digits. By code unit alone 4.1.10 sorts above 4.1.9, because the comparison
// stops at the first character and 1 is below 9, and a reader who sees a sorted
// table reads a version out of order as a version that is missing.
function byVersion(left: string, right: string): number {
  const leftParts = left.split(/[.+-]/);
  const rightParts = right.split(/[.+-]/);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const here = leftParts[index] ?? "";
    const there = rightParts[index] ?? "";
    if (here === there) continue;
    if (/^\d+$/.test(here) && /^\d+$/.test(there)) return Number(here) - Number(there);
    return byCodeUnit(here, there);
  }
  return 0;
}

// The bill of materials, derived. Ordering is by name and then version so that two
// runs over the same inputs produce the same bytes and the drift rule below is
// about the inputs rather than about the order a directory happened to be walked
// in.
export function billOfMaterials(input: Input): Row[] {
  const byKey = new Map<string, Manifest>();
  for (const manifest of input.manifests) byKey.set(`${manifest.name}@${manifest.version}`, manifest);

  return [...input.packages]
    .sort((left, right) => byCodeUnit(left.name, right.name) || byVersion(left.version, right.version))
    .map((locked) => {
      const platform = describePlatform(locked);
      if (platform !== "") {
        return {
          name: locked.name,
          version: locked.version,
          state: "not-read-on-this-route" as const,
          licence: undefined,
          why: `the lock file restricts it to ${platform}, and no route here reads a package built for a platform other than the one generating this`,
          readFrom: undefined,
        };
      }
      const manifest = byKey.get(`${locked.name}@${locked.version}`);
      const { licence, why } = determine(manifest);
      return {
        name: locked.name,
        version: locked.version,
        state: licence === undefined ? ("undetermined" as const) : ("determined" as const),
        licence,
        why,
        readFrom: manifest?.readFrom,
      };
    });
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|");
}

// What the licence column says. The two states that are not a licence say so in
// words a reader cannot mistake for one, which is the whole reason the column is
// not left empty.
function cell(row: Row): string {
  if (row.state === "determined" && row.licence !== undefined) return row.licence;
  const prefix = row.state === "not-read-on-this-route" ? "NOT READ" : "NOT DETERMINED";
  return `${prefix}: ${row.why ?? ""}`;
}

// The document. Generated in full on every run, including its own header, so that
// nothing in it is maintained by hand and a hand edit shows up as drift rather
// than surviving.
export function renderDocument(input: Input, rows: readonly Row[]): string {
  const undetermined = rows.filter((row) => row.state === "undetermined");
  const unread = rows.filter((row) => row.state === "not-read-on-this-route");
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.licence === undefined) continue;
    counts.set(row.licence, (counts.get(row.licence) ?? 0) + 1);
  }
  const summary = [...counts]
    .sort((left, right) => right[1] - left[1] || byCodeUnit(left[0], right[0]))
    .map(([licence, count]) => `${licence} (${count})`)
    .join(", ");

  return [
    "# Bill of materials",
    "",
    "Generated. Nothing here is written by hand, and a hand edit is refused as drift",
    "rather than kept. The command that produces it is the bom script in",
    "`package.json`, and the check that refuses a stale copy is `check:bom`.",
    "",
    "Every licence below is what the package declares about itself in its own",
    "package.json, read out of the resolved store. Where it was read from is not a",
    "column, because it is the same answer on every row and a store path carries the",
    "resolving machine's peer hashes, which would drift between two checkouts of one",
    "lock file. Whether a declaration is the licence the package's files actually carry",
    "is a judgement, and no reading of a manifest makes it.",
    "",
    `The set is every package \`${input.lockPath}\` names. It is not the set installed in a`,
    "working checkout: a store keeps the directories of packages that were resolved",
    "once and are not resolved now, so a list built by walking the installed tree",
    "reports dependencies this repository does not have.",
    "",
    "## What this does not cover",
    "",
    `This repository tracks ${input.lockFilesInTree.length} lock file: ${input.lockFilesInTree.join(", ")}. Everything below comes`,
    "from it and from nothing else.",
    "",
    "The upstream design tool's own dependency set, in three other languages, and the",
    "rendering library and its binaries, are not here. This repository holds a pin to",
    "that revision and no route to build it, so nothing here is evidence about what an",
    "operator would actually ship. Issue #98 is where the pinned revision becomes",
    "runnable and issue #65 is where these notices are carried through rather than",
    "replaced.",
    "",
    `${unread.length} of the packages below are restricted by the lock file to a platform other`,
    "than one machine can hold at once, so their terms were not read here at all. They",
    "are listed with the constraint that stopped the reading rather than left out, and",
    "the count is here rather than only in the table. Establishing them needs a",
    "generation route that runs on each platform, which this repository does not have.",
    "",
    "## The dependencies",
    "",
    `${rows.length} package(s): ${summary === "" ? "none with a determined licence" : summary}.`,
    ...(undetermined.length > 0
      ? ["", `${undetermined.length} package(s) with no licence anybody could determine, listed below with the reason.`]
      : []),
    "",
    "| Package | Version | Licence |",
    "| --- | --- | --- |",
    ...rows.map((row) =>
      ["|", escapeCell(row.name), "|", escapeCell(row.version), "|", escapeCell(cell(row)), "|"].join(" "),
    ),
    "",
  ].join("\n");
}

// The drift comparison is over the text and not over the bytes. This repository
// declares no `.gitattributes`, so a clone with `core.autocrlf` set puts a
// carriage return on every line of a tracked file that git stores with none, and
// a byte comparison then reports every line of a document nobody touched as
// different. That is a refusal about the checkout rather than about the
// dependencies, and it was measured: the check went red on a fresh checkout of
// the commit that introduced it, on a machine where that setting is on.
//
// What this gives up is stated rather than glossed. An edit that changes only
// line endings now passes. Nothing reads this document for its bytes, git stores
// the same object either way, and no reader sees the difference, so the cost is
// smaller than a check that cannot be green on a whole class of machine.
function sameText(left: string, right: string): boolean {
  return left.replaceAll("\r\n", "\n") === right.replaceAll("\r\n", "\n");
}

export const rules: readonly Rule[] = [
  {
    id: "dependency-without-a-determined-licence",
    prevents:
      "a dependency shipping with its terms blank, which an operator redistributing the result discovers when somebody asks them what they are allowed to do with it",
    bound:
      "what a package declares about itself in its own manifest. Whether that declaration is the licence its files actually carry is a judgement, and no reading of a manifest makes it",
    find(input, rows) {
      return rows
        .filter((row) => row.state === "undetermined" && row.readFrom !== undefined)
        .map((row) => ({
          where: `${row.name}@${row.version}`,
          detail: `is named by ${input.lockPath} and ${row.why ?? "nothing was determined about its licence"}`,
        }));
    },
  },
  {
    id: "dependency-that-could-not-be-read",
    prevents:
      "a package the lock file names being left out of the document because nothing could be read about it, so the list is short by exactly the entries nobody looked at",
    bound:
      "packages the lock file names for which no manifest was found and which the lock file restricts to no platform. A package restricted to another platform is listed as not read rather than refused, because no single machine installs every platform's binaries and a check that could never be green refuses nothing",
    find(input, rows) {
      return rows
        .filter((row) => row.state === "undetermined" && row.readFrom === undefined)
        .map((row) => ({
          where: `${row.name}@${row.version}`,
          detail: `is named by ${input.lockPath} and no manifest for it was found, so it is refused rather than omitted`,
        }));
    },
  },
  {
    id: "bill-of-materials-out-of-date",
    prevents:
      "the document drifting away from the lock file it claims to be generated from, which is what turns a generated list back into a hand-maintained one without anybody deciding to",
    bound:
      "a comparison of the text against what this run would generate, with carriage returns folded out of both sides first. It says nothing about whether the generated document is the right shape, only that the tracked copy carries the text this input produces, and nothing at all about which line ending a working tree holds",
    find(input, _rows, document) {
      if (input.tracked === undefined) {
        return [{ where: input.documentPath, detail: "does not exist, and this run would generate it" }];
      }
      if (sameText(input.tracked, document)) return [];
      return [
        {
          where: input.documentPath,
          detail: "differs from what this run generates, so the tracked copy was edited by hand or the lock file moved under it",
        },
      ];
    },
  },
];

export const ruleIds: readonly string[] = rules.map((rule) => rule.id);

export function checkBillOfMaterials(
  input: Input,
  enabled: ReadonlySet<string> = new Set(ruleIds),
): { report: Report; document: string } {
  const rows = billOfMaterials(input);
  const document = renderDocument(input, rows);
  const running = rules.filter((rule) => enabled.has(rule.id));
  const refusals: string[] = [];

  for (const rule of running) {
    for (const refusal of rule.find(input, rows, document)) {
      refusals.push(`${rule.id}: ${refusal.where}: ${refusal.detail}`);
    }
  }

  const determined = rows.filter((row) => row.state === "determined").length;
  const unread = rows.filter((row) => row.state === "not-read-on-this-route").length;
  const lines = [
    `examined ${rows.length} package(s) named by ${input.lockPath} against ${input.manifests.length} manifest(s) read from the store, under ${running.length} of ${rules.length} rule(s).`,
    `${determined} of ${rows.length} package(s) declare a licence this run could read.`,
    `${unread} package(s) are restricted by the lock file to another platform, so their terms were NOT read on this route and this run is no evidence about them.`,
    `${input.ignoredStoreEntries} store director(ies) were passed over because ${input.lockPath} does not name them, so they are outside this document rather than silently inside it.`,
    `lock files this repository tracks: ${input.lockFilesInTree.join(", ")}. The upstream design tool's own dependency set is reached by none of them, so no run here is evidence about it.`,
    ...running.map((rule) => `${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`),
  ];

  const off = ruleIds.filter((id) => !enabled.has(id));
  if (off.length > 0) {
    lines.push(`NOT run on this run, so this run says nothing about them: ${off.join(", ")}.`);
  }

  return { report: { lines, refusals, repair }, document };
}
