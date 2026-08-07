import { describe, expect, test } from "vitest";
import { describeRunCoverage } from "../../tools/src/hardware/coverage.ts";

describe("describeRunCoverage", () => {
  test("calls an unfiltered run over every planned case a full one", () => {
    const coverage = describeRunCoverage({ filters: [], planned: 9, ran: 9, skipped: 0 });
    expect(coverage.full).toBe(true);
    expect(coverage.lines).toEqual(["examined the WHOLE hardware-bound set: 9 case(s), none skipped, no filter."]);
  });

  // The failure this exists against: three cases out of nine, a green line, and a
  // later reader quoting it as though it had been nine.
  test("calls a narrowed run partial and says it may not be read as a full one", () => {
    const coverage = describeRunCoverage({ filters: ["--grep", "webgl"], planned: 3, ran: 3, skipped: 0 });
    expect(coverage.full).toBe(false);
    expect(coverage.lines[0]).toContain("examined PART of the hardware-bound set");
    expect(coverage.lines[0]).toContain("may NOT be read as a full one");
    expect(coverage.lines[1]).toBe("  partial because the command was narrowed by: --grep webgl");
  });

  test("calls a run with a skipped case partial", () => {
    const coverage = describeRunCoverage({ filters: [], planned: 9, ran: 8, skipped: 1 });
    expect(coverage.full).toBe(false);
    expect(coverage.lines).toContain("  partial because 1 case(s) were skipped by the suite");
  });

  test("calls a run that fell short of its plan partial, even with no filter and no skip", () => {
    const coverage = describeRunCoverage({ filters: [], planned: 9, ran: 4, skipped: 0 });
    expect(coverage.full).toBe(false);
    expect(coverage.lines).toContain("  partial because 4 of 9 planned case(s) ran");
  });

  test("gives every reason rather than the first", () => {
    const coverage = describeRunCoverage({ filters: ["--grep", "x"], planned: 9, ran: 4, skipped: 2 });
    expect(coverage.lines).toHaveLength(4);
  });
});
