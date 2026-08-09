// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Decides what the third-party notices carry, and refuses the two states that
// would let the page read as complete while it is not. Reads no file and runs no
// command: the runner hands over the rows the bill of materials derived and the
// licence texts it managed to read out of the store, so the suite can put a
// dependency that publishes no text in front of this without one being installed.
//
// Why this is a second document rather than more rows in the first. The bill of
// materials answers what a dependency may be used under, in one line each, and it
// is read end to end. The notices answer the obligation almost every one of those
// licences carries, which is that the copyright line and the terms travel with the
// software, and that answer is the licence text itself. Putting several hundred
// kilobytes of it in the table would leave the list nobody can read beside the
// list everybody reads.
//
// What it does not reach. The set is the bill of materials' set, so it is one lock
// file and one ecosystem: the upstream design tool's own dependencies in three
// other languages, and the rendering library and its binaries, are outside every
// run here, and the page says so ahead of anything it does cover.
//
// It also cannot judge whether the text a package publishes is the text its
// licence requires, or whether a licence requires one at all. It carries what the
// package publishes, names the package that publishes none, and counts both.

import type { Report } from "./report.ts";
import type { Row } from "./bill-of-materials.ts";

// One licence text as the package publishes it, with the file name it was read
// under. The name is carried because a package publishing two of them, an
// original and a translation or a licence and a patent grant, is publishing two
// different things and a reader has to be able to tell which is which.
export type LicenceText = { fileName: string; text: string };

// What the notices say about one dependency.
//
// Four states rather than two, and the two that carry no text are the ones worth
// keeping apart. A package restricted by the lock file to another platform was
// never installed here, so nothing was read and nothing could have been. A package
// that IS installed and publishes no file naming its terms is a gap in what the
// ecosystem published rather than a gap in this route, and it is the one an
// operator has to know about, because the licence it declares almost certainly
// requires a notice it does not ship.
export type State = "carried" | "not-published" | "not-read-on-this-route" | "undetermined";

export type Notice = {
  name: string;
  version: string;
  // What the bill of materials determined, present only where it determined one.
  licence: string | undefined;
  state: State;
  texts: readonly LicenceText[];
  // Why there is no text, on every state but "carried".
  why: string | undefined;
};

export type Input = {
  rows: readonly Row[];
  // Licence texts by `name@version`. A package absent from this map published
  // none that could be read.
  texts: ReadonlyMap<string, readonly LicenceText[]>;
  // Where the dependency set came from, named on the page so a reader knows which
  // document decides membership.
  billPath: string;
  documentPath: string;
  // The page as the tree currently carries it, or undefined where the tree carries
  // none yet.
  tracked: string | undefined;
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
  find: (input: Input, notices: readonly Notice[], document: string) => Refusal[];
};

export const repair =
  "regenerate the page with the notices script. Where a dependency publishes no licence text at all, leave it named on the page with that reason rather than dropping it: the gap is what an operator redistributing the result has to know about.";

// The heading a dependency is named under. Exported because the property that
// every package in the set is named on the page, in every state including the two
// that carry no text, is proved by the suite against this rather than against a
// second copy of the format written in the test.
//
// It is a test and not a rule, and the difference is worth stating. The page is
// generated in full on every run, so a package can only go missing from it by the
// renderer being changed to drop one, and no input to this check can produce that.
// A rule over the generated page would be a rule nothing could make fire, which is
// worse than a test, because it would be counted as a refusal that exists.
export function headingFor(notice: { name: string; version: string }): string {
  return `### ${notice.name}@${notice.version}`;
}

// The bytes as the package publishes them, minus the two departures this page is
// allowed to make, both stated on the page itself.
//
// Carriage returns go, because git stores this document under one line ending and
// two of the texts in the current set carry the other one, so a page holding both
// would drift against its own regeneration depending on how a clone materialised
// it. A final newline is added where the file ends without one, so the closing
// fence lands on a line of its own rather than on the last line of the licence.
export function verbatim(text: string): string {
  const folded = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return folded.endsWith("\n") ? folded : `${folded}\n`;
}

function byCodeUnit(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

// The notices, derived. The order is the order the bill of materials put its rows
// in, so the two documents can be read side by side and neither has an order of
// its own to drift.
export function notices(input: Input): Notice[] {
  return input.rows.map((row) => {
    if (row.state === "undetermined") {
      return {
        name: row.name,
        version: row.version,
        licence: undefined,
        state: "undetermined" as const,
        texts: [],
        why: row.why ?? "nothing was determined about its licence",
      };
    }
    if (row.state === "not-read-on-this-route") {
      return {
        name: row.name,
        version: row.version,
        licence: undefined,
        state: "not-read-on-this-route" as const,
        texts: [],
        why: row.why ?? "it was not read on this route",
      };
    }
    const found = [...(input.texts.get(`${row.name}@${row.version}`) ?? [])].sort((left, right) =>
      byCodeUnit(left.fileName, right.fileName),
    );
    if (found.length === 0) {
      return {
        name: row.name,
        version: row.version,
        licence: row.licence,
        state: "not-published" as const,
        texts: [],
        why: `it declares ${row.licence ?? "a licence"} and publishes no file naming those terms, so there is no notice here to carry and the obligation that licence puts on a redistributor cannot be met from what the package ships`,
      };
    }
    return {
      name: row.name,
      version: row.version,
      licence: row.licence,
      state: "carried" as const,
      texts: found.map((entry) => ({ fileName: entry.fileName, text: verbatim(entry.text) })),
      why: undefined,
    };
  });
}

function section(notice: Notice): string[] {
  const lines = [headingFor(notice), ""];
  if (notice.state === "carried") {
    lines.push(
      `Declared as ${notice.licence ?? ""} in the package's own package.json. ${
        notice.texts.length === 1 ? "One file below, as the package publishes it." : `${notice.texts.length} files below, as the package publishes them.`
      }`,
      "",
    );
    for (const text of notice.texts) {
      lines.push(`From \`${text.fileName}\` in the package:`, "", "```", ...text.text.slice(0, -1).split("\n"), "```", "");
    }
    return lines;
  }
  const label =
    notice.state === "not-published"
      ? "NO TEXT PUBLISHED"
      : notice.state === "not-read-on-this-route"
        ? "NOT READ ON THIS ROUTE"
        : "TERMS NEVER ESTABLISHED";
  lines.push(`${label}: ${notice.why ?? ""}`, "");
  return lines;
}

// The page. Generated in full on every run, including its own header, so that
// nothing in it is maintained by hand and a hand edit shows up as drift rather
// than surviving.
export function renderDocument(input: Input, entries: readonly Notice[]): string {
  const carried = entries.filter((notice) => notice.state === "carried");
  const notPublished = entries.filter((notice) => notice.state === "not-published");
  const unread = entries.filter((notice) => notice.state === "not-read-on-this-route");
  const files = carried.reduce((total, notice) => total + notice.texts.length, 0);

  return [
    "# Third-party notices",
    "",
    "Generated. Nothing here is written by hand, and a hand edit is refused as drift",
    "rather than kept. The command that produces it is the notices script in",
    "`package.json`, and the check that refuses a stale copy is `check:notices`.",
    "",
    "Almost every licence in the set below asks that its terms and its copyright line",
    "travel with the software. This page is where they travel. Each text is reproduced",
    "as the package publishes it, read out of the store the lock file resolves to.",
    "",
    "Two departures from the published bytes, and there are no others. A carriage",
    "return is folded out, because git stores this page under one line ending and a",
    "page carrying both would drift against its own regeneration depending on how a",
    "clone materialised it. A final newline is added where a package's file ends",
    "without one, so the closing fence sits on a line of its own.",
    "",
    "## What this does not cover",
    "",
    `The set is the set \`${input.billPath}\` names, and that document says what decides`,
    "membership. It is one lock file and therefore one ecosystem. The upstream design",
    "tool's own dependency set, in three other languages, and the rendering library and",
    "its binaries, are not here: this repository holds a pin to that revision and no",
    "route to build it, so nothing on this page is evidence about what an operator",
    "would actually ship. Issue #98 is where the pinned revision becomes runnable and",
    "issue #65 is where those notices are carried through rather than replaced.",
    "",
    "Whether a licence requires its text to be reproduced at all, and whether the text",
    "a package publishes is the text its licence requires, are judgements. Nothing here",
    "makes either one. What this does is carry what each package publishes, name every",
    "package that publishes none, and count both.",
    "",
    "## What could not be carried",
    "",
    `${notPublished.length} package(s) declare a licence and publish no file naming its terms. Nothing`,
    "could be carried for them and they are named below rather than left out, because a",
    "redistributor who cannot find the notice has to know that the package supplies",
    "none rather than that nobody looked.",
    "",
    `${unread.length} package(s) are restricted by the lock file to a platform other than the one`,
    "this page is generated on, so they were never installed here and nothing about",
    "them was read at all. That is a different state from the one above and it is kept",
    "separate: no single machine installs every platform's binaries, and reading these",
    "needs a generation route that runs on each of them, which this repository does not",
    "have.",
    "",
    "## The notices",
    "",
    `${entries.length} package(s). ${carried.length} carry a licence text here, across ${files} published file(s).`,
    "",
    ...entries.flatMap((notice) => section(notice)),
  ].join("\n");
}

// The drift comparison is over the text and not over the bytes, for the reason the
// bill of materials gives about it: this repository declares no `.gitattributes`,
// so a clone with `core.autocrlf` set puts a carriage return on every line of a
// tracked file that git stores with none, and a byte comparison then reports a
// page nobody touched as edited.
function sameText(left: string, right: string): boolean {
  return left.replaceAll("\r\n", "\n") === right.replaceAll("\r\n", "\n");
}

export const rules: readonly Rule[] = [
  {
    id: "dependency-whose-terms-were-never-established",
    prevents:
      "a page that reads as a notice carrying a section for a dependency nobody established terms for, which is the one entry a redistributor most needs to see refused rather than published",
    bound:
      "the state the bill of materials derived for each package. This run does not run the bill of materials' own check, so the state arrives here whether or not that check was run, which is why the refusal is repeated over this page rather than assumed from the other one. It says nothing about whether a determined licence is the licence the package's files carry",
    find(input, entries) {
      return entries
        .filter((notice) => notice.state === "undetermined")
        .map((notice) => ({
          where: `${notice.name}@${notice.version}`,
          detail: `is named by ${input.billPath} and ${notice.why ?? "nothing was determined about its licence"}, so there is nothing here that could be published as its notice`,
        }));
    },
  },
  {
    id: "licence-file-that-carries-no-text",
    prevents:
      "an empty file named LICENSE being reproduced as though it were a notice, which puts a heading, a licence identifier and a blank block on the page and reads exactly like a notice that was carried",
    bound:
      "whether a file this route read has any character in it that is not whitespace. It cannot judge whether what is in the file is a licence, so a file carrying one word passes it",
    find(input, entries) {
      const refusals: Refusal[] = [];
      for (const notice of entries) {
        for (const text of notice.texts) {
          if (text.text.trim().length > 0) continue;
          refusals.push({
            where: `${notice.name}@${notice.version}`,
            detail: `publishes \`${text.fileName}\` with nothing in it but whitespace, so carrying it would put an empty block on the page under a heading that says a notice was carried`,
          });
        }
      }
      return refusals;
    },
  },
  {
    id: "third-party-notices-out-of-date",
    prevents:
      "the page drifting away from the dependency set it claims to be generated from, which is what turns a generated notice back into a hand-maintained one without anybody deciding to, and which in this register means shipping somebody else's copyright line for a version that is no longer installed",
    bound:
      "a comparison of the text against what this run would generate, with carriage returns folded out of both sides first. It says nothing about whether the generated page is the right shape, only that the tracked copy carries the text this input produces, and nothing at all about which line ending a working tree holds",
    find(input, _entries, document) {
      if (input.tracked === undefined) {
        return [{ where: input.documentPath, detail: "does not exist, and this run would generate it" }];
      }
      if (sameText(input.tracked, document)) return [];
      return [
        {
          where: input.documentPath,
          detail:
            "differs from what this run generates, so the tracked copy was edited by hand or the dependency set moved under it",
        },
      ];
    },
  },
];

export const ruleIds: readonly string[] = rules.map((rule) => rule.id);

export function checkNotices(
  input: Input,
  enabled: ReadonlySet<string> = new Set(ruleIds),
): { report: Report; document: string } {
  const entries = notices(input);
  const document = renderDocument(input, entries);
  const running = rules.filter((rule) => enabled.has(rule.id));
  const refusals: string[] = [];

  for (const rule of running) {
    for (const refusal of rule.find(input, entries, document)) {
      refusals.push(`${rule.id}: ${refusal.where}: ${refusal.detail}`);
    }
  }

  const carried = entries.filter((notice) => notice.state === "carried");
  const notPublished = entries.filter((notice) => notice.state === "not-published");
  const unread = entries.filter((notice) => notice.state === "not-read-on-this-route");
  const undetermined = entries.filter((notice) => notice.state === "undetermined");
  const files = carried.reduce((total, notice) => total + notice.texts.length, 0);

  const lines = [
    `examined ${entries.length} package(s) named by ${input.billPath}, under ${running.length} of ${rules.length} rule(s).`,
    `${carried.length} of ${entries.length} package(s) publish a licence text this run carried, across ${files} file(s).`,
    `${notPublished.length} package(s) declare a licence and publish no text for it, so nothing could be carried and each is named on the page with that reason.`,
    `${unread.length} package(s) are restricted by the lock file to another platform, so nothing about them was read on this route and this run is no evidence about them.`,
    `${undetermined.length} package(s) reached this page with no licence determined at all, which ${input.billPath} refuses before this run sees it.`,
    "the set is one lock file and therefore one ecosystem. The upstream design tool's own dependency set is reached by none of it, so no run here is evidence about it.",
    ...running.map((rule) => `${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`),
  ];

  const off = ruleIds.filter((id) => !enabled.has(id));
  if (off.length > 0) {
    lines.push(`NOT run on this run, so this run says nothing about them: ${off.join(", ")}.`);
  }

  return { report: { lines, refusals, repair }, document };
}
