// SPDX-FileCopyrightText: 2026 Nils Lehnen
// SPDX-License-Identifier: AGPL-3.0-only

// The fixture that proves the two analysers do not see the same tree.
//
// The defect is the same one tests/fixtures/code-scanning/typescript/path-injection.ts
// holds: a path arrives from the network and reaches the file system with
// nothing resolving it against a root first. What differs is one step. There the
// request line goes straight into the read. Here it goes through the query
// string, which is the shape a real handler has, and which the first analyser
// was measured not to follow. That measurement is why the other fixture's flow
// is direct, and it is written into that file and into
// docs/quality/code-scanning.md.
//
// So this file is not a second copy of a defect. It is the difference between
// two instruments, held where both of them run: the proof job refuses when the
// second analyser stops finding it, and refuses again when the first one starts,
// because on that day the file has stopped proving what it was written for and
// the claim in the document would be stale rather than wrong-and-noisy.
//
// Nothing imports this module, no test loads it, no build includes it and the
// server it constructs is never told to listen. The unit suite runs only
// tests/unit/**/*.test.ts and coverage is measured only over tools/src, so this
// file is outside both. The one route that reads it is the type checker.
//
// If a change makes this file safe, both jobs go quiet rather than red about the
// thing that matters. Repair the change, not this file.

import { createServer } from "node:http";
import { readFile } from "node:fs";

export const serverThatTrustsAQueryParameter = createServer((request, response) => {
  // An unchecked string from the network, one indirection away from the request
  // line, treated as a path on the host.
  const asked = new URL(request.url ?? "/", "http://localhost").searchParams.get("file") ?? "index.html";

  readFile(asked, (failure, bytes) => {
    if (failure !== null) {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.end(bytes);
  });
});
