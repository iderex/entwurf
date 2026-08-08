# Architecture

What the parts are, how they fit, and how a change moves through them. This is a
description of what is being built. It is not a second place for decisions to
live: where it touches something a record in `docs/decisions/` settles, it states
the decision in one sentence and links the record, because a restatement of the
argument drifts against the argument.

Read it before the records. The records answer specific questions and they read as
a pile of positions without this.

Commands in this file were run on 2026-08-07 UTC. Where a command's output is
quoted, it is quoted from that run.

## The parts

### The upstream tool

An existing open design tool, developed in its own repository by its own project,
under MPL-2.0:

    gh api repos/penpot/penpot --jq .license.spdx_id
    MPL-2.0

It supplies the editor, the server, the file format, the render engine and the
plugin surface. This project does not own it and does not fork it. Record
[0002](decisions/0002-upstream-relationship.md) decides that work is offered
upstream first and that what upstream will not take lives here as a thin overlay
on a pinned revision.

Its languages are read rather than assumed:

    gh api repos/penpot/penpot/languages

The server is Clojure, the browser editor is ClojureScript, the render engine is
Rust compiled to WebAssembly, and the plugin surface is TypeScript. Record
[0001](decisions/0001-means.md) decides that a change to any of those is written
in the language that part already uses, and carries the fetch behind each of
those four claims.

### The overlay

The changes this project keeps rather than sends upstream, held as a set that a
rebase can move onto a newer upstream revision. It lives under `overlay/`, and its
size is a number rather than a judgement:

    git ls-files overlay/ | wc -l
    0

Zero at the revision this file lands on, because the overlay does not exist yet.
Record 0002 decides the limit it may grow to, what happens when a change would
cross it, and the two conditions that together would make a hard fork the right
answer.

Which of the two an individual change belongs to is not a matter of taste. Record
0002 carries a three-question test that is answerable without asking anyone, and
record [0006](decisions/0006-rendering-path.md) works that test through the
classes of change the rendering work produces.

### The render engine

The upstream tool's own canvas renderer: a Rust crate drawing through Skia,
compiled to WebAssembly through Emscripten, rendering the canvas in cached tiles.
Its own documentation is the source for how it works:

    gh api repos/penpot/penpot/contents/render-wasm/README.md --jq .content | base64 -d
    gh api repos/penpot/penpot/contents/render-wasm/docs/tile_rendering.md --jq .content | base64 -d

Record 0006 decides that the rendering work happens inside this engine and in the
layers feeding it, and that no different rendering technology is adopted. Record
[0003](decisions/0003-what-is-a-large-file.md) derives the axes a file is called
large along from the same tile rendering note, and names three sizes that every
later result is reported against.

Nothing in this repository has measured this engine yet. Every statement about
where its time goes is marked as an assumption in record 0006, with the issue that
will measure it.

### The plugin surface

The upstream tool's plugin API, in TypeScript, with its own workspace and its own
published runtime:

    gh api repos/penpot/penpot/contents/plugins --jq '.[].name'

This project's plugin work sits against that surface rather than beside it: a
contract that does not drift, a conformance suite that decides what the contract
is, a permission model, a registry the operator controls, and the documentation
and development loop an author needs. Record 0001 decides that all of it is
written in TypeScript, because publishing a contract in one language and testing
it in another is not a contract an author can compile against.

### The measurement harness

This repository's own code, and the first thing here that is not somebody else's.
It drives a real browser against a real build and produces result files rather
than printed numbers, because record
[0004](decisions/0004-metrics.md) requires every number to carry the conditions it
was produced under. Record 0001 decides it is TypeScript on Node driven by
Playwright, and gives the condition that would reverse that.

Record 0004 fixes which metrics exist, where each one's clock starts and stops,
and the protocol a run is valid under, including that cold and warm are two
different measurements and that a median never travels without its 95th
percentile.

### The corpus

Generated design files at the three sizes record 0003 names, reproducible from a
seed so that a result is attributable to a change rather than to a file. The
generator is this repository's code and sits in the same layer as the harness.

The corpus is generated rather than collected. A real large design file cannot be
published, and a measurement nobody else can reproduce is a claim rather than a
number.

### The tree this repository holds today

    git ls-files | grep -v '^docs/\|^README\.md$\|^NOTICE\.md$\|^\.github/'

That prints nothing at the revision this file lands on. The repository holds
documents, a notice and workflow guards, and no code at all. Everything above
described as this repository's own is planned rather than present, and this
command is how a reader checks how far that has changed.

## How a change moves through the parts

The order matters more than the list, because most of it is about deciding where
a change goes before it is written rather than after.

**It starts as an issue.** The issue says what is wrong, what the evidence is, and
what done means. Where the evidence is a number, it carries the command that
produced it.

**Where it changes something the architecture rests on, a decision record comes
first.** Record 0001 fixes how those records are named and numbered, that a number
is allocated by the issue producing it, and that a number is never reused. A
superseded record keeps its file and says what replaced it, because every issue
and commit here cites records by number.

**Record 0002's test decides where the change lands**, upstream or overlay, and it
is applied before the change is written rather than after it is finished. A change
that goes to the overlay records which of the three questions sent it there, or
what was offered upstream and what came back.

**Before the artefact is built, the means is checked and the check is recorded.**
A sentence in the issue or the pull request body naming the means and why it fits.
Record 0001 answers this for the four layers it covers; an artefact outside those
asks the question again rather than inheriting the answer.

**The harness decides whether a performance change worked**, under record 0004's
protocol, against a corpus file at one of record 0003's named sizes. A result that
does not name its size, its machine and whether it was cold or warm is not a
result.

**It lands as a pull request.** Direct pushes to the default branch are refused by
the repository ruleset. The guards that run against a change are in
`.github/workflows/` and are not listed here, because a list in a document drifts
against the thing it describes:

    git ls-files .github/workflows/

## What this project does not contain

A reader looking for one of these is in the wrong repository, and this section
exists to send them to the right one rather than leave them searching.

**The editor, the server, the file format and the render engine.** They are the
upstream project's, they are developed there, and a bug in any of them is reported
there. This repository holds an overlay of changes on top of a pinned revision of
them, and record 0002 explains why that is not a fork.

**The plugin runtime and the plugin API itself.** They are upstream's. What this
project builds is a contract over that surface, a suite that decides the contract,
a permission model, a registry and the author-facing documentation.

**A hosted service.** The design files live on the operator's own hardware. This
project builds nothing that sends them anywhere.

**A measurement of any commercial competitor.** `docs/performance/incumbent-comparison.md`
states that no such number is published here and gives the two independent reasons.

**Any answer to a question the tracker holds open.** Several positions this
project will need are deliberately not taken in any document yet. Where a record
touches one, it says so and points at the tracker rather than assuming an
answer.

The licence used to be on that list and is no longer. It is AGPL-3.0-only, a
maintainer decision recorded against the first entry of #89, and the file is in
the tree:

    git ls-files | grep -ix 'licen[cs]e\(\.md\|\.txt\)\?'
    LICENSE
