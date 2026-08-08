// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Runner. Asks git which paths are tracked, reads the ones that are text, and
// hands them to the decision in tools/src/checks/source-headers.ts, which is
// where the suite reaches it.
//
// With --write it applies a missing header instead of reporting it. It never
// changes a header that is already there, whatever that header says, so the one
// repair this command will not make for you is the one where a file claims a
// licence it should not.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pins.ts";
import { checkSourceHeaders, withHeader, type SourceFile } from "./checks/source-headers.ts";
import { emit, passed } from "./checks/report.ts";

const write = process.argv.includes("--write");

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const files: SourceFile[] = [];
for (const path of tracked) {
  const bytes = readFileSync(join(repoRoot, path));
  if (bytes.includes(0)) continue;
  files.push({ path, text: bytes.toString("utf8") });
}

if (write) {
  let written = 0;
  for (const file of files) {
    const next = withHeader(file);
    if (next === file.text) continue;
    writeFileSync(join(repoRoot, file.path), next);
    console.log(`header applied: ${file.path}`);
    written += 1;
  }
  console.log(`${written} file(s) written.`);
  process.exit(0);
}

const report = checkSourceHeaders(files);
emit(report);
if (!passed(report)) process.exit(1);
