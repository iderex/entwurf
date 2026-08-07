import { describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPackageJson, loadToolchains, loadUpstreamPin, readField } from "../../tools/src/pins.ts";

// A tree written for the test rather than the tree this repository happens to be
// in today. A case that judges the real files proves the state of the tree on the
// day it ran, not the loader.
function treeWith(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "entwurf-pins-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

const goodPin = {
  repository: "example/example",
  branch: "develop",
  revision: "0123456789abcdef0123456789abcdef01234567",
  committed: "2026-01-01T00:00:00Z",
  producedBy: "a command",
  defaultBranchProducedBy: "another command",
};

const goodToolchains = {
  producedAgainst: { repository: "example/example", revision: goodPin.revision },
  pins: [
    {
      id: "node",
      kind: "runtime",
      version: "24.18.1",
      decidedBy: "upstream",
      command: "a command",
      output: "v24.18.1",
      mirroredIn: { file: "package.json", field: "engines.node" },
    },
  ],
  languages: ["typescript"],
};

describe("readField", () => {
  const document = {
    engines: { node: "24.18.1" },
    devDependencies: { "@playwright/test": "1.62.1", typescript: "6.0.3" },
    packageManager: "pnpm@11.20.0+sha512.abc",
    nested: { deeper: { value: "found" } },
    notAString: { count: 7 },
  };

  test("reads a top level field", () => {
    expect(readField(document, "packageManager")).toBe("pnpm@11.20.0+sha512.abc");
  });

  test("reads a nested field", () => {
    expect(readField(document, "engines.node")).toBe("24.18.1");
    expect(readField(document, "nested.deeper.value")).toBe("found");
  });

  // The reason this function exists rather than a split on every dot: a scoped
  // package name carries a dot of its own and must survive as one segment.
  test("keeps a scoped package name whole", () => {
    expect(readField(document, "devDependencies.@playwright/test")).toBe("1.62.1");
  });

  test("returns undefined rather than throwing on anything it cannot read", () => {
    expect(readField(document, "engines.missing")).toBeUndefined();
    expect(readField(document, "missing.node")).toBeUndefined();
    expect(readField(document, "notAString.count")).toBeUndefined();
    expect(readField(document, "")).toBeUndefined();
    expect(readField(null, "anything")).toBeUndefined();
    expect(readField("a string", "anything")).toBeUndefined();
  });
});

describe("loadUpstreamPin", () => {
  test("accepts a full commit identifier", () => {
    const root = treeWith({ "upstream/pin.json": JSON.stringify(goodPin) });
    expect(loadUpstreamPin(root).revision).toBe(goodPin.revision);
  });

  // An abbreviated revision is the failure this refuses: it resolves today and
  // becomes ambiguous as upstream grows, so a later reader cannot get back the
  // tree a number was produced against.
  test("refuses an abbreviated revision", () => {
    const root = treeWith({ "upstream/pin.json": JSON.stringify({ ...goodPin, revision: "0123456" }) });
    expect(() => loadUpstreamPin(root)).toThrow(/40-character commit identifier/);
  });

  test("refuses a missing revision", () => {
    const root = treeWith({ "upstream/pin.json": JSON.stringify({ repository: "example/example" }) });
    expect(() => loadUpstreamPin(root)).toThrow(/40-character commit identifier/);
  });

  test("refuses a file that is not JSON", () => {
    const root = treeWith({ "upstream/pin.json": "not json at all" });
    expect(() => loadUpstreamPin(root)).toThrow(/cannot read .* as JSON/);
  });
});

describe("loadToolchains", () => {
  test("accepts a complete table", () => {
    const root = treeWith({ "tools/toolchains.json": JSON.stringify(goodToolchains) });
    expect(loadToolchains(root).pins).toHaveLength(1);
  });

  test("refuses an empty or absent pin list", () => {
    for (const pins of [[], undefined, "not an array"]) {
      const root = treeWith({ "tools/toolchains.json": JSON.stringify({ ...goodToolchains, pins }) });
      expect(() => loadToolchains(root)).toThrow(/pins must be a non-empty array/);
    }
  });

  test("refuses an empty or absent language list", () => {
    for (const languages of [[], undefined]) {
      const root = treeWith({ "tools/toolchains.json": JSON.stringify({ ...goodToolchains, languages }) });
      expect(() => loadToolchains(root)).toThrow(/languages must be a non-empty array/);
    }
  });

  // Every field is required because each one is what a later reader quotes. A pin
  // with no command behind it is the claim this repository's rules refuse.
  test("refuses a pin missing any required field", () => {
    for (const field of ["id", "kind", "version", "decidedBy", "command", "output"]) {
      const pin: Record<string, unknown> = { ...goodToolchains.pins[0] };
      delete pin[field];
      const root = treeWith({ "tools/toolchains.json": JSON.stringify({ ...goodToolchains, pins: [pin] }) });
      expect(() => loadToolchains(root)).toThrow(new RegExp(`is missing ${field}`));
    }
  });

  test("refuses a pin whose required field is empty", () => {
    const pins = [{ ...goodToolchains.pins[0], version: "" }];
    const root = treeWith({ "tools/toolchains.json": JSON.stringify({ ...goodToolchains, pins }) });
    expect(() => loadToolchains(root)).toThrow(/is missing version/);
  });
});

describe("loadPackageJson", () => {
  test("parses the manifest it is pointed at", () => {
    const root = treeWith({ "package.json": JSON.stringify({ name: "example" }) });
    expect(readField(loadPackageJson(root), "name")).toBe("example");
  });
});
