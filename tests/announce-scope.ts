// Printed before the first test, so a run says what it measured and what it did
// not. A coverage number with no statement of what was left out of it reads as a
// number about the whole tree, and it is not one.

import { describeCoverageScope } from "../tools/src/coverage-scope.ts";

export function setup(): void {
  console.log("unit suite: no display, no GPU, no browser driver.");
  for (const line of describeCoverageScope()) console.log(line);
}
