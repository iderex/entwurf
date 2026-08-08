// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Reads the guide, asks git which of the paths it names are tracked and
// which are ignored, reads the script names, and hands all of it to the decision
// in tools/src/checks/guide.ts.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPackageJson, repoRoot } from "./pins.ts";
import { checkGuide, pathsNamedBy } from "./checks/guide.ts";
import { emit, passed } from "./checks/report.ts";

const guide = readFileSync(join(repoRoot, "CONTRIBUTING.md"), "utf8");

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

// git's own answer to which paths this tree ignores, rather than a second reading
// of .gitignore here that could disagree with it. Exit 0 means at least one path
// was ignored, 1 means none were, and anything else is a failure to ask.
const candidates = pathsNamedBy(guide);
const asked = spawnSync("git", ["check-ignore", "--stdin"], {
  cwd: repoRoot,
  input: candidates.join("\n"),
  encoding: "utf8",
});
if (asked.status !== 0 && asked.status !== 1) {
  console.error(`REFUSED  git could not be asked which paths are ignored (exit ${asked.status}): ${asked.stderr}`);
  process.exit(1);
}
const produced = asked.stdout.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

const scripts = loadPackageJson() as { scripts?: Record<string, string> };

const report = checkGuide(guide, tracked, produced, Object.keys(scripts.scripts ?? {}));
emit(report);
if (!passed(report)) process.exit(1);
