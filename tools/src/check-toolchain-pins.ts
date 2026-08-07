// Refuses a toolchain version in package.json that has drifted from the pin
// table, and a pin table produced against a different upstream revision than the
// one the tree builds against.
//
// The failure it prevents: package.json is edited by a resolver, a dependency
// bump or a hand, the pin table is not, and every later claim about which
// compiler produced a number is quoting a file nothing agreed with.

import { loadPackageJson, loadToolchains, loadUpstreamPin, readField } from "./pins.ts";

const toolchains = loadToolchains();
const upstream = loadUpstreamPin();
const pkg = loadPackageJson();

const refusals: string[] = [];

if (toolchains.producedAgainst.revision !== upstream.revision) {
  refusals.push(
    `tools/toolchains.json was produced against ${toolchains.producedAgainst.revision}, upstream/pin.json names ${upstream.revision}`,
  );
}
if (toolchains.producedAgainst.repository !== upstream.repository) {
  refusals.push(
    `tools/toolchains.json names repository ${toolchains.producedAgainst.repository}, upstream/pin.json names ${upstream.repository}`,
  );
}

let mirrored = 0;
let unmirrored = 0;

for (const pin of toolchains.pins) {
  if (pin.mirroredIn === null) {
    unmirrored += 1;
    console.log(`not mirrored  ${pin.id} ${pin.version} (no file in this tree carries it)`);
    continue;
  }
  mirrored += 1;
  if (pin.mirroredIn.file !== "package.json") {
    refusals.push(`pin ${pin.id} names ${pin.mirroredIn.file}, which this check does not read`);
    continue;
  }
  const found = readField(pkg, pin.mirroredIn.field);
  if (found === undefined) {
    refusals.push(`package.json has no ${pin.mirroredIn.field}, which pin ${pin.id} says carries ${pin.version}`);
    continue;
  }
  // packageManager carries an integrity hash after the version, so it is compared
  // by prefix. Every other mirror is compared for exact equality: a range where a
  // pin is expected is the drift this check exists against.
  const matches =
    pin.mirroredIn.field === "packageManager"
      ? found === `${pin.id}@${pin.version}` || found.startsWith(`${pin.id}@${pin.version}+`)
      : found === pin.version;
  if (!matches) {
    refusals.push(`package.json ${pin.mirroredIn.field} is ${found}, pin ${pin.id} is ${pin.version}`);
    continue;
  }
  console.log(`ok            ${pin.id} ${pin.version} = package.json ${pin.mirroredIn.field}`);
}

console.log(
  `examined ${toolchains.pins.length} pin(s) against upstream ${upstream.repository}@${upstream.revision}: ${mirrored} compared against package.json, ${unmirrored} carried by no file in this tree and therefore NOT compared here.`,
);

if (refusals.length > 0) {
  for (const refusal of refusals) console.error(`REFUSED  ${refusal}`);
  console.error(
    "Repair: correct package.json, or re-run the command in the pin's `command` field against the pinned revision and update tools/toolchains.json with what it prints.",
  );
  process.exit(1);
}
