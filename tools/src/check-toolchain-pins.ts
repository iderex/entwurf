// Runner. Reads the three documents and hands them to the decision in
// tools/src/checks/toolchain-pins.ts, which is where the suite reaches it.

import { loadPackageJson, loadToolchains, loadUpstreamPin } from "./pins.ts";
import { checkToolchainPins } from "./checks/toolchain-pins.ts";
import { emit, passed } from "./checks/report.ts";

const report = checkToolchainPins(loadToolchains(), loadUpstreamPin(), loadPackageJson());
emit(report);
if (!passed(report)) process.exit(1);
