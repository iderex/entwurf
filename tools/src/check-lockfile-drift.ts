// Refuses a lock file that a resolve would rewrite, and reports the command that
// repairs it instead of repairing it silently.
//
// The failure it prevents: package.json and pnpm-lock.yaml disagree, the next
// person to run an install gets a rewritten lock file in their diff, and the
// versions a measurement was produced under stop being the versions the lock file
// names. A check that quietly rewrote the file would hide exactly that.
//
// How it works: hash the lock file, run a resolve that is allowed to write it,
// hash it again. If the bytes moved, put the original bytes back and refuse. The
// original is restored so the working tree is left as it was found; the refusal
// is what carries the news.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";

const lockfile = join(repoRoot, "pnpm-lock.yaml");
const repair = "corepack pnpm install --lockfile-only";

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

console.log(`pnpm-lock.yaml sha256 before resolve: ${digest(before)}`);

// Run the same pnpm this script was invoked through where there is one, so the
// resolve cannot be done by a different version than the one the tree pins. Where
// there is not, fall back to whatever `pnpm` is on the path and let the exit
// status speak.
const execpath = process.env.npm_execpath;
const args = ["install", "--lockfile-only", "--ignore-scripts"];
const resolve =
  execpath === undefined
    ? spawnSync("pnpm", args, { cwd: repoRoot, shell: true, stdio: ["ignore", "inherit", "inherit"] })
    : spawnSync(process.execPath, [execpath, ...args], { cwd: repoRoot, stdio: ["ignore", "inherit", "inherit"] });

if (resolve.error !== undefined || resolve.status === null) {
  console.error(`REFUSED  the resolve could not be run: ${resolve.error?.message ?? "no exit status"}`);
  console.error("This is a failure to judge rather than a clean lock file, and it is refused as one.");
  process.exit(1);
}
if (resolve.status !== 0) {
  console.error(`REFUSED  the resolve exited ${resolve.status}, so no verdict on drift was reached`);
  process.exit(1);
}

const after = readFileSync(lockfile);
console.log(`pnpm-lock.yaml sha256 after resolve:  ${digest(after)}`);

if (digest(after) !== digest(before)) {
  writeFileSync(lockfile, before);
  console.error("REFUSED  a resolve rewrites pnpm-lock.yaml, so the lock file does not match package.json");
  console.error("The original bytes have been restored; nothing was repaired here.");
  console.error(`Repair: ${repair}`);
  process.exit(1);
}

console.log("examined pnpm-lock.yaml against package.json by resolving once: the lock file is unmoved.");
