# 0011. What deliberate federation would have to mean

Status: accepted.
Issue: #67.

## What this record decides and what it does not

**It decides nothing about whether federation is ever built.** That is held open
on the tracker as a decision this plan does not make for itself, and nothing here
should be read as an argument for or against it. This record is written first
precisely so that the word cannot be defined later by whoever wants to use it.

**It decides what the word has to mean if it is ever used.** The sovereignty claim
in the readme is unconditional today: the design files live on your own hardware,
with no clause after it. The moment federation is permitted at all, that sentence
acquires a hinge, along the lines of "unless the operator deliberately federates",
and an unspecified hinge is one every future integration will claim to sit behind.
The test below exists so that the hinge is specified before there is any pressure
to widen it.

That the claim carries no such clause today is a fact of the tree rather than a
recollection:

    git grep -n -i 'federat' -- '*.md'

That printed nothing at the revision this record branches from, so this record is
the first file in the tree to contain the word, and it contains no feature.

## The test

A feature is deliberate federation only if all five hold. Failing any one of them
means the feature is not deliberate federation. It does not mean the feature is
something else with a softer name: it means the feature does not meet this test
and may not be described as being behind the hinge.

**1. Off by default.** Not "off in the recommended configuration", not "off unless
a template turns it on", and not "off in the container but on in the compose
example". A fresh install with no configuration does not federate, and the default
is what an operator gets by doing nothing.

**2. Configured by the operator, not by a user.** The setting lives where the
operator administers the deployment. A designer working in the tool cannot turn it
on for themselves, cannot turn it on for their team, and cannot turn it on by
accepting a dialog. The reason is that the operator is the party who knows what
the organisation has agreed to, and a per-user switch moves that decision to
somebody who does not.

**3. Visible while it is on.** Not discoverable, visible. Someone using the tool
can tell, without going to look, that this deployment federates. A feature whose
only trace is a configuration file the designer cannot read fails this, and so
does one whose indication appears once at sign-in and never again.

**4. Named in the data protection statement.** Every federating feature appears
there by name, saying what leaves the host, where it goes, and who controls the
destination. Issue #66 writes that statement, and this clause is a standing
requirement on it rather than a one-time addition: a federating feature added
later that is not named there has not met this test, whatever else it does.

**5. Disclosing in the interface at the point data leaves.** Section below, because
it is the clause most likely to be met in name only.

## What the interface disclosure has to say

The disclosure is at the point the data leaves, not only in a settings page, and
it says four things:

- **What is leaving**, in the vocabulary of the design rather than of the
  transport. "This library's components and their contents", not "the selected
  entities".
- **Where it is going**, as a host or organisation name the person can recognise,
  not a service description. If the destination is not nameable at the moment of
  the disclosure, the feature does not pass, because a person cannot consent to an
  unnamed party.
- **Who controls the destination.** Specifically whether it is the same operator,
  a different organisation, or a third party, because those are three different
  answers to the question the person is actually asking.
- **What the operator has decided about it**, meaning that this is on because the
  operator turned it on, so the person knows who to ask rather than assuming the
  tool did it by itself.

What it may not do: appear only in a log, appear only in documentation, appear
once and be dismissed permanently for a feature that keeps sending, or be phrased
so that a person who reads it quickly comes away thinking nothing left the host.

**A disclosure is never quietly downgraded.** If a later change makes a
disclosure weaker, that is a change to this record and it is argued here. This is
the specific failure this clause is written against, because a disclosure is the
part of a feature with no user asking for it and constant pressure to make it
smaller.

## What may never be federated, whatever the operator configures

**Nothing is in that category, and the reason is that the alternative would be
dishonest.**

This is the answer the issue permits as an alternative to a list, and it is chosen
rather than settled for. A category of data that may never leave the host would
have to be enforced, not described. The enforcement would have to sit in a place
the operator cannot reach, and the operator runs the software on their own
hardware and can change it, which is the whole point of the position this project
takes. So a "never" written here would be a sentence that describes an intention
while the deployment does whatever its operator has configured, and this project's
own rule is that a sentence in a document is not a rule.

The honest version is the one above: the operator decides, and every decision they
make is visible to the people affected by it, by clauses 3, 4 and 5. That is a
disclosure guarantee rather than a data guarantee, and it is the one this project
can actually keep.

**Two things follow from that and are stated so the paragraph is not read as
permission.** First, this record grants nothing. It defines a test; whether any
federating feature exists at all is still open on the tracker. Second, if this
project ever does adopt a never-category, it arrives with the mechanism that
refuses the violation, and an amendment here saying what that mechanism is. A
never-category added as prose would be worse than what this section says now,
because it would read as a guarantee to somebody who did not check.

## A plugin reaching the network is governed by this record

A plugin that sends design content to a network destination is design content
leaving the host, and it does not stop being that because a third party wrote the
code that sent it. So the five clauses apply to it as they apply to a feature this
project builds.

Two consequences worth writing down rather than deriving later.

The permission that lets a plugin reach the network is an operator setting under
clause 2, so a model in which the installing user alone can grant it does not meet
this test. Whether the user may grant within a ceiling the operator sets is a
different question and is compatible with clause 2, because the operator's
decision still bounds it.

The disclosure under clause 5 names the plugin and its destination, not just "a
plugin". A person told that some plugin is sending something somewhere has been
told nothing they can act on.

Issue #42 decides the permission model and issue #44 decides what a plugin may
reach on the network with the default off. Neither is decided here. What is
decided here is that whatever they land on has to satisfy the five clauses, and a
permission model that cannot express them has not met this record.

## What no machine refuses today

The five clauses are a test applied to a feature, and there is no feature here to
apply them to. Nothing in this tree federates, discloses or holds an operator
setting, so every clause is a position and the test is one a person runs.

The record already says what the exception would look like: a never-category
arrives with the mechanism that refuses the violation and an amendment here
naming it. The same holds for the clauses. The earliest thing that could carry
one is the check in the fifth condition of issue #42, which reads the contract
source rather than a running plugin, and it waits on a contract source this tree
does not have.

## What this record does not decide

It does not decide whether any federating feature is ever built, which is held on
the tracker.

It does not decide the wording of the data protection statement, which is issue
#66. It places one standing requirement on it.

It does not decide the plugin permission model or the plugin network default,
which are issues #42 and #44.

It does not decide what happens to history when a person asks for their data to be
removed, which is issue #37, though a federating feature makes that question
harder and this record does not soften it.
