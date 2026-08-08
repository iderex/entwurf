# The assets in this tree, and the terms each one arrives under

A font, an icon set and a sample design file each carry terms about
redistribution and embedding, and those terms are not the software licence of the
project that ships them. An operator who exports a document with a font embedded
in it has done something the font's terms govern, and they can only answer for it
if somebody wrote the terms down.

This page is that register. It is not a summary of one: it is the list itself, and
`check:assets` refuses the tree when the list and the tree disagree.

## What the check refuses, and what it does not reach

The check runs both directions. An asset in the tree with no entry here is
refused, and an entry here naming a file the tree does not carry is refused too,
because a register that keeps rows for files nobody ships is a list of claims
about nothing. It also refuses an entry with no licence, an entry whose licence
field carries a placeholder such as unknown or to be confirmed, an entry that does
not say where the licence was read or on what date, and two entries naming one
path.

    corepack pnpm run check:assets

Three bounds, stated here rather than discovered.

It reads file extensions and never file contents. An asset carried inside a
source file, as a data URI, an inline SVG or a font encoded into a stylesheet, is
not reached by it. The extensions it is willing to call an asset are printed by
every run.

It judges what this repository tracks. It says nothing whatever about what a
running system offers. The fonts and icons that arrive with the upstream
distribution are not files in this tree, so no green run here is evidence about
them, and issue #69 stays open for that half along with what happens to a font on
export and what an operator adding their own fonts is responsible for.

It cannot judge whether a licence written down is the licence the asset actually
carries. Nothing that reads this tree could. What it refuses is the absent field
and the placeholder, which are the two states somebody writes when they have not
looked yet.

## The rule the register exists to hold

An asset whose licence cannot be established is removed rather than shipped. That
is a rule about the moment an asset is added, and it is the moment the check
speaks: an asset committed without an entry reddens the run, and the only entry
that passes is one carrying terms, a source and a date. Seeding this list from
whatever is already present is the failure it is built against, which is why it
lands while the list is empty.

## The register

One block per asset, in the order they were added. The fields are `Path`, `What`,
`Licence`, `Source` and `Read`, all five required, and `Read` is the date the
terms at `Source` were read, in the form YYYY-MM-DD.

```asset
```

Nothing is listed, because this repository tracks no font, no icon and no sample
design file. Read at the revision this page lands on:

    node tools/src/check-assets.ts
    examined 71 tracked path(s) by extension: 0 asset-shaped path(s), against 0 entr(ies) in docs/legal/assets.md, under 5 of 5 rule(s).

An entry looks like this. It is shown in an untagged block on purpose, so that the
example is not read as an entry by the check:

    Path: assets/fonts/Example-Regular.otf
    What: a font offered in the font picker
    Licence: OFL-1.1
    Source: https://example.invalid/example-font/OFL.txt
    Read: 2026-08-08

## Adding an asset

Read the terms at their source rather than from a summary somebody else wrote,
put the block in the register in the same change that adds the file, and date the
reading. Where the terms cannot be established, the asset does not land: that is
the rule above and it is not softened by the asset being convenient.

Where an asset is replaced by one in a different format, the entry is replaced
rather than added to. The check names the old path and says the tree does not
carry it, which is what a stale row looks like from outside.
