// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The rules a tracked document is judged against, and the one place they are
// listed. Each rule carries the failure it prevents and the bound on what it
// reaches, and the run prints both, so what a green run means is derived from
// this table rather than from a sentence somewhere describing it.
//
// Why this is a check rather than a habit: a document's paths and links rot in
// silence. Code that names a file which moved stops compiling; a paragraph that
// names it goes on reading like an instruction until somebody follows it and
// finds nothing there. The reader who is hurt is the one who cannot yet tell a
// stale sentence from a current one, which is every new reader.
//
// Reads no file and runs no git command: the runner supplies the documents and
// what git says exists, so the suite can put a stale document in front of this
// without writing one into the tree.

import type { Report } from "./report.ts";
import { looksLikeATrackedPath } from "./guide.ts";

export type TextFile = { path: string; text: string };

export type Finding = { path: string; line: number; detail: string };

export type Context = {
  // Every path git tracks.
  trackedPaths: ReadonlySet<string>;
  // Every directory something tracked sits under, with a trailing slash. git has
  // no directories of its own, so this is the only sense in which one exists.
  trackedDirectories: ReadonlySet<string>;
  // Paths this project's own runs write. git is told to ignore them, so they are
  // never tracked, and a document is allowed to say where a run puts its output.
  producedPaths: ReadonlySet<string>;
  // The documents being judged, by path, so a link into another one can be
  // resolved against that document's own headings.
  documents: ReadonlyMap<string, TextFile>;
};

// What every rule states about itself, printed on every run. A rule whose bound
// is not stated is read as covering everything it plausibly could.
type Stated = {
  // The stable name a refusal is reported under.
  id: string;
  // What goes wrong when this is violated.
  prevents: string;
  // What this one does not reach.
  bound: string;
};

// A rule that judges one document at a time.
export type Rule = Stated & {
  judges: (path: string) => boolean;
  find: (file: TextFile, context: Context) => Finding[];
};

// A rule about the set rather than about a document, which a rule judging one
// file at a time cannot see.
export type SetRule = Stated & {
  find: (files: readonly TextFile[], context: Context) => string[];
};

export const repair =
  "correct the document, or add the path, the link target or the heading it names. Where the document is right and the rule is wrong, argue the change to the rule table in tools/src/checks/docs.ts.";

function markdownOnly(path: string): boolean {
  return path.endsWith(".md");
}

function isDecisionRecord(path: string): boolean {
  return path.startsWith("docs/decisions/") && path.endsWith(".md");
}

function lineNumberOf(text: string, index: number): number {
  let line = 1;
  for (let at = 0; at < index; at += 1) if (text.charCodeAt(at) === 10) line += 1;
  return line;
}

// The lines of a document, with the carriage return a checkout on Windows leaves
// on the end of each one removed. Without this every rule that compares a whole
// line is green on one platform and red on another, which is worse than a rule
// that does not exist.
function linesOf(text: string): string[] {
  return text.split("\n").map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
}

// Paths this project intends to carry and does not carry yet. A document may name
// one, because the decision that creates it is already argued and a reader
// following that argument needs the name. The register fails closed in both
// directions: an entry naming a path that has arrived is refused as stale, so it
// cannot outlive the absence it describes.
export const plannedPaths: ReadonlyMap<string, { reason: string; retiredBy: string }> = new Map([
  [
    "overlay/",
    {
      reason: "where a change to the upstream tool lives, fixed by record 0002 before any such change exists",
      retiredBy: "the first change that lands one, which is what issues #4 and #10 wait for",
    },
  ],
]);

// A span carrying a placeholder rather than a path: the four digits a decision
// record's number is written as before it is allocated, or an angle-bracketed
// stand-in. Judging one as a path would refuse the record that states the naming
// convention for stating it.
const placeholder = /NNNN|<[^>]*>/;

const backticked = /`([^`\n]+)`/g;

// An inline Markdown link. The target is taken up to the first whitespace so that
// a title written after it does not become part of it.
const markdownLink = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// A scheme, which means the target is not a path in this tree.
const hasScheme = /^[a-z][a-z0-9+.-]*:/i;

// A level-one to level-six ATX heading.
const heading = /^(#{1,6})\s+(.+?)\s*$/;

// The anchor a Markdown heading is reachable by, in the form the renderer these
// documents are read through produces: lower case, anything that is not a letter,
// a digit, a space or a hyphen dropped, spaces to hyphens.
export function anchorFor(headingText: string): string {
  return headingText
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function anchorsIn(text: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  for (const line of linesOf(text)) {
    const match = line.match(heading);
    if (match?.[2] === undefined) continue;
    const base = anchorFor(match[2]);
    const previous = seen.get(base);
    // A repeated heading takes a numeric suffix, which is what the renderer does
    // and what a link to the second one has to be written as.
    if (previous === undefined) {
      seen.set(base, 0);
      anchors.add(base);
    } else {
      seen.set(base, previous + 1);
      anchors.add(`${base}-${previous + 1}`);
    }
  }
  return anchors;
}

// Resolve a link target written relative to the document carrying it. No
// filesystem is touched: this is string arithmetic over the paths git reports, so
// the answer does not change with the separator the machine uses.
export function resolveRelative(from: string, target: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const segment of target.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  const joined = parts.join("/");
  return target.endsWith("/") ? `${joined}/` : joined;
}

function resolves(path: string, context: Context): boolean {
  if (path.endsWith("/")) return context.trackedDirectories.has(path);
  return context.trackedPaths.has(path) || context.producedPaths.has(path);
}

export const rules: readonly Rule[] = [
  {
    id: "named-path-resolves",
    prevents:
      "a document sending a reader to a file that is not there, which reads as an instruction until it is followed, and which cannot be told from a file that was renamed",
    bound:
      "backticked spans in tracked Markdown that carry a slash and no space. A path written outside backticks, a bare file name with no directory in it, and a path named in a comment inside a workflow file are all outside it, because a bare-word extractor over prose refuses ordinary sentences",
    judges: markdownOnly,
    find(file, context) {
      const findings: Finding[] = [];
      for (const match of file.text.matchAll(backticked)) {
        const span = match[1];
        if (span === undefined) continue;
        if (!looksLikeATrackedPath(span)) continue;
        if (placeholder.test(span)) continue;
        if (plannedPaths.has(span)) continue;
        if (resolves(span, context)) continue;
        findings.push({
          path: file.path,
          line: lineNumberOf(file.text, match.index),
          detail: `names \`${span}\`, which is neither a tracked path, a path this tree's runs write, nor a planned path the register in tools/src/checks/docs.ts declares`,
        });
      }
      return findings;
    },
  },
  {
    id: "link-resolves",
    prevents:
      "a link inside this tree that leads nowhere, which a reader finds by following it and an author never finds at all",
    bound:
      "the file half and the anchor half of an inline Markdown link whose target has no scheme. A link to another host is not fetched, so nothing here says whether it answers; a reference-style link is not reached, and an anchor is matched against the headings of the target document and against nothing else in it",
    judges: markdownOnly,
    find(file, context) {
      const findings: Finding[] = [];
      for (const match of file.text.matchAll(markdownLink)) {
        const target = match[1];
        if (target === undefined) continue;
        if (hasScheme.test(target)) continue;
        const line = lineNumberOf(file.text, match.index);
        const hash = target.indexOf("#");
        const filePart = hash === -1 ? target : target.slice(0, hash);
        const anchor = hash === -1 ? "" : target.slice(hash + 1);

        let anchorSource = file;
        if (filePart !== "") {
          const resolved = resolveRelative(file.path, filePart);
          if (!resolves(resolved, context)) {
            findings.push({ path: file.path, line, detail: `links to ${target}, and ${resolved} is not in this tree` });
            continue;
          }
          anchorSource = context.documents.get(resolved) ?? { path: resolved, text: "" };
        }
        if (anchor === "") continue;
        if (anchorsIn(anchorSource.text).has(anchor)) continue;
        findings.push({
          path: file.path,
          line,
          detail: `links to ${target}, and no heading in ${anchorSource.path} carries the anchor #${anchor}`,
        });
      }
      return findings;
    },
  },
  {
    id: "record-follows-the-convention",
    prevents:
      "a decision record a reader cannot find by its number, and one whose status and issue have to be searched for rather than read off the top",
    bound:
      "the file name, the first heading and the two lines under it, against the convention record 0001 states. Whether the heading describes the decision the record makes is a judgement no reading of the tree makes",
    judges: isDecisionRecord,
    find(file) {
      const findings: Finding[] = [];
      const name = file.path.slice("docs/decisions/".length);
      const shape = name.match(/^([0-9]{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
      if (shape?.[1] === undefined) {
        findings.push({
          path: file.path,
          line: 1,
          detail:
            "is named against the convention record 0001 states: four digits, a hyphen, then lower case words joined by hyphens",
        });
        return findings;
      }

      const lines = linesOf(file.text);
      const first = lines[0] ?? "";
      const declared = first.match(/^# ([0-9]{4})\. \S/);
      if (declared?.[1] === undefined) {
        findings.push({
          path: file.path,
          line: 1,
          detail: `opens with ${JSON.stringify(first)} rather than a level-one heading reading the four-digit number, a full stop, and a sentence naming the decision`,
        });
      } else if (declared[1] !== shape[1]) {
        findings.push({
          path: file.path,
          line: 1,
          detail: `is numbered ${shape[1]} by its file name and ${declared[1]} by its heading, so a reader looking for either one finds a record claiming to be the other`,
        });
      }

      const header: { line: number; text: string }[] = [];
      for (let at = 1; at < lines.length && header.length < 2; at += 1) {
        const text = lines[at] ?? "";
        if (text.trim() === "") continue;
        header.push({ line: at + 1, text });
      }
      for (const [at, field] of ["Status", "Issue"].entries()) {
        const found = header[at];
        if (found !== undefined && found.text.startsWith(`${field}: `) && found.text.endsWith(".")) continue;
        findings.push({
          path: file.path,
          line: found?.line ?? 1,
          detail: `does not carry \`${field}:\` as the ${at === 0 ? "first" : "second"} line under its heading, ending in a full stop`,
        });
      }
      return findings;
    },
  },
];

export const setRules: readonly SetRule[] = [
  {
    id: "record-number-is-unique",
    prevents: "two records answering to one number, which makes every reference to that number ambiguous",
    bound: "the four digits a record's file name starts with, and no number written inside a record",
    find(files) {
      const byNumber = new Map<string, string[]>();
      for (const file of files) {
        if (!isDecisionRecord(file.path)) continue;
        const number = file.path.slice("docs/decisions/".length, "docs/decisions/".length + 4);
        if (!/^[0-9]{4}$/.test(number)) continue;
        byNumber.set(number, (byNumber.get(number) ?? []).concat(file.path));
      }
      const refusals: string[] = [];
      for (const [number, paths] of [...byNumber].sort()) {
        if (paths.length < 2) continue;
        // Sorted, so the refusal does not change with the order git happened to
        // list the two files in.
        refusals.push(`${[...paths].sort().join(" and ")} both claim number ${number}`);
      }
      return refusals;
    },
  },
  {
    id: "planned-path-has-arrived",
    prevents:
      "the register of paths this tree does not carry yet outliving the absence it describes, which would leave a document naming a path that nothing checks any more",
    bound:
      "the entries in that register. It says nothing about a planned path nobody wrote down, and a document naming one of those is refused by named-path-resolves instead",
    find(_files, context) {
      const refusals: string[] = [];
      for (const [path, { retiredBy }] of plannedPaths) {
        if (!resolves(path, context)) continue;
        refusals.push(
          `the register still declares \`${path}\` absent and the tree now carries it, so the entry is stale. What retires it was ${retiredBy}`,
        );
      }
      return refusals;
    },
  },
];

export const ruleIds: readonly string[] = [...rules, ...setRules].map((rule) => rule.id);

export function checkDocuments(
  files: readonly TextFile[],
  context: Omit<Context, "documents">,
  enabled: ReadonlySet<string> = new Set(ruleIds),
): Report {
  const full: Context = { ...context, documents: new Map(files.map((file) => [file.path, file])) };
  const running = rules.filter((rule) => enabled.has(rule.id));
  const runningSet = setRules.filter((rule) => enabled.has(rule.id));
  const refusals: string[] = [];

  for (const rule of running) {
    for (const file of files) {
      if (!rule.judges(file.path)) continue;
      for (const finding of rule.find(file, full)) {
        refusals.push(`${rule.id}: ${finding.path}:${finding.line}: ${finding.detail}`);
      }
    }
  }
  for (const rule of runningSet) {
    for (const refusal of rule.find(files, full)) refusals.push(`${rule.id}: ${refusal}`);
  }

  const records = files.filter((file) => isDecisionRecord(file.path)).length;
  const lines = [
    `examined ${files.length} tracked document(s), ${records} of them decision records, against ${
      running.length + runningSet.length
    } of ${rules.length + setRules.length} rule(s).`,
    ...[...running, ...runningSet].map((rule) => `${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`),
    `the planned-path register declares ${plannedPaths.size} path(s) this tree does not carry yet: ${[...plannedPaths]
      .map(([path, { reason }]) => `\`${path}\`, ${reason}`)
      .join("; ")}.`,
  ];

  const off = ruleIds.filter((id) => !enabled.has(id));
  if (off.length > 0) {
    lines.push(`NOT run on this run, so this run says nothing about them: ${off.join(", ")}.`);
  }

  return { lines, refusals, repair };
}
