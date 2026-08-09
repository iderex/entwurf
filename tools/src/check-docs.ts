// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Reads every tracked Markdown document, asks git which paths are tracked
// and which of the ones the documents name are written by a run rather than
// tracked, and hands all of it to the decision in tools/src/checks/docs.ts.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { checkDocuments, type TextFile } from "./checks/docs.ts";
import { ignoredPathsIn, looksLikeATrackedPath } from "./checks/guide.ts";
import { emit, passed } from "./checks/report.ts";

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const documents: TextFile[] = tracked
  .filter((path) => path.endsWith(".md"))
  .map((path) => ({ path, text: readFileSync(join(repoRoot, path), "utf8") }));

const trackedDirectories = new Set(
  tracked.flatMap((path) => {
    const parts = path.split("/");
    return parts.slice(0, -1).map((_, index) => `${parts.slice(0, index + 1).join("/")}/`);
  }),
);

// git's own answer to which of the paths the documents name this tree ignores,
// rather than a second reading of .gitignore here that could disagree with it. A
// path git is told to ignore is one this project's own runs write, and a document
// is allowed to say where a run puts its output. Exit 0 means at least one path
// was ignored, 1 means none were, and anything else is a failure to ask.
const backticked = /`([^`\n]+)`/g;
const candidates = new Set<string>();
for (const document of documents) {
  for (const match of document.text.matchAll(backticked)) {
    const span = match[1];
    if (span !== undefined && looksLikeATrackedPath(span)) candidates.add(span);
  }
}

const asked = spawnSync("git", ["check-ignore", "-v", "--stdin"], {
  cwd: repoRoot,
  input: [...candidates].join("\n"),
  encoding: "utf8",
});
if (asked.status !== 0 && asked.status !== 1) {
  console.error(`REFUSED  git could not be asked which paths are ignored (exit ${asked.status}): ${asked.stderr}`);
  process.exit(1);
}
const producedPaths = new Set(ignoredPathsIn(asked.stdout));

const report = checkDocuments(documents, {
  trackedPaths: new Set(tracked),
  trackedDirectories,
  producedPaths,
});
emit(report);
if (!passed(report)) process.exit(1);
