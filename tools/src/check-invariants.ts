// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Asks git which paths are tracked, reads the ones that are text, collects
// the names a check in this tree can be referred to, and hands all of it to the
// decision in tools/src/checks/invariants.ts, which is where the suite reaches it.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPackageJson, repoRoot } from "./pins.ts";
import { checkInvariants, declaredCheckNames, type TextFile } from "./checks/invariants.ts";
import { emit, passed } from "./checks/report.ts";

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

// A tracked file is read as text unless its bytes say otherwise. Deciding by
// extension would need a table of every binary format somebody might add, and the
// table would be wrong the first time one arrived; a NUL byte is what actually
// distinguishes the two.
const files: TextFile[] = [];
for (const path of tracked) {
  const bytes = readFileSync(join(repoRoot, path));
  if (bytes.includes(0)) continue;
  files.push({ path, text: bytes.toString("utf8") });
}

const workflows = files.filter(
  (file) => file.path.startsWith(".github/workflows/") && (file.path.endsWith(".yml") || file.path.endsWith(".yaml")),
);
const scripts = loadPackageJson() as { scripts?: Record<string, string> };

const report = checkInvariants(files, {
  declaredNames: declaredCheckNames(workflows, Object.keys(scripts.scripts ?? {})),
});
emit(report);
if (!passed(report)) process.exit(1);
