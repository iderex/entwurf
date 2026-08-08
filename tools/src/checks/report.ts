// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The shape every check produces, and the one place a report becomes an exit
// status. Keeping the decision in a value rather than in a call to process.exit
// is what lets the suite run a check without ending the process it runs in.

export type Report = {
  // What the run examined, printed whether or not it refused anything. A run that
  // covered less than the whole set has to be distinguishable from one that
  // covered it and found nothing.
  lines: string[];
  // One entry per refusal. Empty means the check passed.
  refusals: string[];
  // What to do about a refusal, printed after the refusals.
  repair: string;
};

export function passed(report: Report): boolean {
  return report.refusals.length === 0;
}

export function emit(report: Report, out = console.log, err = console.error): void {
  for (const line of report.lines) out(line);
  if (passed(report)) return;
  for (const refusal of report.refusals) err(`REFUSED  ${refusal}`);
  err(`Repair: ${report.repair}`);
}
