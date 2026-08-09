// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Asks tools/src/dependency-set.ts what this repository depends on and
// what the store says about each one, and hands both to the decision in
// tools/src/checks/bill-of-materials.ts, which is where the suite reaches it.
//
// Two modes and one decision behind them. With --write it puts the generated
// document in the tree; without it, it refuses a tracked copy that this run would
// not produce. The refusing mode never writes, for the reason the lock file check
// gives about repairing in silence: a check that quietly fixed the drift would
// hide the thing it exists to report.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { lockPath, readLockedPackages, readStore } from "./dependency-set.ts";
import { checkBillOfMaterials } from "./checks/bill-of-materials.ts";
import { emit, passed } from "./checks/report.ts";

const documentPath = "docs/legal/bill-of-materials.md";

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const lockFilesInTree = tracked.filter((path) =>
  /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|Cargo\.lock|deps\.edn|poetry\.lock|go\.sum)$/.test(path),
);

const { manifests, directories } = readStore();
const packages = readLockedPackages();
const named = new Set(packages.map((entry) => `${entry.name}@${entry.version}`));
const ignoredStoreEntries = manifests.filter((manifest) => !named.has(`${manifest.name}@${manifest.version}`)).length;

let trackedDocument: string | undefined;
try {
  trackedDocument = readFileSync(join(repoRoot, documentPath), "utf8");
} catch {
  trackedDocument = undefined;
}

const write = process.argv.includes("--write");

// In writing mode the drift rule is not run, because the drift is what the run is
// about to remove, and a run that refused it would never be able to repair it. The
// two strict rules still run in both modes, so a write cannot be used to put a
// dependency with no readable licence into the document.
const { report, document } = checkBillOfMaterials(
  { lockPath, packages, manifests, ignoredStoreEntries, lockFilesInTree, tracked: trackedDocument, documentPath },
  write
    ? new Set(["dependency-without-a-determined-licence", "dependency-that-could-not-be-read"])
    : undefined,
);

emit(report);
console.log(`store directories read: ${directories}`);
if (!passed(report)) process.exit(1);
if (write) {
  writeFileSync(join(repoRoot, documentPath), document, "utf8");
  console.log(`wrote ${documentPath}`);
}
