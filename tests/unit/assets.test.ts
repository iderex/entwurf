// The proof for the asset register. Each rule carries a fixture that is a near
// miss rather than an obvious violation: the register somebody actually writes,
// one edit away from the correct one, which is also here and has to pass. A
// fixture built out of an obvious violation proves the rule matches itself and
// nothing about the mistake the rule exists for.
//
// Each fixture is required to refuse exactly its own rule and no other, and each
// is also run with its own rule switched off, where it has to pass. Together
// those two legs are what says the refusal came from the rule under test rather
// than from somewhere else in the run, which is the same thing as deleting the
// rule and watching this go green.

import { describe, expect, test } from "vitest";
import {
  assetKindByExtension,
  assetsIn,
  checkAssets,
  parseRegister,
  placeholderLicences,
  requiredFields,
  ruleIds,
  rules,
} from "../../tools/src/checks/assets.ts";
import { passed } from "../../tools/src/checks/report.ts";

const registerPath = "docs/legal/assets.md";

function register(...blocks: readonly (readonly string[])[]): string {
  return ["# The register", "", "```asset", ...blocks.flatMap((block, index) => (index === 0 ? block : ["", ...block])), "```", ""].join("\n");
}

function entryFor(path: string, ...overrides: readonly string[]): string[] {
  const base = new Map([
    ["Path", path],
    ["What", "an icon the permissions page shows"],
    ["Licence", "CC-BY-4.0"],
    ["Source", "https://example.invalid/icons/LICENCE"],
    ["Read", "2026-08-08"],
  ]);
  for (const override of overrides) {
    const at = override.indexOf(":");
    base.set(override.slice(0, at), override.slice(at + 1).trim());
  }
  return [...base].map(([name, value]) => (value.length === 0 ? `${name}:` : `${name}: ${value}`));
}

function run(text: string, tracked: readonly string[], enabled?: ReadonlySet<string>) {
  return checkAssets({ tracked, entries: parseRegister(text), registerPath }, enabled);
}

const icon = "docs/plugins/img/permissions.svg";
const retina = "docs/plugins/img/permissions@2x.png";
const prose = "docs/plugins/README.md";

type Row = {
  id: string;
  // Why this is the mistake somebody will actually make.
  why: string;
  nearMiss: { text: string; tracked: readonly string[] };
  // The same register written correctly. Without this the fixture proves the rule
  // fires somewhere in the neighbourhood and not that it separates the two.
  corrected: { text: string; tracked: readonly string[] };
  // The refusal in full, so a message that stopped naming the rule or stopped
  // naming the line is caught here rather than read past.
  refusal: string;
};

const rows: readonly Row[] = [
  {
    id: "asset-without-an-entry",
    why: "adding the second file of a pair, where the first one already has an entry and the change looks like it is about one icon",
    nearMiss: { text: register(entryFor(icon)), tracked: [prose, icon, retina] },
    corrected: { text: register(entryFor(icon), entryFor(retina)), tracked: [prose, icon, retina] },
    refusal: `asset-without-an-entry: ${retina}: is a raster image and ${registerPath} carries no entry for it`,
  },
  {
    id: "entry-without-a-file",
    why: "deleting an asset in a change that had nothing to do with the register, so the row stays behind holding terms for nothing",
    nearMiss: { text: register(entryFor(icon)), tracked: [prose] },
    corrected: { text: register(), tracked: [prose] },
    refusal: `entry-without-a-file: ${registerPath}:4: names ${icon}, which this repository does not track`,
  },
  {
    id: "entry-named-twice",
    why: "re-reading the terms and adding the new block beside the old one instead of replacing it, so the register holds two answers",
    nearMiss: {
      text: register(entryFor(icon), entryFor(icon, "Licence: CC-BY-SA-4.0", "Read: 2027-01-04")),
      tracked: [prose, icon],
    },
    corrected: {
      text: register(entryFor(icon, "Licence: CC-BY-SA-4.0", "Read: 2027-01-04")),
      tracked: [prose, icon],
    },
    refusal: `entry-named-twice: ${registerPath}:10: names ${icon}, which the entry at line 4 already names`,
  },
  {
    id: "entry-without-a-licence",
    why: "writing down that the licence has not been established yet, in the field that is read as the licence",
    nearMiss: { text: register(entryFor(icon, "Licence: unknown")), tracked: [prose, icon] },
    corrected: { text: register(entryFor(icon)), tracked: [prose, icon] },
    refusal: `entry-without-a-licence: ${registerPath}:4 (${icon}): carries "unknown" as its licence, which is a note to come back rather than a licence`,
  },
  {
    id: "entry-without-its-provenance",
    why: "dating the reading by the month it happened in, which is how somebody writes a date they are recalling rather than reading off a clock",
    nearMiss: { text: register(entryFor(icon, "Read: 2026-08")), tracked: [prose, icon] },
    corrected: { text: register(entryFor(icon)), tracked: [prose, icon] },
    refusal: `entry-without-its-provenance: ${registerPath}:4 (${icon}): was read on "2026-08", which is not a date in the form YYYY-MM-DD`,
  },
];

describe("the rule table", () => {
  test("carries the five rules this check names, and no rule twice", () => {
    expect([...ruleIds].sort()).toEqual([
      "asset-without-an-entry",
      "entry-named-twice",
      "entry-without-a-file",
      "entry-without-a-licence",
      "entry-without-its-provenance",
    ]);
  });

  test("every rule says what it prevents and what it does not reach", () => {
    for (const rule of rules) {
      expect(rule.prevents.length, rule.id).toBeGreaterThan(0);
      expect(rule.bound.length, rule.id).toBeGreaterThan(0);
    }
  });

  // A rule added to the table without a fixture here is one nothing proves, and it
  // would ship looking exactly like the five that are proved.
  test("every rule in the table has a fixture in this file", () => {
    expect(rows.map((row) => row.id).sort()).toEqual([...ruleIds].sort());
  });

  test("every required field says why it is required", () => {
    for (const [name, reason] of requiredFields) {
      expect(reason.length, name).toBeGreaterThan(0);
    }
  });
});

describe.each(rows)("$id", (row) => {
  test("refuses the near miss, naming the rule and the place", () => {
    const report = run(row.nearMiss.text, row.nearMiss.tracked);
    expect(report.refusals).toEqual([row.refusal]);
  });

  test("passes the same fixture with this rule not run", () => {
    const report = run(row.nearMiss.text, row.nearMiss.tracked, new Set(ruleIds.filter((id) => id !== row.id)));
    expect(passed(report)).toBe(true);
    expect(report.lines.at(-1)).toBe(`NOT run on this run, so this run says nothing about them: ${row.id}.`);
  });

  test("passes the corrected register", () => {
    const report = run(row.corrected.text, row.corrected.tracked);
    expect(report.refusals).toEqual([]);
  });
});

describe("the fields an entry has to carry", () => {
  test("an entry with no licence field at all is refused, not only an empty one", () => {
    const withoutTheField = register(entryFor(icon).filter((line) => !line.startsWith("Licence:")));
    const report = run(withoutTheField, [icon]);
    expect(report.refusals).toEqual([`entry-without-a-licence: ${registerPath}:4 (${icon}): carries no licence`]);
  });

  test("an empty licence field is refused", () => {
    const report = run(register(entryFor(icon, "Licence:")), [icon]);
    expect(report.refusals).toEqual([`entry-without-a-licence: ${registerPath}:4 (${icon}): carries no licence`]);
  });

  // Every placeholder in the register is a word an emptiness check passes, so each
  // one has to be refused or the list is decoration.
  test("every placeholder word in the list is refused as a licence", () => {
    for (const placeholder of placeholderLicences) {
      const report = run(register(entryFor(icon, `Licence: ${placeholder}`)), [icon]);
      expect(report.refusals, placeholder).toHaveLength(1);
      expect(report.refusals[0], placeholder).toContain("entry-without-a-licence");
    }
  });

  test("a placeholder written in another case is still refused", () => {
    const report = run(register(entryFor(icon, "Licence: TBD")), [icon]);
    expect(report.refusals).toHaveLength(1);
  });

  test("an entry that does not say where its licence was read is refused", () => {
    const report = run(register(entryFor(icon, "Source:")), [icon]);
    expect(report.refusals).toEqual([
      `entry-without-its-provenance: ${registerPath}:4 (${icon}): does not say where its licence was read`,
    ]);
  });

  test("an entry with no date field at all is refused, not only an unreadable one", () => {
    const withoutTheField = register(entryFor(icon).filter((line) => !line.startsWith("Read:")));
    const report = run(withoutTheField, [icon]);
    expect(report.refusals).toEqual([
      `entry-without-its-provenance: ${registerPath}:4 (${icon}): does not say when its licence was read`,
    ]);
  });

  test("an empty date field is refused", () => {
    const report = run(register(entryFor(icon, "Read:")), [icon]);
    expect(report.refusals).toEqual([
      `entry-without-its-provenance: ${registerPath}:4 (${icon}): does not say when its licence was read`,
    ]);
  });

  // A block somebody started and did not finish. The refusal has no path to name,
  // so it names the line, which is the only thing that would let a reader find it.
  test("a half-written block is refused by its line when it has no path to be named by", () => {
    const halfWritten = ["```asset", "What: an icon nobody finished the row for", "```"].join("\n");
    const report = run(halfWritten, []);
    expect(report.refusals).toEqual([
      `entry-without-a-file: ${registerPath}:2: names no path, so nothing can be checked against it`,
      `entry-without-a-licence: ${registerPath}:2: carries no licence`,
      `entry-without-its-provenance: ${registerPath}:2: does not say where its licence was read`,
      `entry-without-its-provenance: ${registerPath}:2: does not say when its licence was read`,
    ]);
  });

  test("an entry whose path field is present and empty is refused like one with none", () => {
    const report = run(register(entryFor(icon, "Path:")), []);
    expect(report.refusals).toEqual([
      `entry-without-a-file: ${registerPath}:4: names no path, so nothing can be checked against it`,
    ]);
  });

  test("an entry with no path names its line and says nothing can be checked against it", () => {
    const orphan = register(entryFor(icon).filter((line) => !line.startsWith("Path:")));
    const report = run(orphan, [icon]);
    expect(report.refusals).toEqual([
      `asset-without-an-entry: ${icon}: is a vector image and ${registerPath} carries no entry for it`,
      `entry-without-a-file: ${registerPath}:4: names no path, so nothing can be checked against it`,
    ]);
  });
});

describe("what the check declines to judge", () => {
  test("a tracked file whose extension is not in the table is not an asset", () => {
    expect(assetsIn(["docs/legal/assets.md", "tools/src/pins.ts", "docs/demo.mp4"])).toEqual([]);
  });

  // The bound in the rule table says file contents are never read. This is the
  // shape that sentence is about, measured rather than trusted.
  test("a font encoded into a source file is not reached", () => {
    const source = "tools/src/theme.ts";
    const report = run(register(), [source]);
    expect(passed(report)).toBe(true);
  });

  test("the extension table names what each shape is, so a refusal can say it", () => {
    expect(assetKindByExtension.get(".woff2")).toBe("a font");
    expect(assetKindByExtension.get(".svg")).toBe("a vector image");
    expect(assetKindByExtension.get(".penpot")).toBe("a design file");
  });

  test("an extension is judged whatever case it is written in", () => {
    expect(assetsIn(["docs/plugins/img/Permissions.SVG"])).toEqual([
      { path: "docs/plugins/img/Permissions.SVG", kind: "a vector image" },
    ]);
  });

  // A dotfile is not a file with an extension. Reading .svg out of .svgrc would
  // put a configuration file in front of a rule about fonts.
  test("a leading dot is not an extension", () => {
    expect(assetsIn([".png"])).toEqual([]);
  });

  // The replacement case, which trips two rules at once and is here rather than in
  // the exactness rows for that reason: the old row is stale and the new file is
  // unlisted, and a register that reported only one of the two would leave the
  // other to be found by a reader.
  test("an asset replaced by another format is refused from both directions", () => {
    const replaced = "docs/plugins/img/permissions.webp";
    const report = run(register(entryFor(icon)), [icon.replace(".svg", ".webp")]);
    expect(report.refusals).toEqual([
      `asset-without-an-entry: ${replaced}: is a raster image and ${registerPath} carries no entry for it`,
      `entry-without-a-file: ${registerPath}:4: names ${icon}, which this repository does not track`,
    ]);
  });
});

describe("reading the register", () => {
  test("reads only the blocks tagged as entries, so a worked example is not an entry", () => {
    const document = [
      "# The register",
      "",
      "An entry looks like this:",
      "",
      "    Path: assets/fonts/Example-Regular.otf",
      "    Licence: OFL-1.1",
      "",
      "```",
      "Path: docs/plugins/img/untagged.svg",
      "```",
      "",
      "```asset",
      ...entryFor(icon),
      "```",
      "",
    ].join("\n");
    const entries = parseRegister(document);
    expect(entries.map((entry) => entry.fields.get("Path"))).toEqual([icon]);
  });

  test("a blank line separates two entries in one block", () => {
    const entries = parseRegister(register(entryFor(icon), entryFor(retina)));
    expect(entries.map((entry) => entry.fields.get("Path"))).toEqual([icon, retina]);
    expect(entries.map((entry) => entry.line)).toEqual([4, 10]);
  });

  test("an empty block declares no entries", () => {
    expect(parseRegister(register())).toEqual([]);
  });

  // A shape the parse does not read leaves an entry out, which turns the asset it
  // was written for into an asset with no entry. It never invents an entry that
  // would let one pass.
  test("a line the parse does not read declares fewer entries rather than more", () => {
    const indented = ["```asset", `  Path: ${icon}`, "```"].join("\n");
    expect(parseRegister(indented)).toEqual([]);

    const report = run(indented, [icon]);
    expect(report.refusals).toEqual([`asset-without-an-entry: ${icon}: is a vector image and ${registerPath} carries no entry for it`]);
  });

  test("a field with no value is read as present and empty rather than absent", () => {
    const entries = parseRegister(register(entryFor(icon, "Licence:")));
    expect(entries[0]?.fields.get("Licence")).toBe("");
  });
});

describe("what the run says about itself", () => {
  test("counts the paths, the assets among them, the entries and the rules it ran", () => {
    const report = run(register(entryFor(icon)), [prose, icon]);
    expect(report.lines[0]).toBe(
      `examined 2 tracked path(s) by extension: 1 asset-shaped path(s), against 1 entr(ies) in ${registerPath}, under 5 of 5 rule(s).`,
    );
  });

  test("prints the extensions it is willing to judge, so one that is missing is visible", () => {
    const report = run(register(), []);
    expect(report.lines[1]).toContain(".woff2");
    expect(report.lines[1]).toContain("was NOT judged");
  });

  // The claim this check must never be read as making. A green run here says
  // nothing about the fonts a running system offers from anywhere but this tree.
  test("states on every run that it reaches only what this repository tracks", () => {
    const report = run(register(), []);
    expect(report.lines[2]).toContain("outside it and no run here is evidence about them");
  });

  test("prints what each rule prevents and what it does not reach", () => {
    const report = run(register(), []);
    for (const rule of rules) {
      expect(report.lines).toContain(`${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`);
    }
  });

  test("says nothing about the rules it did not run", () => {
    const report = run(register(), [], new Set(["entry-without-a-licence"]));
    expect(report.lines[0]).toMatch(/under 1 of 5 rule\(s\)/);
    expect(report.lines.at(-1)).toMatch(/^NOT run on this run/);
  });

  test("a clean run does not print the disabled line at all", () => {
    const report = run(register(), []);
    expect(report.lines.some((line) => line.startsWith("NOT run"))).toBe(false);
  });

  test("names every offending entry rather than the first", () => {
    const report = run(register(entryFor(icon, "Licence:"), entryFor(retina, "Licence:")), [icon, retina]);
    expect(report.refusals).toHaveLength(2);
  });

  test("the repair says what to do about a licence that cannot be established", () => {
    const report = run(register(), []);
    expect(report.repair).toContain("remove the asset rather than shipping it");
  });
});
