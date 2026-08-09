// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The near miss for child-process-with-a-shell, and the near miss is the point.
//
// Two calls, one line apart, spawning the same program with the same argument.
// One passes the argument to the shell and one hands it to the executable, and
// the difference is a single option nobody notices in review. A rule that only
// fired on something obviously wrong would prove that it runs; this one has to
// tell these two apart, so the proof job asserts a count of exactly one.
//
// Nothing imports this module and no test calls either function.

import { spawnSync } from "node:child_process";

// Refused. The name is parsed by the shell before the program sees it, so a
// value carrying shell syntax is read as shell syntax.
export function countLinesThroughAShell(name: string): string {
  const done = spawnSync("wc", ["-l", name], { shell: true, encoding: "utf8" });
  return done.stdout ?? "";
}

// Not refused, and identical in every other respect. The argument reaches the
// executable as one argument whatever is in it.
export function countLinesWithoutAShell(name: string): string {
  const done = spawnSync("wc", ["-l", name], { encoding: "utf8" });
  return done.stdout ?? "";
}
