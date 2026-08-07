// What coverage is measured over, and what it is not measured over. This is a
// module rather than four lines inside the Vitest config because the run prints
// it: an exclusion nobody sees is indistinguishable from code that was covered,
// and the upstream checkout being outside the measurement is the exclusion this
// project can least afford to leave implicit.

export const coverageInclude = ["tools/src/**/*.ts"];

export const coverageExclude: { pattern: string; reason: string }[] = [
  {
    pattern: "upstream/**",
    reason:
      "the pinned upstream checkout is not this repository's code, and measuring it would report somebody else's tree as this project's coverage",
  },
  {
    pattern: "tools/src/check-*.ts",
    reason:
      "runners: they read files, spawn a resolve and set an exit status, and hold no decision. Nothing here proves them, which is why the decisions were moved out of them",
  },
  {
    pattern: "tools/src/print-*.ts",
    reason: "runners, same as above",
  },
  {
    pattern: "tools/src/coverage-scope.ts",
    reason: "this file, which is configuration rather than logic",
  },
];

// The floor a change may not walk under. It is the measured number rounded down,
// not an aspiration: a floor above what the suite reaches would be red on the day
// it landed, and a floor far below it stops catching anything.
export const coverageFloor = {
  lines: 95,
  functions: 95,
  branches: 90,
  statements: 95,
};

export function describeCoverageScope(): string[] {
  return [
    `coverage is measured over: ${coverageInclude.join(", ")}`,
    ...coverageExclude.map(({ pattern, reason }) => `coverage is NOT measured over ${pattern}: ${reason}`),
    `floor: ${Object.entries(coverageFloor)
      .map(([kind, value]) => `${kind} ${value}%`)
      .join(", ")}`,
  ];
}
