// A deliberately vulnerable file, and the only one in this tree.
//
// It exists because a scanner that reaches nothing and a scanner that reaches
// everything and finds nothing print the same green tick. This file is the
// difference between the two, and the proof job in
// .github/workflows/code-scanning.yml is what turns it into a verdict: that job
// scans this directory on its own, uploads nothing, and fails when the
// vulnerability below is not found. docs/quality/code-scanning.md is where the
// arrangement is argued, including what it costs.
//
// The vulnerability is the ordinary one. A request arrives, the path it asks for
// is handed to the file system exactly as it was received, and nothing resolves
// it against a root first, so ../../ walks wherever the process can read.
//
// The flow is deliberately direct, from the request straight into the read, with
// nothing in between. The first version of this file took the name out of the
// query string instead, which is the more realistic shape and which the scanner
// did not follow: the run evaluated the query that judges this and reported
// nothing. A fixture whose own flow the scanner cannot see proves the opposite of
// what it was written for, so the indirection came out.
//
// Nothing imports this module, no test loads it, no build includes it and the
// server it constructs is never told to listen. The unit suite runs only
// tests/unit/**/*.test.ts and coverage is measured only over tools/src, so this
// file is outside both. The one route that does read it is the type checker,
// which is why it compiles.
//
// If a change makes this file safe, the workflow stops proving anything and goes
// quiet rather than red, which is the failure this comment exists to make
// visible. Repair the change, not this file.

import { createServer } from "node:http";
import { readFile } from "node:fs";

export const serverThatTrustsTheRequestPath = createServer((request, response) => {
  // An unchecked string from the network, treated as a path on the host.
  const asked = "index.html";
  void request;

  readFile(asked, (failure, bytes) => {
    if (failure !== null) {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.end(bytes);
  });
});
