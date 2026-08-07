// Whether a hardware-bound run covered the whole set or part of it, decided from
// what the command was asked to do and what the run then did.
//
// A partial run has to be readable as partial from the output alone. The failure
// this prevents is the one the separate suite exists against in the first place:
// a run that examined three cases out of nine, printed a green line, and was
// quoted afterwards as though it had examined nine.

export type RunShape = {
  // Arguments the command was given beyond its own name. Anything here can
  // narrow what runs, so anything here makes the run partial.
  filters: string[];
  planned: number;
  ran: number;
  skipped: number;
};

export type Coverage = { full: boolean; lines: string[] };

export function describeRunCoverage(shape: RunShape): Coverage {
  const reasons: string[] = [];
  if (shape.filters.length > 0) reasons.push(`the command was narrowed by: ${shape.filters.join(" ")}`);
  if (shape.skipped > 0) reasons.push(`${shape.skipped} case(s) were skipped by the suite`);
  if (shape.ran !== shape.planned) reasons.push(`${shape.ran} of ${shape.planned} planned case(s) ran`);

  const full = reasons.length === 0;
  const lines = [
    full
      ? `examined the WHOLE hardware-bound set: ${shape.ran} case(s), none skipped, no filter.`
      : `examined PART of the hardware-bound set: ${shape.ran} of ${shape.planned} case(s). This run may NOT be read as a full one.`,
    ...reasons.map((reason) => `  partial because ${reason}`),
  ];
  return { full, lines };
}
