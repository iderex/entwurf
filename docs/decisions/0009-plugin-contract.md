# 0009. The plugin surface is a contract, not an interface

Status: accepted.
Issue: #39.

## What already exists upstream

The upstream tool has a plugin surface, it is published as a typed package, and it
is versioned. Read from the registry rather than from documentation about it,
2026-08-07 UTC:

    curl -s https://registry.npmjs.org/@penpot/plugin-types -o plugin-types.json
    node -e "const p=require('./plugin-types.json'); console.log(JSON.stringify(p['dist-tags'])); console.log(Object.keys(p.versions).join(' ')); console.log(p.time.created)"
    {"next":"1.5.0","latest":"1.4.2"}
    0.6.0 0.7.0 0.8.0 0.9.0 0.10.0 0.12.0 1.0.0 1.1.0 1.2.0 1.3.0 1.3.1-next.0 1.3.2-next.0 1.3.2-next.1 1.3.1 1.3.2 1.4.0 1.4.1 1.4.2 1.5.0
    2024-06-10T12:28:48.936Z

The issue that raised this names `jq` for the same fetch. This machine has no
`jq`, so the equivalent was run through Node and both commands are quoted rather
than the one that was not run.

Four things out of that output matter. The surface has been published since June
2024 and has reached 1.x, so it is past the stage where breaking it is expected.
It has had exactly one major bump, from the 0.x line to 1.0.0. It already runs a
pre-release channel, with `next` ahead of `latest`, which is a mechanism this
record can use rather than invent. And the workspace it is built in declares a
different licence from the tool it ships with:

    gh api repos/penpot/penpot/contents/plugins/package.json --jq .content | base64 -d | grep -n '"license"'
    5:  "license": "MIT",

That is recorded here because a contract an author builds against is a thing they
have to be allowed to build against, and it is not the same answer as the tool's
own MPL-2.0. It is not decided here.

## The position

**This project treats the plugin surface as a contract, with a compatibility
promise, a deprecation policy, and a conformance suite that is the authority for
what the contract says.**

The alternative is an interface that changes when it is convenient. That is
cheaper in every release and it is not a lesser form of the same thing: it is a
different offer to an author. An interface says the code you write may need
revisiting whenever we ship. A contract says it will not, and names what happens
if it does.

**What the contract costs.** Every addition has to be designed for permanence,
because an addition is a promise and a badly shaped one cannot be withdrawn
cheaply. Every removal takes a deprecation cycle rather than a release. A
conformance suite has to be written and maintained, and it slows every change
that touches the surface because a change to the contract is a change to the
suite first. And it costs the ability to fix a design mistake quickly, which is
the cost that will actually hurt, because the mistakes worth fixing quickly are
exactly the ones the promise protects.

**What the interface would cost.** A third-party author's investment stops being
rational. Nothing else this project does on the ecosystem side matters if the code
someone writes this year needs revisiting next year, and record 0001's whole
argument for the plugin means is that an author should be able to compile against
something. `docs/plugins/README.md` states the honest limit of what this project
can do about ecosystem size, and removing every reason not to show up is the whole
of it. An interface that drifts is a reason not to show up.

The contract is chosen. It is chosen knowing that this project cannot make the
promise alone, which is what the section on the upstream relationship below is
about, and pretending otherwise would be making a promise out of somebody else's
repository.

## The compatibility promise

Versions here are of this project's contract, which is not the same number as the
upstream package version above. What ties the two together is in the upstream
section below.

**What may never change, in any release.** The meaning of an existing operation.
The type of an existing parameter or return value. Whether an existing operation
can throw. The identity of an existing permission, meaning what it grants. An
existing event's name and the conditions under which it fires. If one of these has
to change, it is not a change to the operation, it is a new operation and the old
one is deprecated, which is the route below.

**What may change in a minor release.** New operations. New optional parameters on
an existing operation, where absent means exactly what the operation did before.
New events. New permissions, where a plugin that does not ask for one is
unaffected. Performance, in either direction, subject to the metrics in record
0004 where the operation is one the harness measures. Anything that a plugin
written against the previous minor cannot observe.

**What may change in a patch release.** Defects, where the fixed behaviour is the
behaviour the contract already described. A patch that changes what the contract
described is not a patch, however small the diff is. This distinction is the one
most likely to be got wrong under pressure, and the conformance suite is what
decides it rather than the size of the change.

**What may change only in a major release.** Removing an operation, an event or a
permission that has completed its deprecation cycle. Nothing else, and in
particular a major release is not an opportunity to make the unannounced changes
that were saved up for one.

**What is outside the promise entirely, and is named so it is not read as covered.**
The internal structure of anything the contract returns beyond the properties it
documents. The order of results where no order is specified. Timing and
interleaving, except where an operation's documentation states a guarantee. The
text of an error message, as opposed to its type and its condition. Anything
reached by a plugin that the contract does not describe, which includes anything
it gets to by reaching around the sandbox rather than through the surface.

## The conformance suite is the authority

**A disagreement about what the contract says is settled by running something.**
Issue #41 builds the suite and it is the authority in a specific sense worth
stating rather than leaving to goodwill.

The suite is the definition, and the prose documentation describes it. Where the
two disagree, the suite is right and the documentation is a defect. The reason is
the one this project applies to itself everywhere else: a sentence in a document
is an explanation of a rule, and a rule is a thing that refuses.

A behaviour the suite does not cover is not part of the contract, whatever the
documentation says about it. That cuts against this project in the direction it
should: a promise nobody can check is not a promise, and the way to widen the
contract is to widen the suite.

Adding an operation means adding its conformance case in the same change. An
operation with no case is not in the contract and is not announced as if it were.

The suite runs against the reference plugin in issue #46, and the reference plugin
exists so that the suite is exercising the contract as an author reaches it rather
than as an implementation exposes it.

Issue #47 is the check that refuses a silent breaking change, which is what turns
this section from a description into something with teeth.

## How a breaking change is made

Only after it has been established that the change cannot be made as an addition,
because an addition beside a deprecated operation is almost always available and
is almost always the right answer.

**The cycle.** The operation is marked deprecated in a minor release, with the
replacement named in the same release, so a deprecation never arrives without
somewhere to go. It keeps working, unchanged, for the whole of the notice period.
It is removed in the next major release after the notice period ends, and not
before, even if the major release comes early.

**The notice period is twelve months from the release that marks the
deprecation.** Twelve is chosen rather than derived, and the argument for it is
the audience rather than an industry number: the operator this project is built
for upgrades on a schedule they control and may skip releases, so a notice period
shorter than a typical annual upgrade cycle would let a plugin break between two
upgrades an operator considers adjacent. If experience shows twelve months to be
the wrong size in either direction, this record is amended and the original number
stays visible.

**Where it is announced.** In the release notes of the release that marks it, in
the compatibility document issue #40 publishes, and in the deprecation's own entry
in the reference issue #48 publishes, so an author reading the reference for that
operation sees it without having read any release note. The registry in issue #52
is where a plugin using a deprecated operation can be identified, and what the
registry does about that is issue #53 rather than this record.

**A deprecation is never silent and never retroactive.** An operation that was not
marked deprecated in a released minor has not started its notice period, whatever
was intended.

## The relationship to the upstream plugin surface

This is the part this project does not fully control, and the promise above is
worth nothing if this section is written optimistically.

**This project's contract is a superset of the upstream surface**, not that
surface and not a separate thing.

Not that surface, because a promise this project makes about a package it does not
publish is a promise about somebody else's release schedule. Not a separate
thing, because a second incompatible plugin API would split an ecosystem this
project has already said in issue #49 that it cannot grow by wanting to, and an
author would have to choose which of the two to write against.

A superset means: everything the upstream surface offers, at a version this
project pins, plus what this project adds on top, and the compatibility promise
above covers the whole of it as this project ships it.

**What that means for a plugin written against upstream.** It runs here. That is
the point of the superset and it is the direction that must not break. An author
who has never heard of this project writes against the upstream package and their
plugin works in this project's distribution.

**What that means in the other direction, stated as the limitation it is.** A
plugin that uses what this project adds does not run on an upstream installation
that lacks the addition. This project does not hide that. The reference in issue
#48 marks which part of the surface is upstream's and which is this project's, so
an author choosing to use an addition is choosing knowingly rather than
discovering it from a support request.

**What happens when upstream changes its own surface.** Record 0002 sends the
addition upstream first, so the intended outcome is that this project's additions
stop being additions. Where an upstream release changes the surface in a way this
project's promise forbids, this project does not pass that change through on
upstream's schedule. The pinned version is what this project ships, and the
overlay is where the difference lives until the next major release of this
project's contract carries it, by the cycle above. That is the mechanism by which
the promise is kept over a surface this project does not own, and it has a cost:
the overlay grows, and record 0002's limit is what pushes back.

**The one thing this project cannot promise.** It cannot promise that the upstream
package an author installs from the registry will not change. It promises what its
own distribution presents to a plugin. An author who wants the promise gets it by
targeting this project's contract version, which is why that version exists as a
number separate from the upstream package's.

## What no machine refuses today

The section above says a rule is a thing that refuses, and by that measure this
record states none. Nothing here publishes a contract, runs a conformance case or
compares two versions of a surface:

    git ls-files 'tools/conformance/*' 'examples/*' | wc -l
    0

So "the suite is the definition" describes an intention, and the compatibility
promise, the deprecation cycle and the superset relationship are all positions.
The three things that would give them teeth already have their issues: #41 for
the suite that is the authority, #47 for the check that refuses a silent breaking
change, and #46 for the reference plugin the suite runs.

One part is refused already, and it is worth being exact about how little that
covers. The page an author reads is a tracked document, so `check:docs` judges
its paths, its links and the form of any record it cites. Nothing there bears on
whether the promise written on it is kept.

## What this record does not decide

It does not decide the wording of the published compatibility promise or the
deprecation policy an author reads, which is issue #40.

It does not decide what is in the contract. The conformance suite decides that,
and issue #41 builds it.

It does not decide the permission model, which is issue #42 and record 0010, nor
whether a plugin may reach the network, which is held on the tracker as a decision
this plan does not make for itself.

It does not decide the licence of anything published here, including whether the
upstream workspace's MIT declaration quoted above has any bearing on it.
