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

Then the suite:

    corepack pnpm test

It runs with no display, no GPU and no browser driver, and the hosted runner in
`.github/workflows/unit-suite.yml` is a machine with none of those, so a green
run there is the evidence rather than a claim made here.

Neither command is described here from memory. `.github/workflows/clean-machine.yml`
runs both of them, in this order, inside the official Node image at the pinned
version, which carries Node, corepack and git and not this project's package
manager, its dependencies or its browsers. A fresh clone in that container is the
closest thing to the machine the paragraph above describes, and if the two
commands stop working there the check goes red.

## The headless rule

Everything in the unit suite runs with no display, no GPU and no elevation, and a
test that needs any of those goes in the other suite. The rule is not about
tidiness: a test that quietly needs hardware passes on the machine it was written
on and reports green everywhere else without having run, so the suite would say
less the more of them it collected. A test that needs elevation is not worked
around here at all. It is skipped, and the skip is written into the issue rather
than into a comment.

## The coverage floor

The floor is lines 95%, functions 95%, branches 90%, statements 95%, and the run
fails below it. The command that produces the number is the suite command above,
which prints:

    Statements   : 99.47% ( 380/382 )
    Branches     : 98.52% ( 200/203 )
    Functions    : 100% ( 60/60 )
    Lines        : 100% ( 335/335 )

The floor is below the measurement on purpose. A floor set at what the suite
happens to reach today turns every unrelated change into a coverage argument, and
one far below it stops catching anything.

What the number is over is printed by the run before the first test, and it is
not the whole tree. The pinned upstream checkout is excluded, because measuring
it would report somebody else's tree as this project's coverage. The runners
under `tools/src/` are excluded too: they read files, spawn a resolve and set an
exit status, and the decisions were moved out of them into `tools/src/checks/` so
that the suite could reach them. Nothing proves those runners, and the exclusion
is printed on every run rather than left to be discovered.

The per-file numbers are written to `coverage/coverage-summary.json` by the same
run. The per-file table the `text` reporter would print is not used, because it
renders here with a header and no rows, and a table showing no files reads as a
run that measured none.

## Which suite a test belongs in

A test that needs a browser, a display or a GPU goes in `tests/hardware/` and
runs under `test:needs-display-and-gpu`; everything else goes in `tests/unit/`
and runs under `test`.

The boundary is held by the suite rather than by review: a unit test that imports
a browser driver is refused when the file is loaded, before any test body runs.

    Error: tests\unit\reaches-a-browser.test.ts imports @playwright/test, which drives a browser.

That refusal reaches every import the bundler resolves, static or dynamic. It
does not reach a module pulled in at runtime through `node:module`, which never
passes through it.

## The hardware-bound suite

    corepack pnpm run test:needs-display-and-gpu

The name says what it needs, and the name is the point. A suite called
integration tests that quietly skips when no GPU is present reports green on a
machine that measured nothing, and a green run that measured nothing is worse
than a red one.

It reads the machine before it runs anything, and refuses one that cannot do the
work, naming what was missing:

    machine GPU: none
    MISSING  a GPU: the browser is rendering through ANGLE (Google, ... SwiftShader driver-5.0.0)
    MISSING  webgl on the GPU: the browser reports it as unavailable_software
    REFUSED  this machine cannot run the hardware-bound suite. Nothing was skipped and nothing was measured; this run is red rather than green so it cannot be quoted as a pass.

Every run prints the machine it ran on, and says whether it examined the whole
set or part of it:

    examined the WHOLE hardware-bound set: 2 case(s), none skipped, no filter.
    examined PART of the hardware-bound set: 1 of 1 case(s). This run may NOT be read as a full one.
      partial because the command was narrowed by: --grep WebGL2

Any argument you give the command narrows what runs, so any argument makes the
run partial and it says so. The same lines, the machine and every case are
written together to `tests/hardware/results/run.json`, so a number this suite
produces leaves already carrying the machine it was produced on.

Two things it does not establish. On Linux the display is read from `DISPLAY` and
`WAYLAND_DISPLAY`; on Windows and macOS no environment variable answers the
question and the run prints that it makes no claim about a display rather than
counting one as present. And it does not run on GitHub: hosted runners have no
GPU, so this suite would be refused there, correctly, on every run.

## The checks this tree runs today

Each one is a script in `package.json`, and running all of them is
`corepack pnpm run check`.

    corepack pnpm run check:pins
    corepack pnpm run check:languages
    corepack pnpm run check:guide
    corepack pnpm run check:invariants
    corepack pnpm run check:assets
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

`check:guide` refuses a sentence in this file that names a path which is neither
tracked nor written by one of these runs, or a script `package.json` does not
define. It reads backticked spans and `corepack pnpm run` commands, and it judges
no other sentence here: whether anything else written in this guide is true is
not something a run can decide.

`check:invariants` refuses a tracked text file that violates one of the string
facts this tree holds: a credential shape, a path under somebody's home
directory, a backticked check name no workflow declares and `package.json` does
not define, and a duration quoted with no 95th percentile beside it in the same
paragraph. The invariants are a table in `tools/src/checks/invariants.ts`, and
the run prints every one of them with the failure it prevents and the bound on
what it reaches, so a green run is a statement about those four shapes rather
than about the tree. Each has a fixture in `tests/unit/invariants.test.ts` that
is the near miss rather than an obvious violation, and each fixture is also run
with its own invariant switched off, where it has to pass.

`check:assets` refuses a font, an icon or a sample design file that this tree
carries with no entry in `docs/legal/assets.md`, and it refuses an entry there
that names a file the tree does not carry, so the register and the tree cannot
drift apart in either direction. It also refuses an entry with no licence, one
whose licence field carries a placeholder, one that does not say where the licence
was read or on what date, and two entries naming one path. Its bounds are printed
by every run and there are three: it reads extensions and never file contents, so
an asset embedded in a source file is not reached; it judges what this repository
tracks and says nothing about what a running system offers from anywhere else; and
it cannot judge whether a licence that is written down is the one the asset
carries. The register is empty today, and the rule it exists to hold is that an
asset whose licence cannot be established is removed rather than shipped.

`check:locks` refuses a `pnpm-lock.yaml` that a resolve would rewrite. It hashes
the file, resolves once, hashes again, and on a difference puts the original
bytes back and prints the command that repairs it. It never repairs the file
itself, because a check that quietly fixed the drift would hide the thing it
exists to report. It needs the network, and a resolve that cannot be run is
refused as a failure to judge rather than passed as a clean tree.

## What no machine refuses

Everything above this line is refused by something that runs, and the paragraph
under each check says what it does not reach. Everything below it is a rule and
nothing in this tree enforces any of them. Each is stated here in the sentence
that states the rule, rather than in a footnote, because a rule a reader believes
is enforced is worse than no rule: they stop looking for the failure it would have
caught.

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

Nothing refuses a comment or an error message inside a workflow file that names a
path this tree does not carry or an issue this tracker has not issued.
`check:guide` reads this file and no other, and `check:invariants` judges a check
name in tracked Markdown, so neither reaches a comment or a `run:` string in
`.github/workflows/`. Three such pointers and one such message were repaired at
once under issue #100 rather than one at a time, which is what an unrefused class
looks like: they arrive together and they are found by somebody reading for a
different reason.

## Checks that run on GitHub

The workflows in `.github/workflows/` are what the server runs. The unit suite is
among them, under the name `unit-suite`, and the job id and the check name are
the same string so that a rule naming either one keeps matching.
`check:invariants` is among them too, under the name `invariants`, on the same
convention and for the same reason.

The other `check:` scripts are not among them. Issue #8 is where a check gets a
stable name and is put in front of the default branch, and until that lands,
running them is something a person does before pushing.

No ruleset requires any check today, so a red run blocks nothing on its own. The
ruleset on the default branch refuses a deletion, a non-fast-forward and a direct
push, and it carries no `required_status_checks` rule:

    gh api repos/iderex/entwurf/rulesets --jq '.[] | select(.name == "gate") | .id'
    20487962
    gh api repos/iderex/entwurf/rulesets/20487962 --jq '[.rules[].type]'
    ["deletion","non_fast_forward","pull_request"]

## The terms you contribute under

Read `docs/legal/contribution-terms.md` before you write anything. It is short,
and one part of it is not guessable from anywhere else: a change made here may be
offered to the upstream project under that project's licence, which is not this
one, and contributing here includes agreeing to that. A contributor has to know
that before the code exists rather than once somebody has decided where to send
it.

The rest of that page is the licence your work is made available under, the
Developer Certificate of Origin your sign-off certifies, and what the route that
checks the sign-off does and does not reach. The certificate itself is in `DCO`
at the root. Sign every commit with `git commit -s`.

## Where a change lands

Work goes to the upstream project first, and what stays here is what upstream
will not take or has no reason to take. So the first question about a change is
not how to write it but where it belongs, and answering it wrongly costs either a
patch upstream will refuse or a permanent maintenance burden here that somebody
else would have carried. `docs/decisions/0002-upstream-relationship.md` is where
that position is argued and where the test for which side a change falls on is
written; it is not restated here, because two copies of a test drift and the copy
a contributor reads first would be this one.

## The upstream revision

One command prints the revision this tree builds and measures against:

    corepack pnpm run upstream:revision

`upstream/README.md` says which branch it comes from and why, and
`docs/decisions/0002-upstream-relationship.md` is where the relationship is
argued. Nothing under `upstream/` is a copy of upstream source.
