// The command behind `test:needs-display-and-gpu`. It reads the machine first and
// refuses one that cannot do the work, naming what was missing, and only then
// starts the suite.
//
// The order is the point. A suite that starts, finds no GPU and skips its cases
// reports green on a machine that measured nothing, and a green run that measured
// nothing is worse than a red one.

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { assess, describeMachine, machineFrom } from "./hardware/machine.ts";
import { probeMachine } from "./hardware/probe.ts";

// A bare `--` is how a package manager separates its own arguments from the ones
// meant for the command. Passing it through reaches the test runner as an
// argument of its own and silently stops the filter behind it from applying, so a
// run that looked narrowed ran everything.
const filters = process.argv.slice(2).filter((one) => one !== "--");

console.log("hardware-bound suite: this needs a display and a working GPU. It is not the unit suite.");

const probe = await probeMachine();
if ("kind" in probe) {
  console.error(`REFUSED  no browser could be launched, so nothing about this machine could be read: ${probe.detail}`);
  console.error("Repair: corepack pnpm exec playwright install chromium");
  process.exit(1);
}

const machine = machineFrom(probe);
for (const line of describeMachine(machine)) console.log(line);

const verdict = assess(probe);
for (const line of verdict.observed) console.log(`present  ${line}`);

if (!verdict.qualifies) {
  for (const line of verdict.missing) console.error(`MISSING  ${line}`);
  console.error(
    "REFUSED  this machine cannot run the hardware-bound suite. Nothing was skipped and nothing was measured; this run is red rather than green so it cannot be quoted as a pass.",
  );
  process.exit(1);
}

const suite = spawnSync(
  process.execPath,
  [join(repoRoot, "node_modules", "@playwright", "test", "cli.js"), "test", "--config", join(repoRoot, "tools", "playwright.config.ts"), ...filters],
  {
    cwd: repoRoot,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, ENTWURF_MACHINE: JSON.stringify(machine), ENTWURF_FILTERS: filters.join(" ") },
  },
);

if (suite.error !== undefined || suite.status === null) {
  console.error(`REFUSED  the suite could not be run: ${suite.error?.message ?? "no exit status"}`);
  process.exit(1);
}
process.exit(suite.status);
