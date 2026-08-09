// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Which command blocks in the guide a route runs, and which it is told not to
// run and why. A block of commands in a document is a claim that they work, and
// it is the one claim in a document that a machine can settle by trying it.
//
// The convention is two markers, written as HTML comments so nothing appears in
// the rendered page, on the line before the block:
//
//   <!-- run -->            every line is a command, and the route runs it
//   <!-- not run: why -->   the route does not run it, and the reason says why
//
// A block with neither is refused. That is the part that makes the convention
// worth having: without it, a block nobody thought about looks exactly like a
// block somebody decided not to run, and the set of executed commands quietly
// shrinks as the document grows.
//
// Reads no file and runs no command: the runner supplies the documents and
// executes what this decides, so the suite can put a document in front of it
// without one being in the tree.

import type { Report } from "./report.ts";

export type TextFile = { path: string; text: string };

export type Block = {
  path: string;
  // The line the block starts on, which is what a refusal points at.
  line: number;
  // One command per entry, in the order they are written.
  commands: string[];
};

export type Decision = {
  // Blocks the runner executes, in document order.
  run: Block[];
  // Blocks the document says are not run, with the reason it gives.
  notRun: (Block & { reason: string })[];
  refusals: string[];
};

export const repair =
  "mark the block with <!-- run --> where a route can run every line of it, or with <!-- not run: reason --> where it cannot, naming what stops it. Where the block is not a command block at all, the marker says that as the reason.";

const runMarker = /^<!--\s*run\s*-->$/;
const notRunMarker = /^<!--\s*not run:\s*(.*?)\s*-->$/;

// Syntax a shell would act on. The runner spawns the executable with an argument
// array and no shell, so nothing a document writes is parsed as shell syntax on
// the way to the program. A command needing any of this is therefore one the
// route cannot run, and it is refused as marked wrongly rather than run with the
// syntax handed to the program as a literal argument, which fails later and for a
// reason that reads as the command being broken.
const shellSyntax = /[|&;<>$`(){}*?~]|\|\||>>/;

// The documents this reaches. The guide is the one a contributor follows; an
// operator guide is written under docs/operator/ and is judged the same way the
// day it arrives, rather than being remembered about then.
export function isFollowedDocument(path: string): boolean {
  return path === "CONTRIBUTING.md" || (path.startsWith("docs/operator/") && path.endsWith(".md"));
}

function lines(text: string): string[] {
  return text.split("\n").map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
}

// An indented block, which is how every command block in this tree's documents is
// written, and a fenced one, which is how they are written in most others. Both
// are read, because a convention that only reached one of the two would pass a
// document that used the other.
export function blocksIn(file: TextFile): { line: number; commands: string[]; marker: string | undefined }[] {
  const found: { line: number; commands: string[]; marker: string | undefined }[] = [];
  const all = lines(file.text);
  let marker: { text: string; line: number } | undefined;

  for (let at = 0; at < all.length; at += 1) {
    const line = all[at] ?? "";
    const trimmed = line.trim();

    if (trimmed.startsWith("<!--")) {
      marker = { text: trimmed, line: at + 1 };
      continue;
    }
    if (trimmed === "") continue;

    if (trimmed.startsWith("```")) {
      const commands: string[] = [];
      const start = at + 1;
      at += 1;
      while (at < all.length && !(all[at] ?? "").trim().startsWith("```")) {
        commands.push((all[at] ?? "").trim());
        at += 1;
      }
      found.push({ line: start, commands, marker: marker?.text });
      marker = undefined;
      continue;
    }

    if (line.startsWith("    ")) {
      const commands: string[] = [];
      const start = at + 1;
      while (at < all.length && ((all[at] ?? "").startsWith("    ") || (all[at] ?? "").trim() === "")) {
        const inner = all[at] ?? "";
        // A blank line ends the block unless the block continues under it, which
        // is how a two-part transcript is written.
        if (inner.trim() === "" && !(all[at + 1] ?? "").startsWith("    ")) break;
        if (inner.trim() !== "") commands.push(inner.trim());
        at += 1;
      }
      found.push({ line: start, commands, marker: marker?.text });
      marker = undefined;
      continue;
    }

    marker = undefined;
  }
  return found;
}

export function decide(files: readonly TextFile[]): Decision {
  const run: Block[] = [];
  const notRun: (Block & { reason: string })[] = [];
  const refusals: string[] = [];

  for (const file of files) {
    if (!isFollowedDocument(file.path)) continue;
    for (const block of blocksIn(file)) {
      const at = { path: file.path, line: block.line, commands: block.commands };
      if (block.marker !== undefined && runMarker.test(block.marker)) {
        const withSyntax = block.commands.filter((command) => shellSyntax.test(command));
        if (withSyntax.length > 0) {
          refusals.push(
            `${file.path}:${block.line}: is marked as run and carries shell syntax, which the route does not give a shell to interpret: ${withSyntax
              .map((command) => JSON.stringify(command))
              .join(", ")}`,
          );
          continue;
        }
        run.push(at);
        continue;
      }
      const notRunReason = block.marker?.match(notRunMarker);
      if (notRunReason?.[1] !== undefined) {
        if (notRunReason[1] === "") {
          refusals.push(
            `${file.path}:${block.line}: is marked as not run and gives no reason, which is the same as no marker to a reader deciding whether to trust it`,
          );
          continue;
        }
        notRun.push({ ...at, reason: notRunReason[1] });
        continue;
      }
      refusals.push(
        `${file.path}:${block.line}: carries no marker, so nothing says whether the commands in it are run. Blocks starting: ${JSON.stringify(
          block.commands[0] ?? "",
        )}`,
      );
    }
  }

  return { run, notRun, refusals };
}

// The report, given what running the executable blocks produced. The failures are
// supplied rather than produced here, for the reason the module header gives.
export function checkCommands(
  files: readonly TextFile[],
  failures: readonly { path: string; line: number; command: string; detail: string }[] = [],
): Report {
  const decision = decide(files);
  const judged = files.filter((file) => isFollowedDocument(file.path));
  const commands = decision.run.reduce((count, block) => count + block.commands.length, 0);

  const lines = [
    `examined ${judged.length} followed document(s): ${decision.run.length} block(s) run, carrying ${commands} command(s), and ${decision.notRun.length} block(s) the document says are not run.`,
    ...decision.notRun.map((block) => `NOT run, ${block.reason}: ${block.path}:${block.line}.`),
    "whether a reason given for not running a block is true is not judged here, and neither is whether the output pasted under a command is what it produces today.",
  ];

  return {
    lines,
    refusals: [
      ...decision.refusals,
      ...failures.map((failure) => `${failure.path}:${failure.line}: ${JSON.stringify(failure.command)} ${failure.detail}`),
    ],
    repair,
  };
}
