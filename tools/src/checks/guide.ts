// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Refuses a contributor guide that names a path which does not resolve or a
// script which does not exist.
//
// The failure it prevents is the one the guide's own done-condition names. A
// guide is read by somebody who cannot yet tell a stale sentence from a current
// one, so a path that was renamed and a command that was dropped both read as
// instructions until they are followed and fail. Prose rots quietly; this is what
// makes it fail loudly instead.
//
// Reads no file: the runner supplies the text, the tracked paths and the script
// names, so the suite can put a stale guide in front of this without writing one
// into the tree.

import type { Report } from "./report.ts";

export const repair =
  "correct the guide, or add the path or the script it names. A guide may name only what exists.";

// A path inside backticks. The trailing-slash form is a directory, and a path
// with no slash and no dot is prose rather than a path, so neither is looked up
// as a file name on its own.
const backticked = /`([^`\n]+)`/g;

// `corepack pnpm run <script>`, in an indented command block or inside backticks.
const scriptUse = /corepack pnpm run ([a-z][a-z0-9:-]*)/g;

// A backticked span that looks like a path this tree should carry. Anything else
// inside backticks is a field name, a setting, a version or a quoted line, and
// judging those as paths would refuse the guide for saying `engines.node`.
export function looksLikeATrackedPath(span: string): boolean {
  if (span.includes(" ")) return false;
  if (span.startsWith("http")) return false;
  // A bare dotted name is a field, not a path: engines.node, coverage.all.
  if (!span.includes("/")) return false;
  // A package name rather than a path in this tree.
  if (span.startsWith("@")) return false;
  return true;
}

// Every backticked span in the guide that is being offered as a path. Exported so
// the runner can ask git about each one before the decision is made.
export function pathsNamedBy(guide: string): string[] {
  const found: string[] = [];
  for (const [, span] of guide.matchAll(backticked)) {
    if (span !== undefined && looksLikeATrackedPath(span)) found.push(span);
  }
  return found;
}

export function checkGuide(
  guide: string,
  trackedPaths: readonly string[],
  producedPaths: readonly string[],
  scriptNames: readonly string[],
): Report {
  const tracked = new Set(trackedPaths);
  // A directory resolves when anything tracked sits under it.
  const directories = new Set(trackedPaths.flatMap((path) => {
    const parts = path.split("/");
    return parts.slice(0, -1).map((_, index) => `${parts.slice(0, index + 1).join("/")}/`);
  }));

  // A path git is told to ignore is one this project's own runs write. The guide
  // is allowed to name where a run puts its output, and such a path is counted
  // apart from the tracked ones rather than folded in with them, so the run says
  // how much of what it examined it judged against the tree.
  const produced = new Set(producedPaths);

  const refusals: string[] = [];
  const paths = pathsNamedBy(guide);
  let outputs = 0;

  for (const span of paths) {
    if (produced.has(span)) {
      outputs += 1;
      continue;
    }
    const resolves = span.endsWith("/") ? directories.has(span) : tracked.has(span);
    if (!resolves) refusals.push(`the guide names \`${span}\`, which is neither a tracked path nor a path this tree's runs write`);
  }

  const scripts: string[] = [];
  for (const [, name] of guide.matchAll(scriptUse)) {
    if (name === undefined) continue;
    scripts.push(name);
    if (!scriptNames.includes(name)) refusals.push(`the guide names the script \`${name}\`, which package.json does not define`);
  }

  const lines = [
    `examined the guide: ${paths.length} backticked path(s), of which ${outputs} are paths a run writes rather than tracked files, and ${scripts.length} script name(s).`,
    "it does NOT judge: a command written without `corepack pnpm run`, a path written outside backticks, or whether any sentence in the guide is true.",
  ];

  return { lines, refusals, repair };
}
