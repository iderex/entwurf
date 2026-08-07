# Contributing

## The one command

From a fresh clone, on a machine that has the pinned Node runtime and nothing
else installed:

    corepack pnpm install --frozen-lockfile

That reaches a working environment. It is one command because a setup described
in prose has already failed: the reader follows four steps, one of them is stale,
and the failure surfaces somewhere unrelated an hour later.

Two things it does on its own. It downloads the exact pnpm named in
`package.json` under `packageManager` and refuses one whose hash does not match,
so the package manager is pinned rather than assumed. And it refuses to run at
all under a Node other than the exact version `package.json` names under
`engines.node`, because `pnpm-workspace.yaml` sets `engineStrict`. The refusal
looks like this, and it names the version it wanted:

    [ERR_PNPM_UNSUPPORTED_ENGINE] Unsupported environment (bad pnpm and/or Node.js version)
    Expected version: 24.18.1
    Got: v24.18.0

`--frozen-lockfile` is part of the command rather than a habit. Without it an
install may rewrite `pnpm-lock.yaml` in passing, and the versions a measurement
was produced under stop being the versions the tree names.

This section does not yet carry the command that runs the test suite, because no
suite exists yet. Issue #5 is where it lands, and issue #9 is where this guide is
finished.

## The checks this tree runs today

Each one is a script in `package.json`, and running all of them is
`corepack pnpm run check`.

    corepack pnpm run check:pins
    corepack pnpm run check:languages
    corepack pnpm run check:types
    corepack pnpm run check:locks

`check:pins` refuses a toolchain version in `package.json` that has drifted from
the table in `tools/toolchains.json`. It prints which pins it compared and which
it did not: seven of the twelve are versions no file in this tree carries, so
nothing here can compare them and the run says so rather than counting them as
passed.

`check:languages` refuses a tracked file written in a language
`tools/toolchains.json` does not name. It reads file extensions and never file
contents, so shell inside a workflow's `run:` key is not reached by it. The run
prints how many paths it could not classify.

`check:types` runs the TypeScript compiler over `tools/` with no emit.

`check:locks` refuses a `pnpm-lock.yaml` that a resolve would rewrite. It hashes
the file, resolves once, hashes again, and on a difference puts the original
bytes back and prints the command that repairs it. It never repairs the file
itself, because a check that quietly fixed the drift would hide the thing it
exists to report. It needs the network, and a resolve that cannot be run is
refused as a failure to judge rather than passed as a clean tree.

## What no machine refuses

These are rules, and nothing in this tree enforces any of them. Each is stated
here in the sentence that states the rule, rather than in a footnote, because a
rule a reader believes is enforced is worse than no rule: they stop looking for
the failure it would have caught.

Nothing refuses a claim made without the command that produced it, in an issue,
in a pull request body, in a commit message or in a document, and that is the
rule this project leans on hardest.

Nothing refuses a decision record whose numbering or heading departs from the
convention `docs/decisions/0001-means.md` sets out, and nothing refuses two
records that claim the same number.

Nothing refuses a change that lands without an issue, and nothing reads what an
issue said "done" would mean.

Nothing refuses a pin in `tools/toolchains.json` whose `command` field no longer
produces the `output` field beside it. `check:pins` compares the table against
this tree, never against upstream, so a version that moved upstream is caught by
a person re-running the command and not by a run.

## Checks that run on GitHub

The workflows in `.github/workflows/` are what the server runs. The scripts above
are not among them yet: issue #8 is where a check gets a stable name and is put in
front of the default branch, and until that lands, running them is something a
person does before pushing.

## The upstream revision

One command prints the revision this tree builds and measures against:

    corepack pnpm run upstream:revision

`upstream/README.md` says which branch it comes from and why, and
`docs/decisions/0002-upstream-relationship.md` is where the relationship is
argued. Nothing under `upstream/` is a copy of upstream source.
