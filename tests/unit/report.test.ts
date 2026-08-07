import { describe, expect, test } from "vitest";
import { emit, passed, type Report } from "../../tools/src/checks/report.ts";
import { coverageExclude, coverageFloor, coverageInclude, describeCoverageScope } from "../../tools/src/coverage-scope.ts";

function collect(): { sink: string[]; write: (line: string) => void } {
  const sink: string[] = [];
  return { sink, write: (line: string) => void sink.push(line) };
}

describe("passed", () => {
  test("is true only where nothing was refused", () => {
    expect(passed({ lines: [], refusals: [], repair: "x" })).toBe(true);
    expect(passed({ lines: [], refusals: ["something"], repair: "x" })).toBe(false);
  });
});

describe("emit", () => {
  const report: Report = { lines: ["examined two things"], refusals: ["one of them is wrong"], repair: "fix it" };

  test("prints what was examined even when the check passed", () => {
    const out = collect();
    const err = collect();
    emit({ ...report, refusals: [] }, out.write, err.write);
    expect(out.sink).toEqual(["examined two things"]);
    expect(err.sink).toEqual([]);
  });

  // A refusal goes to the error stream and carries the repair, because the reader
  // of a red run is somebody who needs to know what to do next.
  test("prints every refusal and the repair when the check failed", () => {
    const out = collect();
    const err = collect();
    emit(report, out.write, err.write);
    expect(out.sink).toEqual(["examined two things"]);
    expect(err.sink).toEqual(["REFUSED  one of them is wrong", "Repair: fix it"]);
  });
});

describe("the coverage scope the run announces", () => {
  test("says what is measured, what is not, and why", () => {
    const described = describeCoverageScope();
    expect(described[0]).toContain(coverageInclude[0]);
    for (const { pattern, reason } of coverageExclude) {
      expect(described.some((line) => line.includes(pattern) && line.includes(reason))).toBe(true);
    }
  });

  // The upstream checkout is the exclusion this project can least afford to leave
  // implicit: measuring it would report somebody else's tree as this one's.
  test("excludes the upstream checkout by name", () => {
    expect(coverageExclude.map(({ pattern }) => pattern)).toContain("upstream/**");
  });

  test("announces the floor with the run", () => {
    expect(describeCoverageScope().at(-1)).toBe(
      `floor: lines ${coverageFloor.lines}%, functions ${coverageFloor.functions}%, branches ${coverageFloor.branches}%, statements ${coverageFloor.statements}%`,
    );
  });
});
