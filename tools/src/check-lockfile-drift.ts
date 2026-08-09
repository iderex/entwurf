// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Hashes the lock file, runs one resolve that is allowed to write it,
// hashes it again, and hands the pair to the decision in
// tools/src/checks/lockfile-drift.ts.
//
// Where the bytes moved, the original is put back before anything is printed. The
// working tree is left as it was found and the refusal is what carries the news:
// a check that quietly repaired the drift would hide the thing it exists to
// report.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { checkLockfileDrift, repair, type ResolveOutcome } from "./checks/lockfile-drift.ts";
import { emit, passed } from "./checks/report.ts";

const lockfile = join(repoRoot, "pnpm-lock.yaml");

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

let before: Buffer;
try {
  before = readFileSync(lockfile);
} catch {
  console.error("REFUSED  pnpm-lock.yaml is absent");
  console.error(`Repair: ${repair}`);
  process.exit(1);
}

// Run the same pnpm this script was invoked through where there is one, so the
// resolve cannot be done by a different version than the one the tree pins. Where
// there is not, fall back to whatever `pnpm` is on the path and let the exit
// status speak.
const execpath = process.env.npm_execpath;
const args = ["install", "--lockfile-only", "--ignore-scripts"];
const resolve =
  execpath === undefined
    ? // The second analyser refuses a child process started through a shell.
      // This one is accepted rather than fixed, and the acceptance is here at
      // the call rather than in a list somewhere else. The shell is on because
      // this branch has a bare program name and no path to it, and on Windows a
      // bare name is resolved by the shell rather than by the spawn. Both the
      // name and every argument are literals two lines up, so nothing a caller
      // supplies reaches the command line. What retires it: resolving the
      // executable in this file and spawning the resolved path, or this branch
      // going away because npm_execpath is set on every route that runs this
      // check.
      // nosemgrep: tools.opengrep.child-process-with-a-shell
      spawnSync("pnpm", args, { cwd: repoRoot, shell: true, stdio: ["ignore", "inherit", "inherit"] })
    : spawnSync(process.execPath, [execpath, ...args], { cwd: repoRoot, stdio: ["ignore", "inherit", "inherit"] });

const outcome: ResolveOutcome =
  resolve.error !== undefined || resolve.status === null
    ? { kind: "could-not-run", detail: resolve.error?.message ?? "no exit status" }
    : resolve.status === 0
      ? { kind: "ran" }
      : { kind: "failed", status: resolve.status };

const after = readFileSync(lockfile);
if (digest(after) !== digest(before)) writeFileSync(lockfile, before);

const report = checkLockfileDrift(outcome, digest(before), digest(after));
emit(report);
if (!passed(report)) process.exit(1);
