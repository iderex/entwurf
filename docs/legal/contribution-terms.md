# Contribution terms

Read this before you open a change. It says what licence your work is made
available under, what you are certifying when you sign a commit off, and what
happens to a change that is offered to the upstream project under different
terms from the ones you contributed under. The last of those is the reason this
document exists as its own file rather than as a paragraph in the contributor
guide: it is the part a contributor has to be told before they write the code,
not after somebody has decided to send it somewhere else.

What this project declines to build is on its own page,
[`docs/not-for.md`](../not-for.md), and it belongs beside these terms rather than
only in the readme. It names the proposals that will not be accepted here and the
reason for each, and it says what the project does not promise. Reading it before
you write is the cheapest way to find out that a change was never going to land,
and finding that out afterwards is the expensive way.

## The licence your contribution is made under

AGPL-3.0-only, the licence of this repository. The full text is in
[`LICENSE`](../../LICENSE) and this document restates none of its terms.

The repository metadata reports the same licence under its older identifier:

    gh api repos/iderex/entwurf --jq '.license.spdx_id'
    AGPL-3.0

Run on 2026-08-08 UTC. `AGPL-3.0` and `AGPL-3.0-only` name one licence and one
text. There is no second licence here.

## The sign-off

Every commit carries a `Signed-off-by` line naming the commit's own author.
`git commit -s` adds one. What that line certifies is the Developer Certificate
of Origin 1.1, and the certificate is in [`DCO`](../../DCO) at the root of this
repository rather than summarised here.

Use a real name and a working address. The certificate's clause (d) says the
record of a contribution, including the personal information submitted with it,
is public and kept indefinitely, so a sign-off is not something a later request
can take back out of the history.

`.github/workflows/dco.yml` is the route that checks it. It runs on every pull
request, walks every non-merge commit in the range, and reds the check when a
commit's trailer does not match its author. Two things bound it. It exempts an
explicit list of GitHub's own bot identities, which cannot sign their own
commits. And it runs on a pull request only, so a commit that reaches the
default branch by some other route is never seen by it.

## What happens to work that goes upstream

This project's position is that a change belongs upstream first, and
[`docs/decisions/0002-upstream-relationship.md`](../decisions/0002-upstream-relationship.md)
is where that is argued and where the test for which side a change falls on is
written.

The upstream project is under a different licence:

    gh api repos/penpot/penpot --jq .license.spdx_id
    MPL-2.0

Run on 2026-08-08 UTC. AGPL-3.0-only and MPL-2.0 do not travel in both
directions. MPL-2.0 code can be combined into an AGPL work; code written here
under AGPL-3.0-only cannot be moved into the upstream tree as it stands.

**By contributing here you agree that your change may be offered to the upstream
project, under that project's licence and under its Developer Certificate of
Origin, with your sign-off carried with it.** If you are not willing for a change
to travel on those terms, say so in the issue before you write it, and it stays
here.

Two things follow from the direction of that friction, and they are how the
project intends to keep the choice off the individual patch:

- Work intended for upstream is written under MPL-2.0 from its first line,
  because relicensing it afterwards is a judgement call on every patch and one
  mistake that cannot be taken back.
- A file derived from the upstream tool keeps MPL-2.0, which is a fact about
  that file rather than a decision this project makes. MPL copyleft is per file
  and it travels with the file.

Nothing in the tree separates those two categories today. No file here is
derived from the upstream tool and nothing under `upstream/` is a copy of
upstream source, so the split holds by there being nothing yet for it to hold
apart. The header check that would enforce it is issue #64 and is not written.

## The upstream terms, quoted

Paraphrasing somebody else's terms is how a contributor ends up agreeing to a
summary. These are the terms themselves, fetched rather than remembered:

    gh api repos/penpot/penpot/contents/CONTRIBUTING.md --jq .sha
    63b931900f708de5a91bd21978097acf2a82c70c

    gh api repos/penpot/penpot/contents/CONTRIBUTING.md --jq .content \
      | base64 -d | sed -n '210,212p;239,240p;248p'
    ## Developer's Certificate of Origin (DCO)

    By submitting code you agree to and can certify the following:
    All code patches (**documentation is excluded**) must contain a sign-off line
    at the end of the commit body. Add it automatically with `git commit -s`.
    - The `Signed-off-by` line is **mandatory** and must match the commit author.

Run on 2026-08-08 UTC, against the blob whose sha is printed above. The full
certificate those lines introduce is the one reproduced in [`DCO`](../../DCO),
taken from the same fetch.

Upstream excludes documentation from its sign-off requirement. This repository
does not: the route described above walks every non-merge commit whatever it
touches, so a documentation-only change is signed off here even though the same
change would not have to be upstream.

## What no machine refuses here

Nothing reads this document and compares it against anything. The sign-off is
checked, and that is the whole of what is enforced on this page.

Nothing refuses a change whose author never read these terms, nothing checks
that a change offered upstream was one whose contributor agreed to that, and
nothing establishes that a file claiming MPL-2.0 is in fact derived from the
upstream tool or that a file claiming AGPL-3.0-only is not. The paragraph above
about the split is a position, not a mechanism, and issue #64 is where the
mechanism is owed.
