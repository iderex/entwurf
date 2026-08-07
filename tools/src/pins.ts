// Loading and shape-checking of the two files that hold every pin: the upstream
// revision this tree builds against, and the toolchain versions read out of that
// revision. Both are data rather than prose, so a check can compare them against
// what the tree actually carries.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type UpstreamPin = {
  repository: string;
  branch: string;
  revision: string;
  committed: string;
  producedBy: string;
  defaultBranchProducedBy: string;
};

export type Mirror = { file: string; field: string };

export type Pin = {
  id: string;
  kind: string;
  version: string;
  distribution?: string;
  decidedBy: string;
  command: string;
  output: string;
  mirroredIn: Mirror | null;
};

export type Toolchains = {
  producedAgainst: { repository: string; revision: string };
  pins: Pin[];
  languages: string[];
};

export const repoRoot = dirname(dirname(import.meta.dirname));

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(`cannot read ${path} as JSON`, { cause });
  }
}

export function loadUpstreamPin(root: string = repoRoot): UpstreamPin {
  const pin = readJson(join(root, "upstream", "pin.json")) as UpstreamPin;
  if (!/^[0-9a-f]{40}$/.test(pin.revision ?? "")) {
    throw new Error(
      `upstream/pin.json: revision must be a full 40-character commit identifier, found ${JSON.stringify(pin.revision)}`,
    );
  }
  return pin;
}

export function loadToolchains(root: string = repoRoot): Toolchains {
  const toolchains = readJson(join(root, "tools", "toolchains.json")) as Toolchains;
  if (!Array.isArray(toolchains.pins) || toolchains.pins.length === 0) {
    throw new Error("tools/toolchains.json: pins must be a non-empty array");
  }
  if (!Array.isArray(toolchains.languages) || toolchains.languages.length === 0) {
    throw new Error("tools/toolchains.json: languages must be a non-empty array");
  }
  for (const pin of toolchains.pins) {
    for (const field of ["id", "kind", "version", "decidedBy", "command", "output"] as const) {
      if (typeof pin[field] !== "string" || pin[field].length === 0) {
        throw new Error(`tools/toolchains.json: pin ${pin.id ?? "?"} is missing ${field}`);
      }
    }
  }
  return toolchains;
}

// Reads a dotted path out of a parsed object. The last segment may itself contain
// dots, which is what a scoped package name needs: devDependencies.@playwright/test.
export function readField(root: unknown, field: string): string | undefined {
  const [head, ...rest] = field.split(".");
  const tail = rest.join(".");
  if (head === undefined || head.length === 0) return undefined;
  if (typeof root !== "object" || root === null) return undefined;
  const value = (root as Record<string, unknown>)[head];
  if (rest.length === 0) return typeof value === "string" ? value : undefined;
  return readField(value, tail);
}

export function loadPackageJson(root: string = repoRoot): unknown {
  return readJson(join(root, "package.json"));
}
