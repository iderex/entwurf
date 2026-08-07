# 0003. What a large file is, in numbers

Status: accepted.
Issue: #12.

While "large file" stays an adjective, any rendering issue in this project can be
declared finished by someone who measured a file that was merely big. This record
replaces the adjective with a set of axes and three named points along them.

## Where the axes come from

The axes are the things the upstream render engine is actually sensitive to. Its
own note on tile rendering is the source, fetched on 2026-08-06 UTC:

    gh api repos/penpot/penpot/contents/render-wasm/docs/tile_rendering.md --jq .content | base64 -d

Five facts out of that note carry most of the reasoning below. A tile is 512 by
512 logical screen-space units and its size does not change with zoom. A tile
hash map holds both directions of the relationship between tiles and shape
identifiers. Tile assignment has a full form that walks every nested child and a
shallow form that associates only first-level children and resolves deeper ones
while drawing. Rendered tiles are cached as images and reused for regions that
did not change. That cache holds a limited number of tiles, under a capacity
constant the note names without giving its value, and evicts distant tiles on a
least-recently-used basis.

Each axis below says whether its reason is read out of that note or is a belief
this project holds and has not yet measured. The difference matters when a later
measurement contradicts one of them.

## The axes

**Total shapes in the file.** The tile hash map is built over shape identifiers,
so the count of shapes is the size of the thing being indexed. Read out of the
note.

**Shapes on the heaviest page.** A page switch pays for the page being entered,
not for the average page, so the worst page is what sets the worst case. Read out
of the note, in that tile assignment runs against the shapes being shown.

**Shapes intersecting a single tile.** Drawing an uncached tile means fetching
the shapes that intersect it and drawing them, and the tile is a fixed size in
logical units. Two files with the same shape count and different spatial
concentration are different amounts of work per tile. Read out of the note.

**Page count.** Every page has its own set of tiles, and the rendered tile images
are held in one cache. The note says that cache is bounded, names the capacity
constant, and says distant tiles are evicted on a least-recently-used basis. What
it does not say is what the capacity is, in tiles or in bytes, and it does not
mention pages at all. The bound and the eviction are read out of the note. That
page count is therefore a cost axis is a belief: it rests on tiles from different
pages passing through one bounded cache, which the note neither states nor denies.
Issue #26 is where that cache is held to a budget stated in bytes and the budget
is proved to bite.

**Component instances.** A file can be small in definitions and large in what is
drawn, because one definition instantiated many times produces many drawn shapes.
Belief. The note does not discuss components, and what an instance costs relative
to a plain shape is not measured here.

**Depth of nesting.** Shallow tile assignment associates only first-level children
and defers deeper ones to draw time, so depth decides how much work moves out of
the index and into the frame. Read out of the note, which names both forms and
says why the shallow one exists.

**Text shapes.** Text is measured and laid out rather than only transformed, so
its bounding box is not known as cheaply as a rectangle's, and bounding boxes are
what tile assignment runs on. Belief. The note does not single text out.

**Image bytes.** Image content occupies memory that the shape tree does not
account for, on top of the cached tile images. This is the one axis measured in
bytes rather than in counts, and it is the axis a memory ceiling is hit on first.
Belief, resting on the note's description of the tile cache holding images.

**Distinct fills and strokes.** Fills, strokes and shadows are drawn onto
separate surfaces and composited into the tile, so the variety present in a tile
decides how many passes the composite costs. Read out of the note for the
surfaces; that distinctness rather than count is the driver is a belief, and it is
the weakest inference on this list.

## The three named sizes

These names are what every later issue cites. The numbers are chosen rather than
measured, and they are chosen so that the three points are far enough apart that a
result on one cannot be mistaken for a result on another. The corpus generator in
issue #13 is what produces files at these points.

| Axis | `normal` | `strained` | `beyond` |
| --- | --- | --- | --- |
| Total shapes | 8,000 | 60,000 | 250,000 |
| Shapes on the heaviest page | 2,000 | 20,000 | 90,000 |
| Shapes intersecting one tile, worst tile | 60 | 400 | 1,500 |
| Pages | 8 | 40 | 120 |
| Component instances | 500 | 6,000 | 30,000 |
| Maximum nesting depth | 6 | 12 | 20 |
| Text shapes | 800 | 6,000 | 25,000 |
| Image bytes | 20 MB | 200 MB | 800 MB |
| Distinct fills and strokes | 40 | 300 | 1,200 |

`normal` is a file a working designer would not describe as large. It is here so
that a change which helps the hard cases and hurts the ordinary one is visible
rather than invisible.

`strained` is the point this project asserts the tool is uncomfortable at. That
assertion is not measured. Issue #17 is the first measurement that will either
support it or move it, and if the first baseline shows `strained` to be
comfortable, this record is amended and the original numbers stay visible.

`beyond` is deliberately past what anyone should have. It exists so that a
degradation curve has a third point, and so that failure has a name that is not
the same word as difficulty.

A size is cited by its name, for example "measured on `strained`". An issue that
says "a large file" and cites nothing has not said which of the three it means,
and that is the thing this record is against.

## Which axis is believed to dominate the page-switch cost

The belief is that it is shapes on the heaviest page, and more narrowly the
shapes intersecting the visible and interest tiles at the zoom the page opens at.
The reasoning is that a switch has to establish tile assignment for the page being
entered and then draw the tiles the viewport covers, and neither of those reads
the pages the user is not looking at.

This is not measured. Nothing in this repository has measured a page switch at
all, and the upstream note describes mechanism rather than cost. Issue #23 is
where it is measured, and it is entitled to contradict this paragraph. If it does,
the amendment says so plainly rather than quietly replacing the sentence.

## What is deliberately not an axis

**File size in bytes on disk.** Compression and embedded images make it a poor
proxy for the work the engine does, and it is the number people reach for first
because it is the easiest to read. It is recorded as a condition alongside a
result, and it is never a size.

**Components defined but never instantiated.** Nothing draws them, so they cost
the render path nothing. If issue #24 finds that they cost the open path
something, that is an open-file cost and is reported there rather than promoted
to a render axis.

**Comments, members and collaborators.** The render path does not read them.

**Layer names and other metadata.** Same reason. Long names make a file bigger on
disk and do not make it slower to draw.

**Vector path node counts.** This is the omission most likely to be wrong, and it
is left out on purpose. This project's position, stated in issue #28, is that what
makes a large file slow is bookkeeping rather than rasterisation, and path
complexity is a rasterisation axis. Issue #23 is what tests that position. If the
profile attributes a meaningful share of the page switch to path rasterisation,
path node count is added here with that profile as its argument.

Adding an axis later is allowed and requires an argument of that shape: a
measurement showing the existing axes do not account for something. Adding one
because it was easy to count is what this section refuses.
