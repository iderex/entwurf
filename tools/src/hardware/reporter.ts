// The reporter that makes a hardware-bound run readable. It prints the machine
// before anything else, prints whether the whole set was examined or part of it,
// and writes one result file that carries the machine beside every case.
//
// The result file is the reason this is a reporter rather than a print at the
// end of the runner: a number this suite produces has to leave here already
// attached to the machine it was produced on, so that no later step has to
// remember to attach one.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { describeRunCoverage } from "./coverage.ts";
import { describeMachine, type Machine } from "./machine.ts";

const repoRoot = dirname(dirname(dirname(import.meta.dirname)));
export const resultPath = join(repoRoot, "tests", "hardware", "results", "run.json");

export default class HardwareRunReporter implements Reporter {
  private planned = 0;
  private readonly cases: { title: string; status: string; durationMs: number }[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    this.planned = suite.allTests().length;
    for (const line of this.machineLines()) console.log(line);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.cases.push({ title: test.titlePath().slice(1).join(" > "), status: result.status, durationMs: result.duration });
  }

  onEnd(result: FullResult): void {
    const machine = this.machine();
    const skipped = this.cases.filter((one) => one.status === "skipped").length;
    const coverage = describeRunCoverage({
      filters: (process.env.ENTWURF_FILTERS ?? "").split(" ").filter((one) => one.length > 0),
      planned: this.planned,
      ran: this.cases.length - skipped,
      skipped,
    });

    for (const line of coverage.lines) console.log(line);

    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(
      resultPath,
      `${JSON.stringify({ machine, full: coverage.full, coverage: coverage.lines, status: result.status, cases: this.cases }, null, 2)}\n`,
    );
    console.log(`the machine and every case are written together to ${resultPath}`);
  }

  private machine(): Machine | null {
    const raw = process.env.ENTWURF_MACHINE;
    return raw === undefined ? null : (JSON.parse(raw) as Machine);
  }

  private machineLines(): string[] {
    const machine = this.machine();
    return machine === null
      ? ["machine: NOT recorded, because this run was started without the preflight that reads it"]
      : describeMachine(machine);
  }
}
