// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Reads the documents a person follows, asks the decision in
// tools/src/checks/commands.ts which blocks are to be run, runs those, and hands
// back what failed. Nothing here decides which block is executable: a runner that
// chose would be a second place the convention lives.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { checkCommands, decide, isFollowedDocument, type TextFile } from "./checks/commands.ts";
import { emit, passed } from "./checks/report.ts";

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const documents: TextFile[] = tracked
  .filter((path) => isFollowedDocument(path))
  .map((path) => ({ path, text: readFileSync(join(repoRoot, path), "utf8") }));

// On Windows an executable installed as a script is `name.cmd`, and a spawn with
// no shell does not find it under the bare name. The bare name is tried first and
// the suffixed one only where the machine says the file is not there, so a
// program that ran and failed is never retried as a different program.
function run(executable: string, args: readonly string[]): void {
  try {
    execFileSync(executable, args, { cwd: repoRoot, stdio: "pipe", encoding: "utf8" });
  } catch (failure) {
    if (process.platform !== "win32" || (failure as { code?: string }).code !== "ENOENT") throw failure;
    execFileSync(`${executable}.cmd`, args, { cwd: repoRoot, stdio: "pipe", encoding: "utf8" });
  }
}

const failures: { path: string; line: number; command: string; detail: string }[] = [];
for (const block of decide(documents).run) {
  for (const command of block.commands) {
    // Spawned directly with an argument array and no shell, so nothing in a
    // document is parsed as shell syntax on the way to the program. That is why
    // the decision refuses a runnable block carrying shell syntax rather than
    // running it: a command needing a pipe or a redirect is one this route cannot
    // run, and saying so is the honest answer.
    const [executable, ...args] = command.split(/\s+/).filter((word) => word !== "");
    if (executable === undefined) continue;
    try {
      run(executable, args);
    } catch (failure) {
      const status = (failure as { status?: number }).status;
      // Both streams, because a tool that prints its refusal on stdout is as
      // common here as one that prints it on stderr, and a failure reported with
      // an empty reason sends the reader to run it again to find out why.
      const said = [(failure as { stderr?: string }).stderr ?? "", (failure as { stdout?: string }).stdout ?? ""]
        .map((stream) => stream.trim())
        .filter((stream) => stream !== "");
      failures.push({
        path: block.path,
        line: block.line,
        command,
        detail: `exited ${status ?? "without a status"}: ${said[0]?.split("\n").at(-1) ?? "and said nothing"}`,
      });
    }
  }
}

const report = checkCommands(documents, failures);
emit(report);
if (!passed(report)) process.exit(1);
