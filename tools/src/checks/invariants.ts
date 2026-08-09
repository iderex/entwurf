// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The invariants that are string facts about the tree, and the one place they are
// listed. Each entry carries the failure it prevents and the bound on what it
// judges, and the run prints both, so the list a reader trusts is derived from
// this table rather than restated in a document that would drift against it.
//
// Reads no file and runs no git command: the runner supplies the file contents
// and the declared check names, so the suite can put a leaked token, a developer
// path or an unpaired number in front of these without writing one into the tree.

import type { Report } from "./report.ts";

export type TextFile = { path: string; text: string };

export type Finding = { path: string; line: number; detail: string };

export type Context = {
  // Every name a check can be referred to by in this tree: the workflow names,
  // the job ids and job names inside them, and the script names package.json
  // defines.
  declaredNames: ReadonlySet<string>;
  // The names the server reports a check run under, which is a smaller set than
  // the one above: one per job rather than one per workflow, job id and script
  // name as well. These are the strings a ruleset requires by, so they are the
  // ones the list is about.
  checkRunNames: ReadonlySet<string>;
  // The names the list in docs/quality/check-names.md gives a section to. Empty
  // where that document is absent, which refuses every declared name rather than
  // passing a tree that has lost its list.
  listedCheckNames: ReadonlySet<string>;
};

export type Invariant = {
  // The stable name a refusal is reported under.
  id: string;
  // What goes wrong when this is violated, printed on every run.
  prevents: string;
  // What this one does not reach, printed on every run beside the failure it
  // prevents, because an invariant whose bound is not stated is read as covering
  // everything it plausibly could.
  bound: string;
  // Which tracked files it is willing to judge.
  judges: (path: string) => boolean;
  find: (file: TextFile, context: Context) => Finding[];
};

export const repair =
  "correct the offending line, or, where the line is right and the invariant is wrong, argue the change to the invariant table in tools/src/checks/invariants.ts.";

function everyTextFile(): boolean {
  return true;
}

function markdownOnly(path: string): boolean {
  return path.endsWith(".md");
}

// The document the check names are listed in. Named here rather than passed in,
// because the rule below is about that one page and a rule that took its subject
// from a caller could be pointed at a page nobody reads.
export const checkNameList = "docs/quality/check-names.md";

function workflowOnly(path: string): boolean {
  return path.startsWith(".github/workflows/") && (path.endsWith(".yml") || path.endsWith(".yaml"));
}

function workflowOrTheList(path: string): boolean {
  return workflowOnly(path) || path === checkNameList;
}

function lineNumberOf(text: string, index: number): number {
  let line = 1;
  for (let at = 0; at < index; at += 1) if (text.charCodeAt(at) === 10) line += 1;
  return line;
}

// Credential shapes with a distinctive prefix and a payload length. Entropy is
// deliberately not judged: this tree carries a lock file full of base64 integrity
// hashes and a package manager pinned by a sha512, and a rule about randomness
// would refuse both. Each pattern is written so that its own source text does not
// match it, since this file is one of the files the check reads.
const secretShapes: { name: string; pattern: RegExp }[] = [
  { name: "a private key block", pattern: /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/g },
  { name: "a GitHub token", pattern: /\bgh[posur]_[A-Za-z0-9]{36,}\b/g },
  { name: "a GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
  { name: "an AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "a Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{16,}\b/g },
];

// A path under somebody's home directory, on any of the three platforms. The
// mistake this catches is a pasted command output rather than a hand-written
// path, which is why it looks for the home directory and not for a leading slash:
// this project pastes the output of commands into its documents everywhere, and
// that output carries whatever machine it was produced on.
const developerHomePath = /(?:[A-Za-z]:[\\/]Users[\\/]|\/home\/|\/Users\/)[A-Za-z0-9._-]+(?=[\\/\s"'`,;:)\]]|$)/g;

// A backticked span shaped like a name in this tree's check namespace: lower
// case, and separated by a hyphen or a colon.
const backtickedSpan = /`([^`\n]+)`/g;
const checkNameShape = /^[a-z][a-z0-9]*([:-][a-z0-9]+)+$/;

// Spans that carry the shape of a check name and are not one. Each entry states
// why, and the register fails closed: a new tool or option written in that shape
// reddens the run until it is either corrected or added here with its reason.
export const notCheckNames: ReadonlyMap<string, string> = new Map([
  [
    "node:module",
    "a Node builtin module specifier, and the node: prefix is reserved by the runtime, so it can never be a check name here",
  ],
  ["shadow-cljs", "the upstream project's browser build tool, named in record 0001"],
]);

// What makes a check name move on its own. Each shape is something the name would
// carry from outside the name: a version that a bump rewrites, a date that a
// re-run rewrites, and an expression the runner substitutes per matrix leg, which
// produces one check run per leg and a different set of names the day the matrix
// gains a value. A ruleset requires a check by its literal name, so any of the
// three silently empties the required set rather than failing.
const unstableShapes: { name: string; pattern: RegExp }[] = [
  { name: "a date", pattern: /\b[0-9]{4}-[0-9]{2}-[0-9]{2}\b/ },
  { name: "a version", pattern: /\bv?[0-9]+\.[0-9]+(?:\.[0-9]+)?\b/ },
  { name: "an expression the runner substitutes", pattern: /\$\{\{/ },
];

// A duration written as a number followed by ms, which is the unit record 0004
// gives every duration metric it defines.
const duration = /\b[0-9]+(?:\.[0-9]+)?\s?ms\b/g;
// The companion record 0004 requires to travel with a median in every place a
// number appears.
const spread = /95th percentile|p95/i;

export const invariants: readonly Invariant[] = [
  {
    id: "no-secret-shaped-value",
    prevents:
      "a credential reaching the tree, where it is public the moment the branch is pushed and stays in the history after it is deleted",
    bound:
      "named credential shapes with a distinctive prefix. It judges no other value, and in particular it does not judge entropy, so a password with no prefix walks past it",
    judges: everyTextFile,
    find(file) {
      const findings: Finding[] = [];
      for (const { name, pattern } of secretShapes) {
        for (const match of file.text.matchAll(pattern)) {
          findings.push({
            path: file.path,
            line: lineNumberOf(file.text, match.index),
            detail: `carries ${name}`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "no-developer-machine-path",
    prevents:
      "a document instructing a reader to use a path that exists only on the machine it was written on, and naming whoever sat at that machine while doing it",
    bound:
      "a path under a home directory on Windows, Linux or macOS. An absolute path elsewhere on a machine, such as one under a drive root or /opt, is not reached",
    judges: everyTextFile,
    find(file) {
      const findings: Finding[] = [];
      for (const match of file.text.matchAll(developerHomePath)) {
        findings.push({
          path: file.path,
          line: lineNumberOf(file.text, match.index),
          detail: `names ${match[0]}, which is a path on somebody's own machine`,
        });
      }
      return findings;
    },
  },
  {
    id: "no-unknown-check-name",
    prevents:
      "a document naming a check that does not exist, which a reader looks for, does not find, and cannot tell from a check that was renamed",
    bound:
      "backticked spans in tracked Markdown that carry the shape of a check name. A check named in prose without backticks, or named as a bare word with no hyphen or colon in it, is not reached, because a bare word in this tree's prose is more often a tool or an option than a check",
    judges: markdownOnly,
    find(file, context) {
      const findings: Finding[] = [];
      for (const match of file.text.matchAll(backtickedSpan)) {
        const span = match[1];
        if (span === undefined) continue;
        if (!checkNameShape.test(span)) continue;
        if (notCheckNames.has(span)) continue;
        if (context.declaredNames.has(span)) continue;
        findings.push({
          path: file.path,
          line: lineNumberOf(file.text, match.index),
          detail: `names \`${span}\`, which no workflow declares and package.json does not define`,
        });
      }
      return findings;
    },
  },
  {
    id: "no-unpaired-performance-number",
    prevents:
      "a median quoted on its own, which record 0004 calls wrong even when the median is right, because nobody complains about the typical frame",
    bound:
      "a duration written as a number followed by ms, in tracked Markdown, judged against the paragraph it sits in. A number written as a word, a byte count, a number in an issue or a commit message, and the machine conditions issue #16 will require are all outside it",
    judges: markdownOnly,
    find(file) {
      const findings: Finding[] = [];
      let offset = 0;
      for (const paragraph of file.text.split(/\n[ \t]*\n/)) {
        if (!spread.test(paragraph)) {
          const first = paragraph.match(duration);
          if (first !== null) {
            const at = paragraph.indexOf(first[0]);
            findings.push({
              path: file.path,
              line: lineNumberOf(file.text, offset + at),
              detail: `quotes ${first[0]} with no 95th percentile beside it in the same paragraph`,
            });
          }
        }
        // Two for the blank line the split consumed, which is the shortest
        // separator the pattern matches; a longer one shifts a reported line
        // number down the file and never up, so a finding still points into the
        // paragraph it came from.
        offset += paragraph.length + 2;
      }
      return findings;
    },
  },
  {
    id: "check-name-is-stable",
    prevents:
      "a check whose name moves with a version bump, a date or a matrix value, which a ruleset cannot keep requiring: the required context stops matching any check run, and a branch that requires a name nothing produces is one nothing is refused on",
    bound:
      "the name a job in a tracked workflow reports its check run under, read line by line. A name assembled somewhere other than a job's own `name:` key, and the workflow name above the jobs, are outside it, and so is any part of a run's identity the server composes rather than this tree writing it down",
    judges: workflowOnly,
    find(file) {
      const findings: Finding[] = [];
      for (const { name, line } of checkRunNamesIn(file)) {
        for (const shape of unstableShapes) {
          if (!shape.pattern.test(name)) continue;
          findings.push({
            path: file.path,
            line,
            detail: `reports a check run under ${JSON.stringify(name)}, which carries ${shape.name}`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "check-name-is-listed",
    prevents:
      "the list of check names drifting against the checks, in either direction: a check renamed or added without its entry leaves a reader asking what has to pass a page that does not say, and an entry outliving its check sends them looking for a run nothing produces",
    bound:
      "the names read out of the tracked workflows and the names the list gives a level-three heading to. What the entry beside a name says, and whether the default branch requires that name, are outside it: the ruleset is not in this tree, so no run here reads it and the list carries the command instead",
    judges: workflowOrTheList,
    find(file, context) {
      const findings: Finding[] = [];
      if (file.path === checkNameList) {
        for (const [name, line] of listedCheckNamesIn(file)) {
          if (context.checkRunNames.has(name)) continue;
          findings.push({
            path: file.path,
            line,
            detail: `lists ${JSON.stringify(name)}, which no job in a tracked workflow reports a check run under`,
          });
        }
        return findings;
      }
      for (const { name, line } of checkRunNamesIn(file)) {
        if (context.listedCheckNames.has(name)) continue;
        findings.push({
          path: file.path,
          line,
          detail: `reports a check run under ${JSON.stringify(name)}, which ${checkNameList} gives no entry`,
        });
      }
      return findings;
    },
  },
];

export const invariantIds: readonly string[] = invariants.map((invariant) => invariant.id);


// Every name a check in this tree can be referred to by. The parse is by line
// rather than by a YAML reader, because adding a parser would add a dependency
// for four fields; what it reads is the workflow name at column zero, the job ids
// two spaces in under `jobs:`, and a job's own name four spaces in. A workflow
// written with different indentation would be read as declaring fewer names,
// which fails towards a refusal rather than towards a pass.
export function declaredCheckNames(
  workflows: readonly TextFile[],
  scriptNames: readonly string[],
): Set<string> {
  const names = new Set<string>(scriptNames);
  for (const workflow of workflows) {
    let insideJobs = false;
    for (const line of workflow.text.split("\n")) {
      const workflowName = line.match(/^name:\s*(\S.*?)\s*$/);
      if (workflowName?.[1] !== undefined) names.add(workflowName[1]);
      if (/^jobs:\s*$/.test(line)) {
        insideJobs = true;
        continue;
      }
      if (/^\S/.test(line)) insideJobs = false;
      if (!insideJobs) continue;
      const jobId = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
      if (jobId?.[1] !== undefined) names.add(jobId[1]);
      const jobName = line.match(/^ {4}name:\s*(\S.*?)\s*$/);
      if (jobName?.[1] !== undefined) names.add(jobName[1]);
    }
  }
  return names;
}

// The name the server reports each job in one workflow under, with the line it is
// declared on. A job's `name:` is that name; a job with none is reported under its
// id, which is why the two are read together and not as one set. The parse is by
// line for the reason the parser above is: a job written with different
// indentation is read as declaring nothing, which leaves its name off the list and
// fails towards a refusal.
export function checkRunNamesIn(workflow: TextFile): { name: string; line: number }[] {
  const jobs: { id: string; line: number; name?: string }[] = [];
  let insideJobs = false;
  const lines = workflow.text.split("\n");
  for (const [at, raw] of lines.entries()) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (/^jobs:\s*$/.test(line)) {
      insideJobs = true;
      continue;
    }
    if (/^\S/.test(line)) insideJobs = false;
    if (!insideJobs) continue;
    const jobId = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (jobId?.[1] !== undefined) {
      jobs.push({ id: jobId[1], line: at + 1 });
      continue;
    }
    const jobName = line.match(/^ {4}name:\s*(\S.*?)\s*$/);
    const job = jobs.at(-1);
    if (jobName?.[1] === undefined || job === undefined || job.name !== undefined) continue;
    job.name = jobName[1];
    job.line = at + 1;
  }
  return jobs.map((job) => ({ name: job.name ?? job.id, line: job.line }));
}

export function checkRunNames(workflows: readonly TextFile[]): Set<string> {
  const names = new Set<string>();
  for (const workflow of workflows) for (const { name } of checkRunNamesIn(workflow)) names.add(name);
  return names;
}

// A name the list gives a section to, read from the level-three headings that
// carry one backticked span and nothing else. The heading is the entry: a name
// written in a sentence somewhere on the page is a mention rather than a listing,
// and reading those as entries would let a page that describes a check in passing
// pass for one that lists it.
const listEntry = /^###\s+`([^`]+)`\s*$/;

export function listedCheckNamesIn(list: TextFile | undefined): Map<string, number> {
  const names = new Map<string, number>();
  if (list === undefined) return names;
  for (const [at, raw] of list.text.split("\n").entries()) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    const entry = line.match(listEntry);
    if (entry?.[1] === undefined || names.has(entry[1])) continue;
    names.set(entry[1], at + 1);
  }
  return names;
}

export function checkInvariants(
  files: readonly TextFile[],
  context: Context,
  enabled: ReadonlySet<string> = new Set(invariantIds),
): Report {
  const running = invariants.filter((invariant) => enabled.has(invariant.id));
  const refusals: string[] = [];

  for (const invariant of running) {
    for (const file of files) {
      if (!invariant.judges(file.path)) continue;
      for (const finding of invariant.find(file, context)) {
        refusals.push(`${invariant.id}: ${finding.path}:${finding.line}: ${finding.detail}`);
      }
    }
  }

  const lines = [
    `examined ${files.length} tracked text file(s) against ${running.length} of ${invariants.length} invariant(s), judged against ${context.declaredNames.size} declared check name(s).`,
    `the workflows report ${context.checkRunNames.size} check run name(s), and the list gives an entry to ${context.listedCheckNames.size}. Which of them the default branch requires is read by no run here.`,
    ...running.map((invariant) => `${invariant.id} prevents ${invariant.prevents}. It reaches ${invariant.bound}.`),
  ];

  const off = invariantIds.filter((id) => !enabled.has(id));
  if (off.length > 0) {
    lines.push(`NOT run on this run, so this run says nothing about them: ${off.join(", ")}.`);
  }

  return { lines, refusals, repair };
}
