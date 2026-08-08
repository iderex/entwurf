// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Asks git which paths are tracked and hands the list to the decision in
// tools/src/checks/languages.ts, which is where the suite reaches it.

import { execFileSync } from "node:child_process";
import { loadToolchains, repoRoot } from "./pins.ts";
import { checkLanguages } from "./checks/languages.ts";
import { emit, passed } from "./checks/report.ts";

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const report = checkLanguages(tracked, new Set(loadToolchains().languages));
emit(report);
if (!passed(report)) process.exit(1);
