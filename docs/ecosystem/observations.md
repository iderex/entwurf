# Ecosystem observations

This project should know whether the enabling work is working, and knowing that
means counting something. This page is where the counting happens, and it is
written so that the counting cannot quietly turn into a target.

Read `docs/plugins/README.md` first for what this project does and does not offer
an author. This page is the measurement side of the same position.

## Why the plugin count is not a goal of this project

The moment a count becomes a target, the project starts optimising the count
rather than the conditions, and the conditions are the only part this project
controls. That is not a general observation about metrics, it is a specific
prediction about what would happen here: the cheapest way to move a plugin count
is to write more plugins in this repository and to encourage thin ones elsewhere,
and neither of those makes the contract better, the development loop faster or the
documentation clearer. A project that had made the count a goal would do them
anyway, because they work, and would end up with a larger number and a worse
offer. So the count is recorded because it is informative, and the things next to
it are the things this project is actually accountable for. Whether authors show
up is a decision thousands of people make about their own time, and this project
can remove reasons not to and nothing else.

## How a figure is recorded here

Every figure carries the date it was produced and the command that produced it. A
figure that could not be produced is shown as not measured, with the reason and
the issue that would make it producible, rather than left out. An omitted figure
reads as an absence of the thing being measured, and that is a different statement
from not having measured it.

Where a command was not run on a given date, the figure keeps its previous date.
It is never carried forward silently under a newer one.

## The observations

### Time from clone to a running plugin

The single most useful number about the development loop, because it is the thing
an author experiences before anything else this project built.

**Not measured.** There is no development loop in this tree yet, and issue #50 is
where one exists and this figure becomes producible. Not measured rather than
zero, and not an estimate.

### Contract operations covered by conformance

The share of the contract that a disagreement can be settled about by running
something. Record `docs/decisions/0009-plugin-contract.md` makes the conformance
suite the authority for what the contract says, which means an operation the suite
does not cover is not in the contract, so this figure is a direct measure of how
much contract there is.

**Not measured.** The suite is issue #41 and does not exist. When it does, this
figure is produced by the suite itself rather than by counting documentation.

### Plugins in this project's registry

**Not measured.** The registry is issue #52 and does not exist, so there is
nothing to count and no command to record. This entry exists so that its absence
is visible rather than inferred from the page not mentioning it.

### Published versions of the upstream contract package

How much the surface an author compiles against has moved, which is context for
every compatibility statement this project makes.

    curl -s https://registry.npmjs.org/@penpot/plugin-types -o plugin-types.json
    node -e "const p=require('./plugin-types.json'); console.log(Object.keys(p.versions).length, JSON.stringify(p['dist-tags']), p.time.created)"
    19 {"next":"1.5.0","latest":"1.4.2"} 2024-06-10T12:28:48.936Z

**19 published versions**, latest `1.4.2` with `1.5.0` on the pre-release channel,
first published 2024-06-10. Produced 2026-08-07 UTC.

This is an observation about the upstream project rather than about this one, and
it is here because it moves whether this project does anything or not. It is not
evidence that the enabling work is working.

### Example plugins in the upstream workspace

    gh api repos/penpot/penpot/contents/plugins/apps --jq '[.[].name | select(endswith("-plugin"))] | length'
    9

**9**, produced 2026-08-07 UTC against `d835baefecb13a4abf273e02ccfcefc169306756`.

Two things bound what this figure means. It counts directories whose name ends in
`-plugin`, so a plugin named otherwise is missed and a directory named that way
which is not a plugin is counted. And these are the upstream project's own
examples, not third-party work, so this is a measure of how much material an
author has to read rather than of how many people showed up.

### Plugins that exist in the world

**Not measured, and no command is recorded because none is known.** There is no
enumerable public list of plugins for this surface that this project has found.
The npm registry search does not answer it either: a scope search returns nothing
for the publisher of the contract package, which says something about the search
rather than about the plugins.

Reporting this as not measured is deliberate. It is the figure a reader most wants
and the one this project is least able to produce honestly, and putting a number
here that came from somewhere else would be the exact failure this page is written
against.

## What is deliberately not recorded

**Downloads, installs or stars of anything.** They measure attention, they are
trivially moved by a link somewhere, and none of them is a condition this project
affects.

**A count of plugins over time as a trend line.** A trend invites a target more
strongly than a number does, and the figure that would carry it is the one above
that cannot be produced.

**Anything about individual authors.** The observations are about conditions.

## The rule this page depends on

No milestone, issue or release note in this repository is written against a plugin
count. That is checkable rather than a claim:

    gh issue list --state all --limit 200 --json number,title,body \
      --jq '.[] | select((.body + .title) | test("(?i)[0-9]+ *plugins|plugin count|number of plugins")) | "#\(.number) \(.title)"'
    gh api repos/iderex/entwurf/milestones --jq '.[] | "\(.title): \(.description)"' | grep -iE '[0-9]+ *plugins|plugin count|number of plugins'
    gh release list --limit 10

On 2026-08-07 UTC the first reports two issues and both are the issues that
establish this rule rather than issues written against a count, the second prints
nothing, and the third prints nothing because this project has published no
release.
