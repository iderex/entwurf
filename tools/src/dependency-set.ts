// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Reader. Everything that has to touch the lock file and the resolved store to
// find out what this repository depends on, in one place because two runners now
// need it: the bill of materials, which says what each dependency may be used
// under, and the notices, which carry the text each one publishes. A second copy
// of this reading would let the two documents disagree about the dependency set
// while each was internally consistent, which is the failure a reader looking for
// a package in one and not the other would blame on the package.
//
// It holds no decision. What is done with the packages, the manifests and the
// licence texts is decided in tools/src/checks/, which is where the suite reaches
// it. That split is why this file is outside the coverage measurement, and the
// exclusion says so on every run rather than being left to be discovered.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import type { LockedPackage, Manifest } from "./checks/bill-of-materials.ts";
import type { LicenceText } from "./checks/notices.ts";

export const lockPath = "pnpm-lock.yaml";

const storeRoot = join(repoRoot, "node_modules", ".pnpm");

// A file a package publishes its terms in. npm has no convention it enforces, so
// this is the set of names packages actually use, and a package naming its licence
// something else publishes one this route does not find. That is the bound, and
// the run prints it: such a package is reported as publishing none rather than
// silently carrying nothing.
const licenceFileName = /^(licen[cs]e|copying)([-.].*)?$/i;

// The keys under `packages:` at exactly two spaces of indentation. Deeper keys are
// a package's own peer metadata and are not packages. The parse is by line rather
// than by a YAML reader, for the reason the workflow name parse gives: adding one
// would add a dependency for one field. A key written in a shape this does not
// read leaves a package out of the set, which loses a row rather than inventing
// one, and the count the run prints is what makes that visible.
export function lockedPackages(text: string): LockedPackage[] {
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

function readdirSyncOrNone(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

export type StoreReading = {
  manifests: Manifest[];
  // The licence texts each package publishes, by `name@version`. A package absent
  // from this map publishes none this route could find.
  texts: Map<string, LicenceText[]>;
  // Store directories walked, which the bill of materials reports against the set
  // the lock file names so a directory nobody depends on is counted rather than
  // folded in.
  directories: number;
};

// Every manifest the store carries, indexed by nothing: the decisions match them
// against the lock file by name and version, so a store directory naming a package
// the lock file does not name simply finds no row to fill.
export function readStore(): StoreReading {
  const manifests: Manifest[] = [];
  const texts = new Map<string, LicenceText[]>();
  let directories = 0;
  let entries: string[];
  try {
    entries = readdirSync(storeRoot);
  } catch {
    return { manifests, texts, directories };
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
        const directory = join(packages, full);
        let manifest: { name?: string; version?: string; license?: unknown };
        try {
          manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as typeof manifest;
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
        const key = `${manifest.name}@${manifest.version}`;
        // The first copy read wins. A package resolved under several peer sets has
        // one directory per set and the same tarball behind each, so the texts are
        // the same bytes; taking the first keeps the generated page independent of
        // the order the store happened to be walked in.
        if (texts.has(key)) continue;
        const found: LicenceText[] = [];
        for (const file of readdirSyncOrNone(directory).filter((candidate) => licenceFileName.test(candidate)).sort()) {
          try {
            found.push({ fileName: file, text: readFileSync(join(directory, file), "utf8") });
          } catch {
            continue;
          }
        }
        if (found.length > 0) texts.set(key, found);
      }
    }
  }
  return { manifests, texts, directories };
}

export function readLockedPackages(): LockedPackage[] {
  return lockedPackages(readFileSync(join(repoRoot, lockPath), "utf8"));
}
