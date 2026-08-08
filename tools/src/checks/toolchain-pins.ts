// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// Decides whether the versions package.json carries still match the pin table,
// and whether the pin table was produced against the revision the tree builds
// against. Reads no file: the runner supplies the parsed documents, so the suite
// can put a drifted pair in front of this and watch it refuse.

import { readField, type Toolchains, type UpstreamPin } from "../pins.ts";
import type { Report } from "./report.ts";

export const repair =
  "correct package.json, or re-run the command in the pin's `command` field against the pinned revision and update tools/toolchains.json with what it prints.";

export function checkToolchainPins(toolchains: Toolchains, upstream: UpstreamPin, pkg: unknown): Report {
  const lines: string[] = [];
  const refusals: string[] = [];

  if (toolchains.producedAgainst.revision !== upstream.revision) {
    refusals.push(
      `tools/toolchains.json was produced against ${toolchains.producedAgainst.revision}, upstream/pin.json names ${upstream.revision}`,
    );
  }
  if (toolchains.producedAgainst.repository !== upstream.repository) {
    refusals.push(
      `tools/toolchains.json names repository ${toolchains.producedAgainst.repository}, upstream/pin.json names ${upstream.repository}`,
    );
  }

  let compared = 0;
  let notCompared = 0;

  for (const pin of toolchains.pins) {
    if (pin.mirroredIn === null) {
      notCompared += 1;
      lines.push(`not mirrored  ${pin.id} ${pin.version} (no file in this tree carries it)`);
      continue;
    }
    compared += 1;
    if (pin.mirroredIn.file !== "package.json") {
      refusals.push(`pin ${pin.id} names ${pin.mirroredIn.file}, which this check does not read`);
      continue;
    }
    const found = readField(pkg, pin.mirroredIn.field);
    if (found === undefined) {
      refusals.push(`package.json has no ${pin.mirroredIn.field}, which pin ${pin.id} says carries ${pin.version}`);
      continue;
    }
    // packageManager carries an integrity hash after the version, so it is compared
    // by prefix. Every other mirror is compared for exact equality: a range where a
    // pin is expected is the drift this check exists against.
    const matches =
      pin.mirroredIn.field === "packageManager"
        ? found === `${pin.id}@${pin.version}` || found.startsWith(`${pin.id}@${pin.version}+`)
        : found === pin.version;
    if (!matches) {
      refusals.push(`package.json ${pin.mirroredIn.field} is ${found}, pin ${pin.id} is ${pin.version}`);
      continue;
    }
    lines.push(`ok            ${pin.id} ${pin.version} = package.json ${pin.mirroredIn.field}`);
  }

  lines.push(
    `examined ${toolchains.pins.length} pin(s) against upstream ${upstream.repository}@${upstream.revision}: ${compared} compared against package.json, ${notCompared} carried by no file in this tree and therefore NOT compared here.`,
  );

  return { lines, refusals, repair };
}
