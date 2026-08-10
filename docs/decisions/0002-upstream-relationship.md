# 0002. The relationship to the upstream project, and where the code lands

Status: accepted.
Issue: #2.

## The position

Work is offered upstream first. What upstream will not take, or has no reason to
take, lives here as a thin tracked overlay on a pinned upstream revision. There
is no hard fork unless the condition written at the end of this file is reached
and the reaching of it is recorded here before any code moves.

## Why not start clean

The gap this project exists to close sits on top of a design tool that already
has a GPU render engine, grids, design tokens, variants and file history.
Rebuilding those to reach the same starting line produces nothing that does not
already exist, and it throws away the plugin surface the ecosystem work depends
on. Starting clean is rejected here so that no later issue has to re-argue it.

## The three options and what each one costs

Upstream first buys the one thing a fork cannot. The work keeps running after
this project stops paying attention to it, and every operator of the upstream
tool gets the improvement rather than only the people who found this repository.
It costs control of when a change lands, and it costs some changes outright,
because a project is entitled to decline work it does not want to maintain.

The overlay is what is left over. Some changes are refused upstream, some are
accepted slowly, and some are specific to how this project is packaged and have
no business upstream at all. Keeping them here costs maintenance forever: every
change held out of upstream is a change this repository carries through every
future upstream release, and the overlay grows unless something pushes back on
it. The size limit below is that push.

A hard fork buys total control and costs the entire upstream stream of fixes,
security work and features. For a codebase of this size that is not a trade this
project can win, which is why it is written here as a failure mode with a named
condition rather than as an option with a cost.

## The test that decides where a change goes

Applied to one specific change, in this order, and answerable without asking
anyone.

1. Would the change be correct for an operator of the upstream tool who has
   never heard of this project, with no reference to this project's packaging,
   naming, defaults or measurement work? If yes, it is offered upstream.
2. Does it depend on something only this repository has, such as the measurement
   harness, the generated corpus, the registry or this project's own
   configuration surface? If yes, it belongs to the overlay.
3. Does it change a default that the upstream project appears to have chosen
   deliberately, rather than fixing something the upstream project would call
   wrong? If yes, it belongs to the overlay, and the change carries the sentence
   saying which default it moves and why.

Where more than one answer survives, the change is offered upstream first. That
tie-break is deliberate and it is not neutral: an offer that is declined costs
one round trip, and a change kept back costs maintenance for as long as the
project exists. The rejection is what tells us the change belongs in the
overlay, so the overlay entry can name it.

A change that goes to the overlay after being declined records what was offered
and what came back. A change that goes to the overlay without being offered
records which of the three questions sent it there.

## How large the overlay may get

The overlay lives under `overlay/` as changes applied to the pinned upstream
revision, and its size is a number rather than a judgement:

    git ls-files overlay/ | wc -l

At the revision this record lands on that prints `0`, because nothing has been
written into the overlay yet. The command that reports changed files and changed
lines together is the one issue #10 delivers along with the replay, and this
record is what that command reads its limit from.

The limit is 30 changed files and 1500 changed lines.

That number is chosen rather than measured, and saying so is the point. What
makes it real is the response rather than its precision. When a change would put
the overlay past either half of the limit, the change does not land until one of
three things has happened: something already in the overlay has been offered
upstream and accepted, something already in the overlay has been deleted with the
reason recorded, or this record has been amended to a new number with the
argument for it. Amending it is allowed. Amending it silently is not, and
amending it twice in succession without anything having gone upstream in between
is the signal that the upstream-first position is not holding.

The first two replays are also a measurement of this number. If they show 30 and
1500 to be the wrong size in either direction, this record is amended and the
original number stays visible in the amendment.

## When a hard fork would become the right answer

Both of these hold at once, and both are written into this file, with their
evidence, before any code moves:

- The overlay has stayed above its limit across two consecutive upstream
  releases, and no route back under the limit exists that does not delete
  something the project needs.
- A change the project cannot ship without has been declined upstream on grounds
  that would apply equally to any future version of that change, so that
  reworking and re-offering it is not a path.

One of the two on its own is not the condition. An overlay over its limit is a
prompt to go and get changes accepted upstream, and a single declined change is
the ordinary case that the overlay exists for.

## Licence and contribution terms of work that goes upstream

A change offered upstream travels under the upstream project's licence and
contribution terms, whatever this repository's own licence turns out to be. The
upstream project is MPL-2.0 and takes contributions under a Developer Certificate
of Origin rather than a contributor licence agreement:

    gh api repos/penpot/penpot --jq .license.spdx_id
    MPL-2.0
    gh api repos/penpot/penpot/contents/CONTRIBUTING.md --jq .content | base64 -d | grep -i "certificate of origin"

Both were run on 2026-08-06 UTC.

This has two consequences worth stating rather than discovering later. Signing
off a change offered upstream is an assertion made under the upstream project's
terms, by the person making it. And this repository's own licence, which is not
yet chosen and is entry 1 of issue #89, governs how easily code moves in the
other direction, from here into upstream. It does not govern the direction
described in this paragraph, because that direction is settled by the upstream
project.

## What no machine refuses today

Nothing in this tree enforces any of the above, and one fact explains all of it:
there is nothing yet for a rule to be about.

    git ls-files overlay/ | wc -l
    0

The three-question test is applied by a person before a change is written, and no
reading of the tree separates a change that was put through it from one that was
not. The limit of 30 changed files and 1500 changed lines has nothing to measure,
and the command that would measure it arrives with the replay in issue #10. The
hard-fork condition turns on two consecutive upstream releases and on what came
back from an offer, neither of which is a fact this tree holds.

One thing here is refused rather than trusted, and it is the smallest of them.
`overlay/` is declared in the register of paths this tree intends to carry and
does not carry yet, which `check:docs` fails closed in both directions: a
document may name the directory before it exists, and the entry may not outlive
the absence it describes.

## What this record does not decide

It does not decide this repository's licence, which is issue #64 and is blocked
on entry 1 of issue #89. It does not decide the mechanics of the replay, the
pinning or the drift report, which are issue #10. It does not name a pinned
upstream revision, because the pin is created by the skeleton work and is a fact
of the tree rather than of this decision.
