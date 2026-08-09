// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Reads the package set out of the lock file, reads what it can of each
// package's own manifest out of the store, and hands both to the decision in
// tools/src/checks/bill-of-materials.ts, which is where the suite reaches it.
//
// Two modes and one decision behind them. With --write it puts the generated
// document in the tree; without it, it refuses a tracked copy that this run would
// not produce. The refusing mode never writes, for the reason the lock file check
// gives about repairing in silence: a check that quietly fixed the drift would
// hide the thing it exists to report.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import {
  checkBillOfMaterials,
  type LockedPackage,
  type Manifest,
} from "./checks/bill-of-materials.ts";
import { emit, passed } from "./checks/report.ts";

const lockPath = "pnpm-lock.yaml";
const documentPath = "docs/legal/bill-of-materials.md";
const storeRoot = join(repoRoot, "node_modules", ".pnpm");

// The keys under `packages:` at exactly two spaces of indentation. Deeper keys are
// a package's own peer metadata and are not packages. The parse is by line rather
// than by a YAML reader, for the reason the workflow name parse gives: adding one
// would add a dependency for one field. A key written in a shape this does not
// read leaves a package out of the set, which loses a row rather than inventing
// one, and the count the run prints is what makes that visible.
function lockedPackages(text: string): LockedPackage[] {
  const packages: LockedPackage[] = [];
  let inside = false;
  let current: { name: string; version: string; os: string[]; cpu: string[] } | undefined;
  for (const line of text.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (/^\S/.test(line)) inside = false;
    if (!inside) continue;
    const match = line.match(/^ {2}'?([^'\s][^']*?)'?:\s*$/);
    if (match?.[1] !== undefined) {
      const key = match[1];
      const at = key.lastIndexOf("@");
      current = undefined;
      if (at <= 0) continue;
      current = { name: key.slice(0, at), version: key.slice(at + 1), os: [], cpu: [] };
      packages.push(current);
      continue;
    }
    if (current === undefined) continue;
    const os = line.match(/^ {4}os: \[(.*)\]\s*$/);
    if (os?.[1] !== undefined) current.os = listOf(os[1]);
    const cpu = line.match(/^ {4}cpu: \[(.*)\]\s*$/);
    if (cpu?.[1] !== undefined) current.cpu = listOf(cpu[1]);
  }
  return packages;
}

function listOf(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

// Every manifest the store carries, indexed by nothing: the decision matches them
// against the lock file by name and version, so a store directory naming a package
// the lock file does not name simply finds no row to fill.
function manifestsInStore(): { manifests: Manifest[]; directories: number } {
  const manifests: Manifest[] = [];
  let directories = 0;
  let entries: string[];
  try {
    entries = readdirSync(storeRoot);
  } catch {
    return { manifests, directories };
  }

  for (const entry of entries) {
    const packages = join(storeRoot, entry, "node_modules");
    let inner: string[];
    try {
      inner = readdirSync(packages);
    } catch {
      continue;
    }
    directories += 1;
    for (const name of inner) {
      const scoped = name.startsWith("@") ? readdirSyncOrNone(join(packages, name)).map((leaf) => `${name}/${leaf}`) : [name];
      for (const full of scoped) {
        const manifestPath = join(packages, full, "package.json");
        let manifest: { name?: string; version?: string; license?: unknown };
        try {
          manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as typeof manifest;
        } catch {
          continue;
        }
        if (manifest.name === undefined || manifest.version === undefined) continue;
        manifests.push({
          name: manifest.name,
          version: manifest.version,
          declared: declaredLicence(manifest.license),
          readFrom: `node_modules/.pnpm/${entry}/node_modules/${full}/package.json`,
        });
      }
    }
  }
  return { manifests, directories };
}

function readdirSyncOrNone(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

// npm has carried three shapes for this field over time and a manifest in the
// store may be any of them. An object or a list that names nothing usable comes
// back undefined, which the decision refuses rather than passes.
function declaredLicence(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const types = value
      .map((item) => (typeof item === "object" && item !== null && "type" in item ? (item as { type?: unknown }).type : undefined))
      .filter((type): type is string => typeof type === "string");
    return types.length === 0 ? undefined : types.join(" OR ");
  }
  if (typeof value === "object" && value !== null && "type" in value) {
    const type = (value as { type?: unknown }).type;
    return typeof type === "string" ? type : undefined;
  }
  return undefined;
}

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const lockFilesInTree = tracked.filter((path) =>
  /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|Cargo\.lock|deps\.edn|poetry\.lock|go\.sum)$/.test(path),
);

const { manifests, directories } = manifestsInStore();
const packages = lockedPackages(readFileSync(join(repoRoot, lockPath), "utf8"));
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
