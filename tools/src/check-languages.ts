// Refuses a tracked file written in a language the means record does not name.
//
// The failure it prevents: a helper script in a fifth language arrives with one
// change, nothing linted it, nothing tested it, and the means record that says
// which languages this tree carries stops being true without anyone editing it.
//
// What it examines and what it does not: file extensions of tracked paths, and
// nothing inside a file. A shell block inside a workflow's `run:` key is shell in
// this tree and this check does not reach it. That is stated here rather than
// discovered later, because a check that appears to cover the whole tree and
// covers less is worse than one whose bound is written down.

import { execFileSync } from "node:child_process";
import { extname } from "node:path";
import { loadToolchains, repoRoot } from "./pins.ts";

// Extensions this check is willing to classify. A path whose extension is absent
// from this table is reported as unclassified and counted, never passed silently.
const languageByExtension = new Map<string, string>([
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".mts", "typescript"],
  [".cts", "typescript"],
  [".js", "javascript"],
  [".mjs", "javascript"],
  [".cjs", "javascript"],
  [".jsx", "javascript"],
  [".clj", "clojure"],
  [".cljc", "clojure"],
  [".edn", "clojure"],
  [".cljs", "clojurescript"],
  [".rs", "rust"],
  [".py", "python"],
  [".rb", "ruby"],
  [".sh", "shell"],
  [".bash", "shell"],
  [".zsh", "shell"],
  [".ps1", "powershell"],
  [".go", "go"],
  [".java", "java"],
  [".kt", "kotlin"],
  [".cs", "csharp"],
  [".c", "c"],
  [".h", "c"],
  [".cc", "cpp"],
  [".cpp", "cpp"],
  [".hpp", "cpp"],
  [".php", "php"],
  [".pl", "perl"],
  [".lua", "lua"],
  [".swift", "swift"],
  [".scala", "scala"],
  [".ex", "elixir"],
  [".exs", "elixir"],
  [".erl", "erlang"],
  [".hs", "haskell"],
  [".r", "r"],
  [".sql", "sql"],
  [".vim", "vimscript"],
]);

const allowed = new Set(loadToolchains().languages);

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
  .split("\0")
  .filter((path) => path.length > 0);

const refusals: string[] = [];
const seen = new Map<string, number>();
let unclassified = 0;

for (const path of tracked) {
  const language = languageByExtension.get(extname(path).toLowerCase());
  if (language === undefined) {
    unclassified += 1;
    continue;
  }
  seen.set(language, (seen.get(language) ?? 0) + 1);
  if (!allowed.has(language)) {
    refusals.push(`${path} is ${language}, which tools/toolchains.json does not name`);
  }
}

const present = [...seen.entries()].map(([language, count]) => `${language} (${count})`).sort();
console.log(
  `examined ${tracked.length} tracked path(s) by extension: ${present.length > 0 ? present.join(", ") : "no classified source file"}; ${unclassified} path(s) carry an extension this check does not classify and were NOT judged.`,
);
console.log(`languages named by tools/toolchains.json: ${[...allowed].sort().join(", ")}`);

if (refusals.length > 0) {
  for (const refusal of refusals) console.error(`REFUSED  ${refusal}`);
  console.error(
    "Repair: remove the file, or argue the language in a decision record, amend docs/decisions/0001-means.md and add it to the languages list in tools/toolchains.json.",
  );
  process.exit(1);
}
