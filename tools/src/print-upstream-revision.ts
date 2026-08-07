// Prints the upstream revision this tree builds and measures against, so that a
// number, a profile or a bug report can carry it without anybody reading a file
// by hand.

import { loadUpstreamPin } from "./pins.ts";

const pin = loadUpstreamPin();
console.log(`${pin.repository} ${pin.branch} ${pin.revision} ${pin.committed}`);
