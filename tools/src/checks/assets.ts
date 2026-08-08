// Decides whether every asset this repository tracks carries an entry in the
// asset register, and whether every entry in the register still describes a file
// that is here. It fails closed in both directions: an asset with no entry is
// refused, and an entry naming nothing is refused too, because a register that
// keeps rows for files nobody has is a list of claims about nothing.
//
// Reads no file and runs no git command: the runner supplies the tracked paths
// and the register text, so the suite can put a font with no licence in front of
// this without one being committed.
//
// What it judges and what it does not. It reads file extensions, never file
// contents, so an asset carried inside a source file - a data URI, an inline SVG,
// a font embedded in CSS as base64 - is not reached by it. It judges what this
// repository TRACKS and says nothing about what a running system offers: the
// fonts and icons that arrive with the upstream distribution are not tracked
// here, so no green run from this check is evidence about them. Issue #69 is
// where that half stays open.
//
// It also cannot judge whether a recorded licence is the licence the file
// actually carries. Nothing that reads this tree could. What it refuses is the
// absent field and the placeholder, which are the two states a person writes when
// they have not looked yet.

import type { Report } from "./report.ts";

export type Entry = {
  // Where the entry starts in the register, so a refusal points at a line.
  line: number;
  fields: ReadonlyMap<string, string>;
};

export type Rule = {
  // The stable name a refusal is reported under.
  id: string;
  // What goes wrong when this is violated, printed on every run.
  prevents: string;
  // What this one does not reach, printed on every run beside the failure it
  // prevents, because a rule whose bound is not stated is read as covering
  // everything it plausibly could.
  bound: string;
  find: (input: Input) => Refusal[];
};

export type Input = {
  // Every path the repository tracks. The check picks the asset-shaped ones out
  // of it rather than being handed them, so the shape table is the one place the
  // set is decided.
  tracked: readonly string[];
  entries: readonly Entry[];
  // Where the register was read from, named in a refusal so a reader knows which
  // file to open.
  registerPath: string;
};

export type Refusal = { where: string; detail: string };

export const repair =
  "add the asset to the register in docs/legal/assets.md with the licence, where that licence was read from and the date it was read, or, where the licence cannot be established, remove the asset rather than shipping it.";

// The extensions this check treats as an asset, grouped by what they are. A file
// whose extension is absent from here is not judged at all, which is why the run
// prints the table: an asset in a format nobody listed passes silently otherwise.
export const assetKindByExtension: ReadonlyMap<string, string> = new Map([
  [".ttf", "a font"],
  [".otf", "a font"],
  [".ttc", "a font"],
  [".woff", "a font"],
  [".woff2", "a font"],
  [".eot", "a font"],
  [".svg", "a vector image"],
  [".png", "a raster image"],
  [".jpg", "a raster image"],
  [".jpeg", "a raster image"],
  [".gif", "a raster image"],
  [".webp", "a raster image"],
  [".avif", "a raster image"],
  [".bmp", "a raster image"],
  [".ico", "a raster image"],
  [".penpot", "a design file"],
]);

// The fields an entry carries. Every one of them is required, and the reason each
// is required is the sentence beside it rather than a convention.
export const requiredFields: ReadonlyMap<string, string> = new Map([
  ["Path", "the file the entry is about, so the entry can be checked against the tree"],
  ["What", "what the asset is for, so a reader can tell a sample from something the interface offers"],
  ["Licence", "the terms the asset arrives under"],
  ["Source", "where those terms were read, so a later reader can go and read them again"],
  ["Read", "the date they were read, because terms change and an undated reading says nothing about today"],
]);

// Words somebody writes into a licence field when they have not established the
// licence. An emptiness check alone walks straight past every one of them, and
// each is the shape of an intention to come back rather than an answer.
export const placeholderLicences: readonly string[] = [
  "tbd",
  "todo",
  "unknown",
  "unclear",
  "n/a",
  "na",
  "none",
  "?",
  "-",
  "pending",
  "to be confirmed",
];

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

// The asset-shaped paths, each carrying what the table called it. The kind comes
// out of the same lookup that decided the path is an asset at all, so there is no
// second lookup here that could disagree with the first and no fallback wording
// for a case that cannot arise.
export function assetsIn(tracked: readonly string[]): { path: string; kind: string }[] {
  const found: { path: string; kind: string }[] = [];
  for (const path of tracked) {
    const kind = assetKindByExtension.get(extensionOf(path));
    if (kind !== undefined) found.push({ path, kind });
  }
  return found;
}

function field(entry: Entry, name: string): string | undefined {
  return entry.fields.get(name);
}

function describe(entry: Entry, registerPath: string): string {
  const path = field(entry, "Path");
  return path === undefined
    ? `${registerPath}:${entry.line}`
    : `${registerPath}:${entry.line} (${path})`;
}

export const rules: readonly Rule[] = [
  {
    id: "asset-without-an-entry",
    prevents:
      "an asset arriving in the tree with nobody having established what may be done with it, which an operator discovers when they redistribute it",
    bound:
      "tracked files whose extension the asset table names. It reads no file contents, so an asset carried inside a source file as a data URI or an inline SVG is not reached, and it says nothing about assets a running system offers from somewhere other than this tree",
    find({ tracked, entries, registerPath }) {
      const claimed = new Set(entries.map((entry) => field(entry, "Path")).filter((path) => path !== undefined));
      return assetsIn(tracked)
        .filter(({ path }) => !claimed.has(path))
        .map(({ path, kind }) => ({
          where: path,
          detail: `is ${kind} and ${registerPath} carries no entry for it`,
        }));
    },
  },
  {
    id: "entry-without-a-file",
    prevents:
      "a register row surviving the file it was written about, so the list grows a tail of licences for assets nobody ships and stops being readable as an inventory",
    bound:
      "the exact path an entry names, compared against the tracked set. It does not follow a rename, because nothing here could tell one from a deletion and an addition",
    find({ tracked, entries, registerPath }) {
      const present = new Set(tracked);
      const refusals: Refusal[] = [];
      for (const entry of entries) {
        const path = field(entry, "Path");
        if (path === undefined || path.length === 0) {
          refusals.push({ where: `${registerPath}:${entry.line}`, detail: "names no path, so nothing can be checked against it" });
          continue;
        }
        if (!present.has(path)) {
          refusals.push({ where: `${registerPath}:${entry.line}`, detail: `names ${path}, which this repository does not track` });
        }
      }
      return refusals;
    },
  },
  {
    id: "entry-named-twice",
    prevents:
      "one file carrying two rows, where a re-reading was added beside the old one instead of replacing it and the two disagree about the terms",
    bound: "entries naming the identical path. Two entries for the same asset written under different paths are not reached",
    find({ entries, registerPath }) {
      const seen = new Map<string, number>();
      const refusals: Refusal[] = [];
      for (const entry of entries) {
        const path = field(entry, "Path");
        if (path === undefined || path.length === 0) continue;
        const first = seen.get(path);
        if (first === undefined) {
          seen.set(path, entry.line);
          continue;
        }
        refusals.push({
          where: `${registerPath}:${entry.line}`,
          detail: `names ${path}, which the entry at line ${first} already names`,
        });
      }
      return refusals;
    },
  },
  {
    id: "entry-without-a-licence",
    prevents:
      "an asset shipping under a field that was left to be filled in later, which reads as a licence to everybody who does not open the file",
    bound:
      "an absent or empty field and the placeholder words listed in this file. Whether a licence that is written down is the licence the asset actually carries is a judgement, and no reading of this tree makes it",
    find({ entries, registerPath }) {
      const refusals: Refusal[] = [];
      for (const entry of entries) {
        const licence = field(entry, "Licence");
        if (licence === undefined || licence.length === 0) {
          refusals.push({ where: describe(entry, registerPath), detail: "carries no licence" });
          continue;
        }
        if (placeholderLicences.includes(licence.toLowerCase())) {
          refusals.push({
            where: describe(entry, registerPath),
            detail: `carries "${licence}" as its licence, which is a note to come back rather than a licence`,
          });
        }
      }
      return refusals;
    },
  },
  {
    id: "entry-without-its-provenance",
    prevents:
      "a licence nobody can re-check, because the row says what the terms are and not where they were read or when, and terms change",
    bound:
      "the presence of the source field and a date in the form YYYY-MM-DD. It does not fetch the source and it does not judge whether the date is recent",
    find({ entries, registerPath }) {
      const refusals: Refusal[] = [];
      for (const entry of entries) {
        const source = field(entry, "Source");
        if (source === undefined || source.length === 0) {
          refusals.push({ where: describe(entry, registerPath), detail: "does not say where its licence was read" });
        }
        const read = field(entry, "Read");
        if (read === undefined || read.length === 0) {
          refusals.push({ where: describe(entry, registerPath), detail: "does not say when its licence was read" });
        } else if (!isoDate.test(read)) {
          refusals.push({
            where: describe(entry, registerPath),
            detail: `was read on "${read}", which is not a date in the form YYYY-MM-DD`,
          });
        }
      }
      return refusals;
    },
  },
];

export const ruleIds: readonly string[] = rules.map((rule) => rule.id);

// The register is Markdown, and the entries are the fenced blocks tagged `asset`.
// Prose and worked examples sit outside those blocks and are not parsed, so the
// document can show somebody what an entry looks like without the example
// becoming one.
//
// The parse is by line rather than by a parser, for the reason the workflow name
// parse gives: adding one would add a dependency for five fields. A block written
// in a shape this does not read declares fewer entries rather than more, which
// fails towards a refusal, because an asset whose entry went unread is then an
// asset with no entry.
export function parseRegister(text: string): Entry[] {
  const entries: Entry[] = [];
  const lines = text.split("\n");
  let inside = false;
  let current: Map<string, string> | undefined;
  let startedAt = 0;

  const close = (): void => {
    if (current !== undefined && current.size > 0) entries.push({ line: startedAt, fields: current });
    current = undefined;
  };

  for (const [index, line] of lines.entries()) {
    if (!inside) {
      if (/^```asset\s*$/.test(line)) inside = true;
      continue;
    }
    if (/^```\s*$/.test(line)) {
      close();
      inside = false;
      continue;
    }
    if (line.trim().length === 0) {
      close();
      continue;
    }
    // The name is captured and the value is taken as the rest of the line, rather
    // than captured too, so there is no second group that the type system makes
    // optional and no empty-string fallback standing in for a case the pattern
    // cannot produce.
    const match = line.match(/^([A-Za-z][A-Za-z-]*):/);
    if (match?.[1] === undefined) continue;
    if (current === undefined) {
      current = new Map<string, string>();
      startedAt = index + 1;
    }
    current.set(match[1], line.slice(match[0].length).trim());
  }
  close();
  return entries;
}

export function checkAssets(
  input: Input,
  enabled: ReadonlySet<string> = new Set(ruleIds),
): Report {
  const running = rules.filter((rule) => enabled.has(rule.id));
  const refusals: string[] = [];

  for (const rule of running) {
    for (const refusal of rule.find(input)) {
      refusals.push(`${rule.id}: ${refusal.where}: ${refusal.detail}`);
    }
  }

  const assets = assetsIn(input.tracked);
  const lines = [
    `examined ${input.tracked.length} tracked path(s) by extension: ${assets.length} asset-shaped path(s), against ${input.entries.length} entr(ies) in ${input.registerPath}, under ${running.length} of ${rules.length} rule(s).`,
    `the extensions this check is willing to call an asset: ${[...assetKindByExtension.keys()].join(" ")}. A tracked file with any other extension was NOT judged.`,
    "this check reaches what this repository tracks. Assets a running system offers from anywhere else, including everything the upstream distribution carries, are outside it and no run here is evidence about them.",
    ...running.map((rule) => `${rule.id} prevents ${rule.prevents}. It reaches ${rule.bound}.`),
  ];

  const off = ruleIds.filter((id) => !enabled.has(id));
  if (off.length > 0) {
    lines.push(`NOT run on this run, so this run says nothing about them: ${off.join(", ")}.`);
  }

  return { lines, refusals, repair };
}
