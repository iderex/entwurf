// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Decides what a resolve did to the lock file. Spawns nothing and reads nothing:
// the runner hands over the two hashes and how the resolve ended, so the suite can
// put a failed resolve and a rewritten lock file in front of this without either
// happening.
//
// The three outcomes are deliberately not two. A resolve that could not be run
// leaves no verdict on drift, and reporting that as a clean lock file is the
// fail-open this separation exists against.

import type { Report } from "./report.ts";

export const repair = "corepack pnpm install --lockfile-only";

export type ResolveOutcome =
  | { kind: "ran" }
  | { kind: "could-not-run"; detail: string }
  | { kind: "failed"; status: number };

export function checkLockfileDrift(outcome: ResolveOutcome, before: string, after: string): Report {
  const lines = [`pnpm-lock.yaml sha256 before resolve: ${before}`, `pnpm-lock.yaml sha256 after resolve:  ${after}`];

  if (outcome.kind === "could-not-run") {
    return {
      lines,
      refusals: [
        `the resolve could not be run: ${outcome.detail}. This is a failure to judge rather than a clean lock file, and it is refused as one.`,
      ],
      repair,
    };
  }
  if (outcome.kind === "failed") {
    return {
      lines,
      refusals: [`the resolve exited ${outcome.status}, so no verdict on drift was reached`],
      repair,
    };
  }
  if (before !== after) {
    return {
      lines,
      refusals: [
        "a resolve rewrites pnpm-lock.yaml, so the lock file does not match package.json. The original bytes have been restored; nothing was repaired here.",
      ],
      repair,
    };
  }

  lines.push("examined pnpm-lock.yaml against package.json by resolving once: the lock file is unmoved.");
  return { lines, refusals: [], repair };
}
