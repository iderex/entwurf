# What this project is not for

[NOTICE.md](../NOTICE.md) says the software is developed for lawful use, which is
a statement about an operator's obligations. This page is the other half: what
this project itself declines to build, and what it does not promise.

It states what this project does. It draws no conclusion about anyone's use and
passes no judgement on it. Where an entry says something will not be built here,
that is a decision about this project's own work and nothing more.

Saying it has a practical purpose beyond the legal one. It saves the same argument
being had repeatedly, and it tells somebody thinking about contributing what work
will not be accepted, before they write it rather than after.

## What will not be built here

**Anything whose purpose is to move design content off the host without the
operator knowing.** This is the entry the rest of the page exists for. A feature
that sends design content somewhere is not refused here; a feature that sends it
without the operator having decided to is. The difference is the test in record
[0011](decisions/0011-deliberate-federation.md), which requires such a feature to
be off by default, configured by the operator rather than by a user, visible while
it is on, named in the data protection statement, and disclosed in the interface
at the point data leaves. A proposal that cannot meet those five clauses is not a
proposal for a smaller version of the feature. It is the thing this entry
declines.

**Anything that makes the sovereignty claim conditional without saying so.** The
claim is that the design files live on your own hardware. If a change makes that
true only under some configuration, the claim has acquired a condition, and the
condition is written wherever the claim is written. What will not be accepted is
the change that keeps the sentence and adds the exception somewhere else, or keeps
the sentence and lets the exception be true. Record 0011 also refuses the smaller
version of this: a disclosure that already exists is never quietly made weaker.

**Telemetry.** No usage reporting, no crash reporting to this project, no
phone-home for version checks, and no analytics, however aggregated or anonymised.
The reason is not that any of those is wrong in general. It is that this project's
argument is about what leaves a machine, and an argument with an exception for the
project's own convenience is not an argument. Issue #68 is where the absence is
proved rather than asserted.

**Any feature that requires this project to hold an operator's design data.**
Anything shaped so that it only works if the data passes through infrastructure
this project runs is outside what this project builds, because running that
infrastructure is not something this project does.

**A second, incompatible plugin API.** Record
[0009](decisions/0009-plugin-contract.md) makes the plugin surface a superset of
the upstream one, and a plugin written against upstream runs here. A proposal that
would fork the plugin surface is declined for the reason recorded there: it would
ask an author to choose which of two to write against, and the ecosystem this
project can least afford to divide is the one it does not control.

**A rendering path that replaces the upstream engine rather than improving it.**
Record [0006](decisions/0006-rendering-path.md) fixes that decision with its
alternatives and their costs. This entry is here because "rewrite the renderer" is
a proposal this project will receive, and the answer is written down rather than
argued each time.

**A hard fork of the upstream project, other than under the recorded condition.**
Record [0002](decisions/0002-upstream-relationship.md) names the two things that
would have to hold at once, and requires them to be written down with their
evidence before any code moves.

**Work that cannot carry the evidence this project's own rules require.** A change
asserting a performance improvement without the harness behind it, a number
without the command that produced it, or a guard without a proof that it bites, is
not accepted here regardless of whether the underlying idea is good. That is a
standard applied to this project's own work first.

## What this project does not promise

**It is not a hosted service.** Nobody here runs an instance for anyone. There is
no sign-up, no account, and nothing to log in to that this project operates.

**There is no availability guarantee, and there is nothing for one to attach to.**
Uptime, response times and recovery of an operator's deployment are the operator's,
because the deployment is theirs.

**There is no support commitment.** Issues are read and answered as the work
allows. Nothing here is a service level, and nothing about the speed of a past
answer is a commitment about the next one.

**There is no guarantee that work offered upstream is accepted.** Record 0002
sends changes upstream first and states plainly that a project is entitled to
decline work it does not want to maintain. Where that happens, the change lives in
the overlay and the decline is recorded, which is the ordinary case rather than a
failure.

**There is no promise about the size of the plugin ecosystem.**
[plugins/](plugins/) says what that means for an author, and why there is no target
number.

**There is no warranty.** That belongs to the licence, and the licence is now in
the tree:

    git ls-files | grep -ix 'licen[cs]e\(\.md\|\.txt\)\?'
    LICENSE

It is AGPL-3.0-only, and sections 15 and 16 of it are where the disclaimer of
warranty and the limitation of liability are written. Read them there rather
than here, because a summary of a warranty disclaimer is the one kind of summary
nobody should rely on.

## How an entry gets added here

An entry is added when the same proposal has been declined twice, or when a
decision record produces a limit that somebody reading only the readme would not
find. It carries the reason and, where a record settles it, the link to that
record rather than a restatement of its argument.

An entry is removed when the decision behind it changes, and the change is argued
in the record it came from rather than here.
