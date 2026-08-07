// Decides which tracked paths are written in a language the means record does not
// name. Reads no file and runs no git command: the runner supplies the path list,
// so the suite can put a Python file in front of this without one existing.
//
// What it examines and what it does not: file extensions, and nothing inside a
// file. A shell block inside a workflow's `run:` key is shell in this tree and
// this check does not reach it. That is stated here rather than discovered later,
// because a check that appears to cover the whole tree and covers less is worse
// than one whose bound is written down.

import type { Report } from "./report.ts";

// Extensions this check is willing to classify. A path whose extension is absent
// from this table is reported as unclassified and counted, never passed silently.
export const languageByExtension = new Map<string, string>([
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

export const repair =
  "remove the file, or argue the language in a decision record, amend docs/decisions/0001-means.md and add it to the languages list in tools/toolchains.json.";

function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

export function checkLanguages(paths: readonly string[], allowed: ReadonlySet<string>): Report {
  const lines: string[] = [];
  const refusals: string[] = [];
  const seen = new Map<string, number>();
  let unclassified = 0;

  for (const path of paths) {
    const language = languageByExtension.get(extensionOf(path));
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
  lines.push(
    `examined ${paths.length} tracked path(s) by extension: ${present.length > 0 ? present.join(", ") : "no classified source file"}; ${unclassified} path(s) carry an extension this check does not classify and were NOT judged.`,
  );
  lines.push(`languages named by tools/toolchains.json: ${[...allowed].sort().join(", ")}`);

  return { lines, refusals, repair };
}
