import { describe, expect, test } from "vitest";
import { checkLockfileDrift } from "../../tools/src/checks/lockfile-drift.ts";
import { passed } from "../../tools/src/checks/report.ts";

const before = "a".repeat(64);
const after = "b".repeat(64);

describe("checkLockfileDrift", () => {
  test("passes when a resolve left the lock file alone", () => {
    const report = checkLockfileDrift({ kind: "ran" }, before, before);
    expect(passed(report)).toBe(true);
    expect(report.lines.at(-1)).toMatch(/the lock file is unmoved/);
  });

  test("refuses when a resolve rewrote the lock file", () => {
    const report = checkLockfileDrift({ kind: "ran" }, before, after);
    expect(report.refusals[0]).toMatch(/a resolve rewrites pnpm-lock.yaml/);
    expect(report.repair).toBe("corepack pnpm install --lockfile-only");
  });

  // The case this separation exists for. A resolve that never ran has said nothing
  // about drift, and reporting it as a clean lock file is the fail-open that makes
  // a broken network look like a correct tree.
  test("refuses a resolve that could not be run", () => {
    const report = checkLockfileDrift({ kind: "could-not-run", detail: "spawn ENOENT" }, before, before);
    expect(passed(report)).toBe(false);
    expect(report.refusals[0]).toMatch(/failure to judge rather than a clean lock file/);
  });

  test("refuses a resolve that ran and failed", () => {
    const report = checkLockfileDrift({ kind: "failed", status: 1 }, before, before);
    expect(report.refusals[0]).toBe("the resolve exited 1, so no verdict on drift was reached");
  });

  // A failed resolve that also moved the bytes must be refused for the failure and
  // not for the drift, because the drift verdict was never reached.
  test("reports a failed resolve as a failure even where the bytes also moved", () => {
    const report = checkLockfileDrift({ kind: "failed", status: 2 }, before, after);
    expect(report.refusals).toHaveLength(1);
    expect(report.refusals[0]).toMatch(/no verdict on drift was reached/);
  });

  // Both hashes are what a reader checks the verdict against, so they are printed
  // on the failing paths as well as the passing one.
  test("always prints both hashes, whatever the outcome", () => {
    for (const report of [
      checkLockfileDrift({ kind: "ran" }, before, after),
      checkLockfileDrift({ kind: "failed", status: 1 }, before, after),
      checkLockfileDrift({ kind: "could-not-run", detail: "why" }, before, after),
    ]) {
      expect(report.lines[0]).toBe(`pnpm-lock.yaml sha256 before resolve: ${before}`);
      expect(report.lines[1]).toBe(`pnpm-lock.yaml sha256 after resolve:  ${after}`);
    }
  });
});
