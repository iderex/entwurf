// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from "vitest";
import { checkToolchainPins } from "../../tools/src/checks/toolchain-pins.ts";
import { passed } from "../../tools/src/checks/report.ts";
import type { Toolchains, UpstreamPin } from "../../tools/src/pins.ts";

const revision = "0123456789abcdef0123456789abcdef01234567";

const upstream: UpstreamPin = {
  repository: "example/example",
  branch: "develop",
  revision,
  committed: "2026-01-01T00:00:00Z",
  producedBy: "a command",
  defaultBranchProducedBy: "another command",
};

function tableWith(pins: Toolchains["pins"], producedAgainst = { repository: "example/example", revision }): Toolchains {
  return { producedAgainst, pins, languages: ["typescript"] };
}

const nodePin: Toolchains["pins"][number] = {
  id: "node",
  kind: "runtime",
  version: "24.18.1",
  decidedBy: "upstream",
  command: "a command",
  output: "v24.18.1",
  mirroredIn: { file: "package.json", field: "engines.node" },
};

const pkg = {
  engines: { node: "24.18.1" },
  packageManager: "pnpm@11.20.0+sha512.abc",
  devDependencies: { typescript: "6.0.3" },
};

describe("checkToolchainPins", () => {
  test("passes a package.json that matches every mirrored pin", () => {
    const report = checkToolchainPins(tableWith([nodePin]), upstream, pkg);
    expect(passed(report)).toBe(true);
    expect(report.lines).toContain("ok            node 24.18.1 = package.json engines.node");
  });

  test("refuses a mirrored version that has drifted", () => {
    const report = checkToolchainPins(tableWith([nodePin]), upstream, { engines: { node: "24.18.0" } });
    expect(report.refusals).toEqual(["package.json engines.node is 24.18.0, pin node is 24.18.1"]);
  });

  test("refuses a mirror the manifest does not carry at all", () => {
    const report = checkToolchainPins(tableWith([nodePin]), upstream, {});
    expect(report.refusals[0]).toMatch(/package.json has no engines.node/);
  });

  // The integrity hash after the version is part of the field and is not part of
  // the pin, so packageManager is the one comparison that is a prefix.
  test("accepts packageManager with and without its hash", () => {
    const pin = { ...nodePin, id: "pnpm", version: "11.20.0", mirroredIn: { file: "package.json", field: "packageManager" } };
    expect(passed(checkToolchainPins(tableWith([pin]), upstream, pkg))).toBe(true);
    expect(passed(checkToolchainPins(tableWith([pin]), upstream, { packageManager: "pnpm@11.20.0" }))).toBe(true);
  });

  // A prefix comparison that stopped at the version string alone would accept
  // 11.20.01 as 11.20.0, which is a different package manager.
  test("refuses a packageManager whose version merely starts the same way", () => {
    const pin = { ...nodePin, id: "pnpm", version: "11.20.0", mirroredIn: { file: "package.json", field: "packageManager" } };
    const report = checkToolchainPins(tableWith([pin]), upstream, { packageManager: "pnpm@11.20.01" });
    expect(passed(report)).toBe(false);
  });

  test("counts a pin no file carries as not compared rather than as passed", () => {
    const report = checkToolchainPins(tableWith([{ ...nodePin, mirroredIn: null }]), upstream, pkg);
    expect(passed(report)).toBe(true);
    expect(report.lines).toContain("not mirrored  node 24.18.1 (no file in this tree carries it)");
    expect(report.lines.at(-1)).toMatch(/1 carried by no file in this tree and therefore NOT compared here/);
  });

  test("refuses a mirror in a file this check does not read", () => {
    const pin = { ...nodePin, mirroredIn: { file: "somewhere.toml", field: "version" } };
    const report = checkToolchainPins(tableWith([pin]), upstream, pkg);
    expect(report.refusals[0]).toMatch(/which this check does not read/);
  });

  // The table and the pin file are two documents that can drift apart, and a table
  // read off one revision says nothing about the tree built from another.
  test("refuses a table produced against a different revision", () => {
    const other = { repository: "example/example", revision: "f".repeat(40) };
    const report = checkToolchainPins(tableWith([nodePin], other), upstream, pkg);
    expect(report.refusals[0]).toMatch(/was produced against f{40}/);
  });

  test("refuses a table produced against a different repository", () => {
    const other = { repository: "someone/else", revision };
    const report = checkToolchainPins(tableWith([nodePin], other), upstream, pkg);
    expect(report.refusals[0]).toMatch(/names repository someone\/else/);
  });
});
