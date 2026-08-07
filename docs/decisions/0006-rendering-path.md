# 0006. The rendering path that closes the large-file gap

Status: accepted.
Issue: #21.

This is the decision the rest of the project rests on, and it is written before
any code depends on it. It fixes the path. It does not fix where inside that path
the work goes, because that is decided by the profiles in issues #23 and #24 and
this record would be guessing.

Sizes are cited by the names in record 0003. Metrics are cited by the names in
record 0004.

## The starting position, which is not the one the pitch implies

A project promising to close a rendering gap sounds like a project that is going
to write a fast renderer. That framing is wrong here and getting it wrong would
send the first year of work to the wrong place.

A GPU render engine already exists upstream. It is a Rust crate drawing through
Skia, compiled to WebAssembly through Emscripten, and it already renders in tiles
with a texture cache so that unchanged regions are not redrawn. Fetched
2026-08-07 UTC:

    gh api repos/penpot/penpot/contents/render-wasm/README.md --jq .content | base64 -d
    gh api repos/penpot/penpot/contents/render-wasm/docs/tile_rendering.md --jq .content | base64 -d

The structural facts this record leans on are read out of those two documents,
and each is marked where it is used. What neither document contains is a cost.
They describe mechanism, and mechanism does not say where the milliseconds go.

So the honest framing is that a competent renderer exists and something is
dominating the cost on component-dense files. Naming that something is the
profile's job, not this record's.

## The decision

**The work happens inside the existing engine and in the layers that feed it. No
different rendering technology is adopted.**

The split between those two halves, engine against feeding layers, is deliberately
left open. This record asserts only that the answer lies within that pair, and
that a third place, a replacement renderer, is not where it lies.

## The three rejected alternatives

**Replace Skia with a bespoke GPU pipeline.** It buys control over every draw
call, which is the strongest form of the thing this project wants. It costs the
entire text, path, effect, blending, masking and compositing surface that Skia
already handles correctly. The engine's own pipeline description lists fills,
strokes and shadows drawn onto separate Skia surfaces and composited per tile,
with blending, opacity and masking applied, read out of the tile rendering note.
Reproducing that correctly is most of what a design tool is, and this project
would be spending its whole budget re-reaching a starting line that already
exists. It is also the option that cannot be offered upstream in pieces: a
half-replaced renderer is not a change anyone can take.

**Render on the server and stream frames to the client.** It buys client
independence, which answers the weakest machine in the audience directly and is
the only option here that does. It costs three things at once. It costs the
sovereignty position, because the design content would have to reach a renderer
that is not the operator's local machine unless the operator runs that renderer
too, and at that point the weak machine is not helped. It costs the latency
budget, because record 0004's frame-time metrics are measured per animation frame
during a pan, and a network round trip does not fit inside one. And it costs the
offline case entirely. This is rejected on the position rather than on the
engineering, and record 0002's test does not even get to run on it.

**Leave the engine alone and optimise only the layers above it.** It is the
cheapest option and it is rejected as a *whole* answer rather than as a
contribution. It is very likely part of the answer. It is rejected as the whole
answer because committing to it in advance would decide the profile's outcome
before the profile runs: if the cost turns out to sit in the engine's tile
assignment or in its cache behaviour, a project that has ruled the engine out of
scope has nowhere to put the fix. The reverse commitment would be the same
mistake in the other direction, which is why the decision above names the pair
and not one half of it.

## What is measured and what is assumed

Nothing in this repository has measured a page switch, an open, or a frame. The
measurement harness is issue #15 and the first baseline is issue #17. This
section exists so that no sentence in this record can later be quoted as if it
had been measured.

**Read out of the upstream documents, structural rather than temporal.** A tile
is 512 by 512 logical screen-space units and its size does not change with zoom.
A dual index maps tiles to shape identifiers and back. Tile assignment has a full
form walking every nested child and a shallow form associating only first-level
children and resolving deeper ones while drawing. Rendered tiles are cached as
images under a named capacity constant and distant tiles are evicted on a
least-recently-used basis. Tile work is spread across animation frames under a
time or count budget rather than completed in one. All of these are in the tile
rendering note fetched above.

**Assumed, and named as assumed.** That the dominant cost of a page switch on a
component-dense file is bookkeeping rather than rasterisation, meaning tile
assignment, index rebuilding, shape-tree traversal and the crossing between the
editor and the engine, rather than Skia drawing pixels. Record 0003 states the
same belief and issue #28 restates it. Issue #23 is what measures it and is
entitled to contradict it.

**Assumed.** That a page switch repeats work it could have kept. The engine
invalidates and re-renders tiles on interaction, and what a page switch does to
the index and the cache is not described in the note either way. Issue #25 is
where the repeated work is identified and cut, and issue #23 is what tells it
where to cut.

**Assumed.** That the boundary between the ClojureScript editor and the
WebAssembly engine costs a measurable share on the sizes where this project
hurts, because a shape tree has to reach the engine somehow and `strained` and
`beyond` make it large. The upstream tree documents a serialization note that
this record has not read, so this assumption is not even informed yet. Issue #23
is where it becomes a number or disappears.

**Assumed, and the weakest of the four.** That the tile texture cache is a
constraint at these sizes rather than comfortable. The note says the cache is
bounded, names `TEXTURES_CACHE_CAPACITY` and does not give its value. Issue #26
is where the budget is stated in bytes and proved to bite. Record 0003 already
marks the related page-count axis as a belief for the same reason.

## What would make this path the wrong one

Written against the metrics record 0004 defines, so that the condition is
checkable rather than a matter of opinion. The numeric target those metrics have
to reach is issue #18's record and does not exist yet, so the conditions below are
written as movement and attribution rather than as a threshold, and they stay
correct once that record lands.

**The path is wrong if the profile attributes the dominant share of page switch
to complete to Skia rasterisation itself**, rather than to tile assignment, index
maintenance, traversal or the editor-to-engine crossing. That is the finding that
would mean the engine is doing the right work and doing it slowly, which is the
one case a different rendering technology answers and this decision does not.
Issue #23 is where that share is produced.

**The path is wrong if the work it permits cannot move the metrics.** Concretely:
successive changes inside the engine and the layers feeding it land, each proved
by the harness, and the median and 95th percentile of page switch to complete on
`strained` do not move toward the target while memory at rest and the frame-time
metrics do not degrade to pay for it. A path that cannot move its own metric is
not a path, whatever its reasoning was.

**The path is wrong if closing the gap requires abandoning the tile model
itself.** If the profile shows that the cost is inherent to a 512-unit fixed tile
under a bounded texture cache rather than to how this engine implements it, the
decision above is too narrow, because it assumes the model and argues only about
the work inside it.

None of the three is a single bad number. Record 0004's protocol already
separates a noisy run from an invalid one, and a run that moves the wrong way once
is neither of these conditions. What triggers an amendment is a profile with an
attribution, and the amendment leaves this record's original statement visible.

## Where the work lands, upstream or overlay

Applying record 0002's test, in its order, to the classes of change this path
produces.

**Engine changes that any operator of the upstream tool would want are offered
upstream.** A faster tile assignment, a cheaper index rebuild, a better eviction
policy or a reduction in repeated work are correct for somebody who has never
heard of this project, so question 1 sends them upstream and they are not written
against this project's packaging, naming or defaults. This is the majority of the
work this record permits, and saying so is the point of writing the record before
the code.

**Instrumentation that exists so this project can measure is offered upstream
first and is the class most likely to come back.** Record 0004 already names one:
a User Timing mark emitted when the engine's tile queue for the visible region
drains, which the page switch and bulk change metrics both read. It passes
question 1 on its merits, because any operator who wants to know when a page has
finished drawing benefits, so it goes upstream first. If it is declined it becomes
an overlay entry and counts against record 0002's limit, and record 0004 already
records the worse fallback if neither route lands.

**Changes that depend on something only this repository has stay in the overlay,
by question 2.** The corpus, the harness, the measurement configuration and any
build flag that exists to make a run reproducible are in this class. The pinned
Rust toolchain that record 0001 sends to issue #3 is here for the same reason: it
is this project's measurement requirement rather than a defect upstream has.

**Changes that move a default upstream appears to have chosen stay in the
overlay, by question 3, and carry the sentence naming which default they move.**
A tile budget per frame, a cache capacity or a preload margin tuned for this
project's sizes is a tuning decision rather than a correctness fix, and upstream
is entitled to a different one. Where such a change is genuinely a fix rather than
a preference, question 3 does not apply and question 1 already sent it upstream.

The expectation, stated as an expectation rather than as a plan, is that the
overlay ends up holding measurement scaffolding and tuning rather than rendering
logic. If it ends up holding rendering logic instead, that is record 0002's limit
doing its job and the signal is the limit being approached, not this paragraph.

## What this record does not decide

It does not decide where inside the path the work goes. Issues #23 and #24 decide
that, and this record is amended once with what they find.

It does not decide what happens on a machine with no working GPU, which is issue
#27 and record 0007.

It does not set the numeric target the conditions above are judged against, which
is issue #18.
