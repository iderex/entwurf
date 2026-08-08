// A deliberately vulnerable file, and the only one in this tree.
//
// It exists because a scanner that reaches nothing and a scanner that reaches
// everything and finds nothing print the same green tick. This file is the
// difference between the two: the code-scanning workflow is only evidence about
// this repository once something in this repository has been caught by it, and
// the alert this file raises is that evidence. docs/quality/code-scanning.md is
// where the alert is named and where its remaining open is explained.
//
// The vulnerability is the ordinary one. A request names a file, the name is
// taken from the query string, and it reaches the file system without ever
// being checked against a root, so ../../ walks wherever the process can read.
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

export const serverThatTrustsTheQueryString = createServer((request, response) => {
  // Everything after this point treats an unchecked string from the network as
  // a path on the host.
  const asked = new URL(request.url ?? "/", "http://example.invalid").searchParams.get("file");
  if (asked === null) {
    response.statusCode = 400;
    response.end();
    return;
  }

  readFile(asked, (failure, bytes) => {
    if (failure !== null) {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.end(bytes);
  });
});
