// Runner. Asks git which paths are tracked, reads the asset register and hands
// both to the decision in tools/src/checks/assets.ts, which is where the suite
// reaches it.
//
// A missing register is a refusal rather than an empty one. A check that treats
// the absence of its own register as nothing to judge reports green on the day
// somebody deletes it, which is the one day it had something to say.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { checkAssets, parseRegister } from "./checks/assets.ts";
import { emit, passed, type Report } from "./checks/report.ts";

const registerPath = "docs/legal/assets.md";
const absolute = join(repoRoot, registerPath);

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

let report: Report;
if (!existsSync(absolute)) {
  report = {
    lines: [`examined ${tracked.length} tracked path(s). Nothing else was judged.`],
    refusals: [`${registerPath} does not exist, so no asset in this tree has an entry and nothing here can say which`],
    repair: "restore the register, or argue its removal in the issue that asked for it.",
  };
} else {
  const text = readFileSync(absolute, "utf8");
  report = checkAssets({ tracked, entries: parseRegister(text), registerPath });
}

emit(report);
if (!passed(report)) process.exit(1);
