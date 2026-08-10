// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The structural rules that have a subject in this tree, expressed so that a
// change breaking one reddens the suite instead of being caught by somebody
// noticing. Two of them are here; the rest of what the decision records state is
// about parts that do not exist yet, and each of those records says in its own
// text that nothing enforces it.
//
// This is a module rather than assertions written inline because a rule that can
// only be exercised by making the tree violate it is a rule nothing proves. Every
// function here takes the graph and the vocabulary it judges against as
// arguments, so the suite can put a fixture in front of it and run the same
// fixture again with the rule switched off.
//
// It sits under tests/unit/ rather than tools/src/ because the rules are the
// suite's own, and because a decision module living where the unit suite lives is
// itself covered by the import refusal the Vitest config installs.

import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { browserDrivers, isInside } from "../../../tools/src/checks/headless-rule.ts";

// A module and the specifiers it names. `path` is repository relative with
// forward slashes on every platform, because it is quoted in refusals and a
// message that reads differently on Windows is two messages.
export type Module = { readonly path: string; readonly imports: readonly string[] };

export type Graph = readonly Module[];

// One violation: where the walk started, the modules it went through, and the
// thing it arrived at. The trail is carried rather than only the endpoints,
// because the endpoint alone sends a reader looking for an import that is three
// files away from where they are looking.
export type Reach = { readonly from: string; readonly trail: readonly string[]; readonly target: string };

// Where the verdict logic lives. Everything under here decides whether something
// passes, and every one of these modules is reached by the unit suite, which runs
// with no display and no GPU.
export const verdictLogic = "tools/src/checks";

// A runner: it reads files, calls a decision and sets an exit status. The
// directory matters and the file name alone does not, which is why this is
// anchored at tools/src/ rather than matched against a basename anywhere. A
// decision module named check-something.ts under tools/src/checks/ is a decision.
export const runnerPatterns: readonly RegExp[] = [/^tools\/src\/(check|run|print)-[^/]+\.ts$/];

// Reads text rather than parsing it, and the bound that puts on it runs one way.
// A `from "x"` written inside a comment or a string is counted as an import,
// which can only add an edge, so the rules judge a graph at least as large as the
// real one. What it does not see is a module pulled in at run time through
// node:module, which is the same blind spot the import refusal in the Vitest
// config carries and for the same reason: nothing static ever resolves it.
export function importsIn(text: string): string[] {
  const at: { where: number; specifier: string }[] = [];
  for (const pattern of [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /^\s*import\s*["']([^"']+)["']/gm,
  ]) {
    for (const match of text.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) at.push({ where: match.index, specifier });
    }
  }
  // In the order they are written rather than in the order the patterns run, so a
  // refusal quoting a module's imports reads like the file it came from.
  const found: string[] = [];
  for (const { specifier } of at.sort((one, other) => one.where - other.where)) {
    if (!found.includes(specifier)) found.push(specifier);
  }
  return found;
}

// A specifier that names a file in this tree, or null where it names a package.
// The distinction is the whole point: a package is where a browser driver is
// found, and a relative path is an edge the walk follows.
export function moduleNamedBy(importer: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  return posix.normalize(posix.join(posix.dirname(importer), specifier));
}

function importsOf(graph: Graph, path: string): readonly string[] {
  return graph.find((module) => module.path === path)?.imports ?? [];
}

// Every package this module or anything it imports reaches, breadth first so the
// trail a refusal quotes is the shortest one rather than whichever the recursion
// happened to find.
export function reachFrom(graph: Graph, start: string, packages: readonly string[]): Reach | null {
  const seen = new Set<string>([start]);
  let frontier: { path: string; trail: string[] }[] = [{ path: start, trail: [start] }];

  while (frontier.length > 0) {
    const next: { path: string; trail: string[] }[] = [];
    for (const { path, trail } of frontier) {
      for (const specifier of importsOf(graph, path)) {
        if (packages.includes(specifier)) return { from: start, trail, target: specifier };
        const module = moduleNamedBy(path, specifier);
        if (module === null || seen.has(module)) continue;
        seen.add(module);
        next.push({ path: module, trail: [...trail, module] });
      }
    }
    frontier = next;
  }
  return null;
}

// The rule record 0001 states for the layer this repository invents: the logic
// that decides a verdict is covered by the suite that runs with no display and no
// GPU, and what needs a browser goes to the hardware-bound harness instead. The
// refusal the Vitest config installs holds the first step of this and no more: it
// reads the importer, so it refuses a test file that names a driver and passes a
// test file that names a module that names one. This is the same rule at any
// depth, which is where the mistake somebody actually makes lives.
export function modulesReachingABrowser(
  graph: Graph,
  roots: readonly string[],
  drivers: readonly string[] = browserDrivers,
): Reach[] {
  const found: Reach[] = [];
  for (const root of roots) {
    const reach = reachFrom(graph, root, drivers);
    if (reach !== null) found.push(reach);
  }
  return found;
}

export function isRunner(path: string, patterns: readonly RegExp[] = runnerPatterns): boolean {
  return patterns.some((pattern) => pattern.test(path));
}

// The direction between the decisions and the runners, which runs one way. A
// runner imports a decision; a decision imports no runner. The decisions were
// carved out of the runners so the suite could put a fixture in front of them,
// and the coverage scope excludes the runners on the stated ground that they hold
// no decision. A decision that imports one puts logic back behind a module
// nothing measures and nothing proves, and the coverage number does not move when
// it happens.
export function decisionsReachingRunners(
  graph: Graph,
  decisions: string = verdictLogic,
  patterns: readonly RegExp[] = runnerPatterns,
): Reach[] {
  const found: Reach[] = [];
  for (const module of graph) {
    if (!isInside(decisions, module.path)) continue;
    for (const specifier of module.imports) {
      const target = moduleNamedBy(module.path, specifier);
      if (target !== null && isRunner(target, patterns)) {
        found.push({ from: module.path, trail: [module.path], target });
      }
    }
  }
  return found;
}

export function describeReach(reach: Reach): string {
  return `${reach.trail.join(" -> ")} -> ${reach.target}`;
}

// The graph of the tree as it stands. Reads TypeScript files under the given
// directories; anything else in the tree names no import this rule set can judge.
export function readGraph(repoRoot: string, directories: readonly string[]): Module[] {
  const modules: Module[] = [];
  for (const directory of directories) {
    for (const entry of readdirSync(join(repoRoot, directory), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const full = `${entry.parentPath}${sep}${entry.name}`;
      modules.push({
        path: relative(repoRoot, full).split(sep).join("/"),
        imports: importsIn(readFileSync(full, "utf8")),
      });
    }
  }
  return modules;
}

export function modulesUnder(graph: Graph, directory: string): string[] {
  return graph.filter((module) => isInside(directory, module.path)).map((module) => module.path);
}
