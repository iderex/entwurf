# Compatibility and deprecation

The promise on the front page, in full, for the author who wants to know exactly
what is being promised before spending a weekend on it. Record
[0009](../decisions/0009-plugin-contract.md) is where the position was argued and
what it costs this project is written there; this page is the same promise
addressed to you rather than to a contributor.

## What you can rely on

Code you write against a released version of this contract keeps working on every
later release of the same major version, without you touching it.

Concretely, none of these changes, ever, in any release:

- What an operation means.
- The type of a parameter it takes or a value it returns.
- Whether an operation can throw.
- What a permission grants. A permission you hold today grants no less tomorrow
  and no more.
- The name of an event and the conditions under which it fires.

If one of those has to change, it is not treated as a change to the operation. A
new operation appears beside it and the old one enters the deprecation cycle
below. That is the whole mechanism, and it is why the list above can be
unconditional.

A minor release may add operations, add optional parameters where leaving one out
does exactly what the operation did before, add events, and add permissions your
plugin is unaffected by if it does not ask for them. It may also change
performance in either direction, within what record
[0004](../decisions/0004-metrics.md) fixes for the operations the harness
measures. Nothing a minor release adds is observable to a plugin written against
the previous minor.

A patch release fixes defects, where the fixed behaviour is the behaviour the
contract already described. A change to what the contract described is not a
patch, however small it looks in a diff.

A plugin written against the upstream plugin package runs here. That direction is
the one that must not break, and it is the point of building on a superset rather
than beside it.

## What you cannot rely on

These are outside the promise, and they are listed so that relying on one is a
choice rather than an accident:

- The internal structure of anything an operation returns, beyond the properties
  it documents.
- The order of results where no order is specified.
- Timing and interleaving, except where an operation documents a guarantee.
- The text of an error message. Its type and the condition it is raised under are
  promised; its wording is not.
- Anything you reach that the contract does not describe, including anything you
  get to by going around the sandbox rather than through the surface. It may work
  today. It is not covered, and no deprecation cycle protects it.

There is one thing this project cannot promise you at all, and it is better read
here than discovered later. It cannot promise that the upstream plugin package you
install from a registry will not change, because that package is not published by
this project. What it promises is what its own distribution presents to a plugin.
You get the promise by targeting a version of this contract rather than a version
of that package, which is why the two carry different numbers.

The other direction is a limitation rather than a promise. A plugin that uses
something this project adds does not run on an upstream installation that lacks
the addition. The reference marks which part of the surface is upstream's and
which is this project's, so choosing an addition is something you do knowingly.

## What happens to your plugin when the contract changes

Nothing, until a major release, and a major release cannot arrive without you
having had a year's notice of every removal in it.

An addition in a minor release cannot reach your plugin: it is new surface you
have not asked for. A patch cannot reach it either, unless you were relying on a
defect, in which case the conformance suite is what decides whether the behaviour
you relied on was ever part of the contract. That suite, not this page and not the
reference, is the authority on what the contract says. Where the prose and the
suite disagree, the prose is the defect. A behaviour the suite does not cover is
not in the contract, whatever a document says about it.

A removal reaches your plugin only at the end of the cycle below, and only in a
major release.

## The deprecation policy

**The notice period is twelve months, counted from the release that marks the
deprecation.** Twelve months is chosen for the operator this project is built
for: someone who upgrades on a schedule they control and may skip releases
entirely. A shorter period would let a plugin break between two upgrades an
operator thinks of as adjacent.

**A deprecation arrives with its replacement.** The operation is marked deprecated
in a minor release, and the replacement is named in that same release. There is no
state in which something you use is going away and there is nowhere to go.

**A deprecated thing keeps working, unchanged, for the whole notice period.** Not
degraded, not warning-only, not slower. The same operation with the same
behaviour, for twelve months at least.

**Removal happens in the first major release after the notice period ends, and
not before.** A major release arriving inside the notice period does not carry the
removal. This is the clause most likely to be got wrong under pressure, so it is
worth stating in the direction that costs something: an early major release means
the deprecated operation ships in a major release it was already announced as
being removed from.

**Where it is announced.** In the release notes of the release that marks it, on
this page, and in the deprecated operation's own entry in the reference, so
reading the reference for that operation tells you without your having read a
release note.

**A deprecation is never silent and never retroactive.** An operation that was not
marked deprecated in a released minor has not started its notice period, whatever
anyone intended.

**How a running plugin is told is not settled yet.** The announcement route above
is decided; a signal your code can see at run time, rather than one you read, is
not. It would be surface, and surface arrives here with its conformance case
rather than ahead of it. This paragraph is what that gap looks like until it is
filled, and it is stated rather than left for you to notice.

## A worked example, with the dates it would have had

No deprecation has been announced, because no version of this contract has been
released. What follows is the policy run end to end against the deprecation this
project expects to have first, so that the shape is on the page before the
occasion is.

The case is the one record [0002](../decisions/0002-upstream-relationship.md)
makes routine. This project adds a permission for reaching a named network
destination, which record [0012](../decisions/0012-plugin-network-reach.md)
decides and which the upstream permission vocabulary has no name for. Record 0002
sends that addition upstream, and the intended outcome is that it stops being an
addition. When upstream ships its own name for the same capability, this project
carries two names for one thing, and the one it invented is the one that goes.

Read the years as offsets from a first release rather than as a plan.

Contract 1.4.0, released 2027-03-04. The upstream name is adopted and available
here from this release. The name this project added is marked deprecated in the
same release, with the upstream name given as its replacement. It is announced in
the release notes for 1.4.0, on this page, and in its own entry in the reference.
The notice period starts on 2027-03-04 and ends on 2028-03-04.

Contract 1.5.0, released 2027-07-15, and 1.5.1, released 2027-09-02. The
deprecated name works exactly as it did in 1.4.0. A plugin holding it is granted
what it was always granted. Neither release removes anything, because neither is a
major release.

Contract 2.0.0, released 2027-11-20. This is inside the notice period, so it does
not carry the removal. The deprecated name ships in 2.0.0 and its entry still
names 2028-03-04 as the earliest date it can be removed after. This is the clause
that costs something, and here is where it costs it.

Contract 3.0.0, released 2028-05-06. The first major release after 2028-03-04, so
this is the one that removes the name. A plugin still using it fails at install
against 3.0.0, naming the permission and the replacement. Fourteen months passed
between the announcement and the removal, and two major releases went by, the
first of which could have carried it and did not.

What an author does with that: nothing until they choose to, and one line when
they do. Reading the 1.4.0 release notes, or the reference entry, or this page, is
enough to know the change is coming and that there is a year to make it.

## Published versions of this contract

None. No version of this contract has been released, so there is nothing to list
and nothing has yet been promised under it. The list belongs here and is not
written by hand when it arrives: it is derived from what the tree carries, so a
version cannot appear on this page without existing and cannot exist without
appearing.

That derivation is not built, because it would have to read a register of
published versions that this tree does not carry yet. Issue #40 is where it is
owed, and it lands with the first release rather than ahead of one.
