// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The hole the headless rule names in its own comment, and the near miss that
// separates a call from the same word written down.
//
// The unit suite refuses a browser driver when the bundler resolves the import.
// A module pulled in at runtime through node:module never passes through that
// resolution, so a test loading a driver this way runs it and reports green on a
// machine with no display. tools/vitest.config.ts says so where the plugin is
// installed; nothing refused it until this rule.
//
// The word createRequire appears three times in this file and only one of them
// is a call. A search over tokens cannot tell them apart and would refuse this
// comment; an analyser reading the syntax refuses the call and leaves the
// sentence and the string alone. The proof job asserts a count of exactly one,
// which is what makes that difference a measurement rather than a claim.
//
// Nothing imports this module and no test calls the function below.

import { createRequire } from "node:module";

const theNameOfTheThing = "createRequire";

// Refused. This is the route the headless rule does not reach.
export function loadADriverBehindTheGuard(): unknown {
  const load = createRequire(import.meta.url);
  return load("@playwright/test");
}

export const mentionedButNotCalled: string = theNameOfTheThing;
