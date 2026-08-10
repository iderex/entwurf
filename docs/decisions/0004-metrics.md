# 0004. The metrics, and the protocol they are measured under

Status: accepted.
Issue: #14.

The gap this project names is a page switch being several times slower than it
should be. That is one metric, and a project that optimises the first metric it
wrote down will make the others worse without noticing. This record fixes the
set, defines each one precisely enough that two people measuring it get the same
number, and states the protocol the numbers are produced under.

Sizes are cited by the names in record 0003.

## What every definition has to contain

A metric is defined here only if it says where the clock starts, where it stops,
what unit the result is in, and which browser-observable signal the harness reads
to find the two ends. A definition missing the last of those is an intention
rather than a metric, and the harness in issue #15 cannot implement it.

None of the signals below has yet been exercised in a browser in this
repository. Issue #15 is where each one is confirmed to exist and to be readable
on the target browser, and where a signal that turns out not to be is replaced by
an amendment to this record rather than by a quiet substitution in the harness.

## The metrics

### Open to interactive

Start: the moment the request for the file's data leaves the page.
Stop: the first animation frame after which an input event is handled within one
frame budget.
Unit: milliseconds.
Signals: `PerformanceResourceTiming` for the request start, `requestAnimationFrame`
timestamps for frame boundaries, and `PerformanceEventTiming` for the handled
input. The harness synthesises the probing input rather than waiting for a person.

The stop condition is deliberately not first paint. A canvas that has painted an
empty background has not opened the file, and a metric that says otherwise would
reward exactly the wrong change.

### Page switch to complete

Start: the timestamp of the input event that selects the other page.
Stop: the first animation frame at which no tile intersecting the visible region
is still pending.
Unit: milliseconds.
Signals: `PerformanceEventTiming` for the start, and a User Timing mark emitted by
the engine when its tile queue for the visible region drains, read through a
`PerformanceObserver`.

That mark does not exist yet. The engine renders tiles across several animation
frames on purpose, so "the page is drawn" is engine state and not something the
browser reports on its own. Adding the mark is a change to the engine, and it goes
through the test in record 0002 like any other: it is useful to any operator who
wants to know when a page has finished drawing, so it is offered upstream first.
If it is declined, it becomes an overlay entry and counts against the overlay
limit. The fallback, if neither route lands, is frame differencing over captured
frames, which is more expensive, noisier and worse, and adopting it would be an
amendment here.

### Frame time while panning

Start and stop: consecutive animation frame callbacks during a scripted pan.
Unit: milliseconds per frame, reported as a distribution rather than a single
number.
Signals: `requestAnimationFrame` timestamps, with `PerformanceObserver` on long
animation frames used to attribute the slow ones.

### Frame time while zooming

Same definition and signals as panning, under a scripted zoom. It is a separate
metric because zoom changes which tiles are needed rather than which tiles are
visible, and a change can help one and hurt the other.

### Frame time while dragging a component instance

Same definition and signals, under a scripted drag of one component instance.
Separate because a drag invalidates tiles continuously while the instance's own
children are resolved, which neither pan nor zoom does.

### Memory at rest

Start and stop: a single reading, taken once the file is open and the harness has
observed no tile work across a stated number of consecutive animation frames.
Unit: bytes.
Signal: `performance.measureUserAgentSpecificMemory()`, which requires the page to
be cross-origin isolated. The harness does not force garbage collection and does
not estimate. It records the browser and its version beside the value, because the
value is user-agent specific by name and is not comparable across browsers.

### Bulk change apply

Start: the input event that commits a change touching many shapes at once.
Stop: the first animation frame at which no tile intersecting the changed shapes
is still pending.
Unit: milliseconds.
Signals: `PerformanceEventTiming` for the start and the same drain mark as the
page switch. The number of shapes the change touches is a condition on the result,
not part of the metric, and it is tied to the named size the run used.

## The protocol

**Cold and warm are two different measurements and both are reported.** Cold means
a browser profile created for the run, an empty HTTP cache, no service worker
state and a file this profile has not opened. Warm means the same tab with the
file already opened once. A result that does not say which one it was is invalid,
because the two differ by more than most changes this project will make.

**Repetition count.** Ten measured repetitions for the metrics that produce one
duration per run, which are open to interactive, page switch and bulk change.
Five runs for the frame-time metrics, with the frames pooled across all five,
because one scripted gesture already produces hundreds of frames and five
independent gestures test the gesture rather than the frame count. One reading per
run for memory at rest.

**Discard rule.** Exactly one repetition is discarded: the first after the browser
starts, and the file records that it was discarded and what its value was. Nothing
else is discarded, and in particular no outlier is. A design tool is judged on the
frames that make it feel broken, and outlier rejection is the mechanism by which
those frames disappear from a project's own reports.

**The reported statistic.** The median, and the median is never reported alone.
The 95th percentile travels with it in every place a number appears, and for the
frame-time metrics the single worst frame travels with both. The reason is the
same as the discard rule: the median describes the typical frame, and nobody
complains about the typical frame.

Where a document, a release note or an issue quotes one of these numbers, it
quotes the pair. A sentence carrying a median without its 95th percentile is
wrong even when the median is right.

**Invalidity conditions.** A run is invalid, and the harness refuses to produce a
result rather than producing a marked one, when any of these holds: a condition
field the result file requires is missing, developer tools were open, the browser
version was not identical across every repetition of the run, the scripted gesture
did not replay to the same input sequence, or the harness measured its own
overhead above the share it declares. A run on a machine other than the one the
result file names is not an invalid run, it is a different result, and comparing
the two is what issue #16 refuses by default.

**Noisy rather than invalid.** A run whose spread exceeds the limit issue #16 sets
is valid and is marked noisy in the result file itself, so a later reader cannot
quote its median without seeing the mark. The distinction matters: invalid means
the run says nothing, noisy means the run says something imprecise, and collapsing
the two loses the second.

## What a machine refuses here, and what it does not

One rule above is refused and the rest are positions. The split is stated here
because this record is quoted for the protocol, and a protocol a reader believes
is enforced is worse than one they know is not.

The rule that a median never travels alone is refused by `check:invariants`,
which reads a duration written as a number followed by ms in tracked Markdown and
judges it against the paragraph it sits in. Its bounds are printed by every run:
a number written as a word, a byte count, and a number in an issue or a commit
message are all outside it, which leaves most of the places this rule is about.

Everything else here needs a harness that does not exist. The metric definitions,
the repetition counts, the discard rule and the invalidity conditions are read by
a person until issue #15 builds the thing that produces a result file and issue
#16 makes a missing condition field a refusal rather than a gap.

## What is deliberately not measured

**Frames per second as a single number.** It is the reciprocal of a mean, and it
hides the worst frames, which are the ones this project exists to fix.

**First contentful paint on its own.** It measures how fast an empty canvas
appears. See the stop condition of the first metric.

**Composite page-quality scores.** They move for reasons that have nothing to do
with the render path, and a score that moved cannot be attributed to a change.

**CPU utilisation percentage.** It is not comparable across machines and it is not
what anyone feels. Where a profile needs it, it belongs to the profile in issues
#23 and #24, not to the published set.

**Bundle and asset size.** It is worth watching and it is not performance. Making
it a metric here creates a trade against the frame-time metrics that would be
resolved by whoever wrote the last commit.

**Anything measured on a server.** The position of this project is that the work
is local, so a server-side number would be measuring something the project claims
not to depend on.

Adding a metric later is allowed. It is added the way the ones above are written,
with both clock ends, a unit and a signal, and with a sentence saying what the
existing set failed to notice.
