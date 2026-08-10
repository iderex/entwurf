# 0001. The means: languages, runtimes and toolchains

Status: accepted.
Issue: #1.

Every other issue in this plan assumes a language somewhere. This record writes
the assumption down, layer by layer, so that a reader can disagree with it on the
merits. It also fixes how every later decision record in this repository is named
and numbered, because that convention has been followed since record 0002 without
anything saying what it was.

Three layers are not this repository's to choose, and one is. The distinction is
what the record is organised around, because the reasoning is completely different
on the two sides of it: on the forced side the question is only whether the force
is real, and on the free side the whole question is open.

All commands below were run on 2026-08-07 UTC against the upstream default
branch, which was at

    gh api repos/penpot/penpot/commits/main --jq '.sha + " " + .commit.committer.date'
    d835baefecb13a4abf273e02ccfcefc169306756 2026-08-03T07:15:03Z

A later reader running them will get a different revision and may get different
versions. Where a version below moves, this record is amended rather than
silently outgrown.

**Amended by issue #3. The two lines above name a revision the versions below do
not come from, and the revision the versions do come from is a different branch.**
The original statement is left standing rather than corrected in place, because
what it got wrong is the interesting part. `main` is not the upstream default
branch:

    gh api repos/penpot/penpot --jq .default_branch
    develop

The version readings further down were made with `gh api .../contents/...` and no
`ref` parameter, which resolves to the default branch, so they came from
`develop` and not from the revision quoted above. The two trees disagree about
one of the versions this record then pins:

    gh api "repos/penpot/penpot/contents/.nvmrc?ref=d835baefecb13a4abf273e02ccfcefc169306756" --jq .content | base64 -d
    v24.18.0
    gh api "repos/penpot/penpot/contents/.nvmrc?ref=b5bec4f983b5540a3ed7969121badf08a14f384e" --jq .content | base64 -d
    v24.18.1

`b5bec4f983b5540a3ed7969121badf08a14f384e` was the head of `develop` when issue
#3 landed, and every version quoted below reproduces against it. That is the
revision `upstream/pin.json` names, and it is the branch `upstream/README.md`
argues for. Nothing else in this record moves: the versions it names were read
correctly off the tree they were read off, and only the sentence saying which
tree that was is wrong.

## The shape of the upstream tree

    gh api repos/penpot/penpot/languages
    {"Clojure":13115005,"JavaScript":1372980,"Rust":1126043,"TypeScript":1076632,
     "SCSS":804220,"HTML":290703,"Shell":128344,"CSS":103433,"Python":66406,
     "MDX":49923,"Java":28483,"Go Template":28121,"Dockerfile":24388,
     "PLpgSQL":11938,"Mustache":5020,"XSLT":1575,"Lua":1261,"Vim Script":309}

That is bytes per language across the whole upstream repository, and it is quoted
to establish which languages the three forced layers are actually written in
rather than to rank them. The tail of that list is not this project's concern: it
is packaging, tooling and generated documentation, and nothing in this plan
proposes to touch it.

## Layer 1, the editor and the server

**Clojure on the server, ClojureScript in the browser.** Forced, by the upstream
tree. The server dependency set pins the language itself:

    gh api repos/penpot/penpot/contents/backend/deps.edn --jq .content | base64 -d | grep -n 'org.clojure/clojure'
    6:  org.clojure/clojure {:mvn/version "1.12.5"}

The browser build is driven by `shadow-cljs`, whose configuration sits beside the
frontend dependency set:

    gh api repos/penpot/penpot/contents/frontend --jq '.[].name' | grep -x 'shadow-cljs.edn\|deps.edn'
    deps.edn
    shadow-cljs.edn

The minimum version of the language is therefore not this repository's to set. It
is whatever the pinned upstream revision resolves, and issue #3 is where that pin
becomes a fact of this tree rather than a sentence here.

The force is real. A change to the editor or the server written in anything else
is a second implementation of a part that already exists, which is the cost this
project has the least reason to take on: record 0002 sends work upstream first,
and a change upstream will not accept in its own language is a change that cannot
be offered at all.

## Layer 2, the render engine

**Rust, compiled to WebAssembly through Emscripten.** Forced, by the upstream
tree. The crate names its edition and the Skia binding it draws through:

    gh api repos/penpot/penpot/contents/render-wasm/Cargo.toml --jq .content | base64 -d | head -30

which prints `edition = "2021"` and `skia-safe = "0.93.1"`. The build target and
the matching prebuilt Skia are set in the engine's own build environment:

    gh api repos/penpot/penpot/contents/render-wasm/_build_env --jq .content | base64 -d | grep -n '^export CARGO_BUILD_TARGET=\|^export SKIA_BINARIES_URL='
    21:export CARGO_BUILD_TARGET=${CARGO_BUILD_TARGET:-"wasm32-unknown-emscripten"};
    23:export SKIA_BINARIES_URL=${SKIA_BINARIES_URL:-"https://github.com/penpot/skia-binaries/releases/download/0.93.1/...

The second line is elided after the version, and the part quoted is the part the
argument uses: the prebuilt Skia the engine links against carries the same
`0.93.1` as the crate dependency above.

**The Rust toolchain version is not pinned upstream, and this is the one place
where the forced layer leaves something for this repository to decide.** The
absence is a fetch rather than a reading of silence:

    gh api repos/penpot/penpot/contents/render-wasm/rust-toolchain.toml
    {"message":"Not Found", ... "status":"404"}
    gh api repos/penpot/penpot/contents/rust-toolchain.toml
    {"message":"Not Found", ... "status":"404"}

Both were 404 on the revision above. So "the engine is Rust" is forced and "which
Rust" is not, and the engine will compile against whatever toolchain the machine
happens to have.

**Amended by issue #3. The two 404s are real and the conclusion drawn from them
is too wide.** A `rust-toolchain.toml` is absent, and a pinned Rust version is
not: upstream's own development image names one, along with the Emscripten and
JDK versions this record leaves to issue #3 further down.

    gh api "repos/penpot/penpot/contents/docker/devenv/Dockerfile?ref=b5bec4f983b5540a3ed7969121badf08a14f384e" --jq .content | base64 -d | grep -n 'RUSTUP_VERSION=\|RUST_VERSION=\|EMSCRIPTEN_VERSION='
    205:    RUSTUP_VERSION=1.28.2 \
    206:    RUST_VERSION=1.91.0 \
    207:    EMSCRIPTEN_VERSION=4.0.6

So the sentence above holds for a build run outside that image and not for one
run inside it, which is where upstream builds the engine. What issue #3 pins is
therefore not a version of this repository's own choosing but the one upstream
already builds with, recorded in `tools/toolchains.json` with the command above
beside it. The reproducibility hole named next is narrower than this record said:
it is the gap between a machine that uses the development image and one that does
not, rather than an absence of any pin at all.

The first reading was made from the nearest file to hand, `rust-toolchain.toml`,
which is the conventional place and was empty of an answer. The answer was one
directory further out, in the file that builds the toolchain rather than the one
that declares it.

That is a reproducibility hole in this project's measurements
rather than in upstream's builds, because a number produced by one compiler and
compared against a number produced by another is not a comparison. Issue #3 is
where this repository pins a Rust toolchain of its own for the builds it measures,
and issue #16 is where the pinned version becomes a field on every published
number. Nothing here proposes to send that pin upstream: it is this project's
measurement requirement, which is question 2 of record 0002's test and puts it in
the overlay.

## Layer 3, the plugin surface

**TypeScript.** Forced, by the upstream tree. The plugin workspace pins the
compiler exactly rather than by range:

    gh api repos/penpot/penpot/contents/plugins/package.json --jq .content | base64 -d | grep -n '"typescript"\|"vitest"\|packageManager'
    6:  "packageManager": "pnpm@11.20.0+sha512.9a6f330a95b66446ea088faf1521405a8a01f07fde7124cc9958dfed52d4bb436737e65b08f85f37b46fcba375092558ac51262b816844b22f63406ed166bfee",
    73:    "typescript": "6.0.3",
    79:    "vitest": "4.1.10",

So a plugin contract, a conformance suite and a reference plugin are written in
TypeScript, tested under Vitest and installed with pnpm, because that is what an
author building against this surface already has. Choosing otherwise would mean
publishing a contract in one language and testing it in another, and the thing
the conformance suite in issue #41 exists to decide is exactly the contract an
author compiles against.

The Node runtime under all of this is pinned upstream at the repository root:

    gh api repos/penpot/penpot/contents/.nvmrc --jq .content | base64 -d
    v24.18.1

## Layer 4, the layer this repository invents

This is the free layer: the measurement harness, the corpus generator, the
comparison and drift tooling, and whatever else decides whether the performance
goal was reached. Nothing outside this repository forces it, so the choice is
argued rather than reported.

**The decision is TypeScript on Node, with Playwright as the browser driver, pnpm
as the package manager and Vitest as the unit test runner.**

Minimum versions are the ones this repository will pin in issue #3, and they are
floors rather than the exact resolved versions: Node 24.18.1, because that is
what upstream's own `.nvmrc` names above and a harness driving an upstream build
has no reason to sit on a different runtime; pnpm 11.20.0, for the same reason
read out of the `packageManager` field above; TypeScript 6.0.3, matching the
plugin workspace so that a type shared between the harness and a plugin fixture
does not need two compilers to agree.

The reason for the browser driver is that the measurement has to happen in a real
browser under the real render engine, and the mature driver for that is
Playwright. Upstream already carries a Playwright suite and pins the driver
exactly:

    gh api repos/penpot/penpot/contents/frontend --jq '.[].name' | grep playwright
    playwright.config.js
    playwright
    gh api repos/penpot/penpot/contents/package.json --jq .content | base64 -d | grep -n 'playwright'
    14:    "@playwright/mcp": "^0.0.78",
    15:    "@playwright/test": "^1.62.0",
    22:    "playwright": "1.62.1"

That matters more than the general maturity argument. It means the harness can
run against an upstream build using the browser driving upstream already sets up,
rather than standing up a parallel apparatus nobody will maintain.

### The four questions

**Can the means carry a property a machine can refuse, a proof that runs, and a
claim that cites the command behind it?** Yes, and the third of those is the one
worth checking rather than the first two. A refusable property is a process that
exits non-zero, which any of these languages does. A proof that runs is a test in
a suite, which Vitest supplies for the harness's own logic and Playwright for the
parts that need a browser. The third is the constraint that actually bites: a
published number has to carry the machine, the browser version, the upstream
revision and the toolchain that produced it, per record 0004's protocol and issue
#16. A harness that prints a number without those fields fails this project's own
rule, so the harness writes result files with the fields required rather than
printing to a terminal, and issue #16 is where a missing field becomes a refusal.
This is a constraint on how the harness is written, not on which language it is
written in, and no candidate for this layer failed on it.

**Is anything outside this repository forcing it, and is that force real and held
to its smallest surface?** For layers 1 to 3, yes, and the force is the upstream
tree, evidenced above rather than assumed. For layer 4, no: nothing outside
forces it. What pulls it toward TypeScript is not force but adjacency, which is a
weaker thing and is named as weaker. The smallest surface the force is held to is
the boundary in record 0002: upstream languages are used for changes that go
upstream or into the overlay, and they do not spread into this repository's own
tooling because the engine happens to be written in Rust.

**Does the means add a language, a runtime or a dependency the tree does not
already carry, and is that cost named?** This repository's tree today carries no
language at all. The measurement is one command:

    git ls-files | grep -v '^docs/\|^README\.md$\|^NOTICE\.md$\|^\.github/'

which prints nothing at the revision this record lands on, so every language here
is an addition and the question is which additions are paid for once rather than
repeatedly. Choosing TypeScript on Node for layer 4 adds one runtime, and it is a
runtime the plugin surface and the upstream frontend build already require, so an
environment that can build what this project changes can already run the harness.
Choosing anything else for layer 4 would add a second runtime beside that one.
The cost that is paid regardless is the JVM and the Clojure toolchain for layer 1
and the Rust and Emscripten toolchain for layer 2, and issue #3 is where both
become explicit rather than assumed present.

**Is the result testable by the suite that will exist rather than by a parallel
apparatus?** Yes, and this is the question the rejected alternative below fails.
The harness's own logic, the corpus generator and the comparison tooling are
covered by the headless unit suite in issue #5, which runs with no display and no
GPU. What needs a browser goes to the hardware-bound harness in issue #7 and is
named as such rather than smuggled into the unit suite. Both suites run
Playwright and Vitest, which are the two things the upstream tree and the plugin
workspace already carry, so neither is an apparatus this project invented.

### The rejected alternative, and what would reverse the rejection

**A Rust harness speaking the browser devtools protocol directly.** It buys one
static binary, no Node runtime in the measurement path, and a language the tree
already carries for the engine, which is a real argument rather than a straw one.
It costs a reimplementation of browser launching, tracing, input synthesis and
image comparison that Playwright already does, and it can reuse no upstream
fixture, so the parallel-apparatus question above is answered wrongly by it.

The condition that reverses this: the day the measurement moves out of the
browser and into the engine crate. A harness measuring the engine directly is
measuring the same code with nothing in between, the browser driving is no longer
part of the job, and at that point the Rust harness is measuring what it is made
of. If issue #23's profile attributes the page-switch cost predominantly inside
the engine rather than in the layers feeding it, that is the signal to reopen
this, and reopening it means amending this record with the profile as the
argument.

## What is deliberately not chosen here

**Which JVM, and which Emscripten.** Both are required to build layers 1 and 2,
and neither is named in this record because naming one here would drift against
the pin. Issue #3 pins them in a file in the tree, and a pinned version in a file
is checkable while a version in a document is not.

**A language for anything in the overlay.** The overlay changes upstream code, so
its language is decided by the file being changed. There is no separate choice to
make and no record is owed for one.

**A means for any artefact that does not yet exist.** This record covers the four
layers. A later artefact that does not sit in one of them, for example a registry
service or a container entry point, asks the four questions again in its own
issue rather than inheriting an answer from here. Carrying an answer over from
habit is the failure this section exists against.

## How every later decision record is named and numbered

The convention was in use from record 0002 and stated nowhere. It is stated here.

A decision record is a file at `docs/decisions/NNNN-slug.md`, where `NNNN` is four
digits with leading zeros and `slug` is lower case words joined by hyphens. Its
first line is a level-one heading reading `NNNN. ` followed by a sentence naming
the decision, and the two lines after it are `Status:` and `Issue:`, in that
order, each ending in a full stop.

A number is allocated by the issue that produces the record, and the issue body
names the exact path before the record exists, which is what makes a collision
between two records visible on the tracker rather than in a merge. The allocation
is derived rather than listed here, because a list in this file would drift
against the tracker that holds it:

    gh issue list --state all --limit 200 --json number,body \
      --jq '.[] | select(.body | test("docs/decisions/[0-9]{4}")) |
            "\(.number) \([.body | scan("docs/decisions/[0-9]{4}-[a-z0-9-]+[.]md")] | unique | join(","))"' | sort -n

Numbers are never reused and a superseded record is never deleted. A record whose
decision no longer holds keeps its number and its file, and its `Status:` line
says what replaced it. The reason is that every issue, commit message and record
in this repository cites records by number, so a reused or removed number turns a
correct citation into a wrong one at a distance.

Amending a record in place is the normal case and is what several records already
promise to do when a measurement contradicts them. An amendment leaves the
original statement visible and says what moved it. A new record is written instead
of an amendment when the decision itself is replaced rather than corrected.

## What a machine refuses here, and what it does not

Two of the rules above are refused by something that runs. The rest are
positions, and the difference is stated here so that a reader does not stop
looking for the failure an unenforced rule would have caught.

The naming and numbering convention in the section above is refused by
`check:docs`: the file name, the first heading, the two lines under it, and a
second record claiming a number another record already has.

The rule under layer 4, that the logic deciding a verdict is covered by the suite
running with no display and no GPU while what needs a browser goes to the
hardware-bound harness, is refused by `tests/unit/architecture-rules.test.ts`. It
reads the imports of every module under `tools/src/checks/` and of every test in
the unit suite, and refuses one that arrives at a browser driver through however
many modules. The refusal the Vitest config installs holds the first step of the
same rule and stops there, because it reads the importer: a test naming a driver
is refused and a test naming a module that names one is not. Two bounds come with
it. It reads import text rather than parsing it, so it can only count an edge
that is not there and never miss one that is written down; and a module pulled in
at run time through `node:module` passes both, which is the blind spot the
Vitest refusal already carries.

Nothing refuses the choice of means itself. Whether a later artefact asked the
four questions again rather than inheriting the answer from here is a judgement
about a pull request body, and no reading of the tree makes it. The versions this
record names are refused as pins by `check:pins`, against this tree and never
against upstream, so a version that moved upstream is caught by somebody
re-running the command beside it rather than by a run.
