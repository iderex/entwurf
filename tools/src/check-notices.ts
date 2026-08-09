// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Asks tools/src/dependency-set.ts for the same packages, manifests and
// store the bill of materials is generated from, derives that document's rows so
// the two pages cannot disagree about which dependencies exist, and hands the rows
// and the licence texts to the decision in tools/src/checks/notices.ts, which is
// where the suite reaches it.
//
// Two modes and one decision behind them, the same pair the bill of materials
// carries. With --write it puts the generated page in the tree; without it, it
// refuses a tracked copy that this run would not produce, and never repairs one,
// because a check that quietly fixed the drift would hide the thing it exists to
// report.
//
// Like the bill of materials, this needs the resolved store, so it runs where an
// install has happened and is in no workflow. Nothing on GitHub refuses a stale
// page today.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { lockPath, readLockedPackages, readStore } from "./dependency-set.ts";
import { billOfMaterials } from "./checks/bill-of-materials.ts";
import { checkNotices } from "./checks/notices.ts";
import { emit, passed } from "./checks/report.ts";

const billPath = "docs/legal/bill-of-materials.md";
const documentPath = "docs/legal/third-party-notices.md";

const { manifests, texts } = readStore();
const packages = readLockedPackages();

// The rows come from the bill of materials' own derivation rather than from a
// second reading of the same inputs. Membership and the licence each package
// declares are decided in one place, so a package that is on one page is on the
// other and says the same thing about itself on both.
const rows = billOfMaterials({
  lockPath,
  packages,
  manifests,
  ignoredStoreEntries: 0,
  lockFilesInTree: [lockPath],
  tracked: undefined,
  documentPath: billPath,
});

let trackedDocument: string | undefined;
try {
  trackedDocument = readFileSync(join(repoRoot, documentPath), "utf8");
} catch {
  trackedDocument = undefined;
}

const write = process.argv.includes("--write");

// In writing mode the drift rule is not run, because the drift is what the run is
// about to remove, and a run that refused it would never be able to repair it. The
// two strict rules run in both modes, so a write cannot be used to publish a
// section for a dependency whose terms nobody established, or an empty block under
// a heading that says a notice was carried.
const { report, document } = checkNotices(
  { rows, texts, billPath, documentPath, tracked: trackedDocument },
  write
    ? new Set(["dependency-whose-terms-were-never-established", "licence-file-that-carries-no-text"])
    : undefined,
);

emit(report);
if (!passed(report)) process.exit(1);
if (write) {
  writeFileSync(join(repoRoot, documentPath), document, "utf8");
  console.log(`wrote ${documentPath}`);
}
