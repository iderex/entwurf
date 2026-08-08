# Dependency licences

This repository is AGPL-3.0-only. That answer was recorded against the first
entry of issue #89 and the tree now carries the file:

    gh api repos/iderex/entwurf --jq '.license.spdx_id'
    AGPL-3.0

A licence decides something downstream of itself. Whatever is built here is
distributed as one work, so the terms a dependency arrives under are terms this
project takes on, and the moment to notice them is the change that introduces
the dependency rather than the release that ships it.

## Where the list is

In `.github/workflows/dependency-review.yml`, as the input the action reads,
with the reason for each group written beside it.

It is not repeated here. Two copies of a list drift, and the copy a reader
finds first would be this one while the copy that decides anything is the other
one. Read it there.

## What the list is, and what it is not

It is the set this project can distribute a combined work under without anybody
having to think about it again.

It is not a ruling that everything absent from it is incompatible. A great many
licences are compatible with AGPL-3.0-only in the direction that matters here
and are still not on the list, because compatibility in the general case and a
question already settled for this tree are different things. A dependency
arriving under a licence the list does not name stops the change and waits for a
person. That is the direction a licence gate should fail in, and it is the only
direction in which the list being wrong is cheap.

## What refuses one

The check is the `dependency-review` job, which runs on every pull request. It
asks the dependency graph for the difference between the base and the head of
the pull request, and judges what that difference adds.

Two consequences follow from the shape of it rather than from anything written
here. A pull request that changes no dependency gives the job nothing to judge,
and it passes having judged nothing. And a dependency already present before the
pull request is not in the difference, so this check is a gate on arrival and
never an audit of what is already installed.

## The proof that it bites

Three runs on one branch, each differing from its neighbour by one thing. The
near miss is caniuse-lite, which is CC-BY-4.0, is content rather than code, and
is the package that arrives as a transitive dependency of browserslist in trees
nobody chose it for.

With the list in place and the dependency planted, the job is red and names
what it refused:

    gh run view 31274755102 --repo iderex/entwurf --log
    ##[group]Licenses
    The following dependencies have incompatible licenses:
    pnpm-lock.yaml » caniuse-lite@1.0.30001809 – License: CC-BY-4.0
    ##[error]Dependency review detected incompatible licenses.

With the same dependency planted and the list taken out, the job is green and
the licence group is empty:

    gh run view 31274902070 --repo iderex/entwurf --log
    ##[group]Vulnerabilities
    Dependency review did not detect any vulnerable packages with severity level "low" or higher.
    ##[group]Licenses
    ##[group]Dependency Changes
    + caniuse-lite@1.0.30001809

So the refusal comes from the accepted list and not from the severity floor, the
scorecard step or anything else in the job. The dependency was planted for these
runs and removed before the branch merged, so it is in the history of the branch
and in no manifest the default branch carries.

A third run sits between those two and is about a different line, and it is in
the section below because what it measured was that a change made no difference.

## What this does not reach

A dependency whose licence the graph cannot determine is printed and is not
refused. That is the action's own behaviour at the commit this workflow pins: a
forbidden licence and a licence that does not parse as SPDX both fail the run,
and the undetermined ones are printed under a heading and nothing more.

    gh api "repos/actions/dependency-review-action/contents/src/main.ts?ref=a1d282b36b6f3519aa1f3fc636f609c47dddb294" --jq .content | base64 -d | sed -n '360,371p'
        if (invalidLicenseChanges.unresolved.length > 0) {
          issueFound = true
          core.warning(
            '\nThe validity of the licenses of the dependencies below could not be determined. Ensure that they are valid SPDX licenses:'
          )
          printLicensesError(invalidLicenseChanges.unresolved)
          core.setFailed(
            'Dependency review could not detect the validity of all licenses.'
          )
        }
        printNullLicenses(invalidLicenseChanges.unlicensed)

So this gate discloses the undetermined case and does not refuse it. The
refusal there is asked of the bill of materials generator instead, in issue #65,
which is open.

It judges the licence string the dependency graph carries for a package, which
is a reading of that package's metadata. Whether the licence a package declares
is the licence its files actually carry is a judgement, and no run here makes
it. The asset register has the same bound written into `check:assets` for the
same reason.

It reaches this repository's own dependency graph. The bill of materials in #65
and the body of #77 both speak of three ecosystems plus a rendering library,
and those belong to the pinned upstream revision, which nothing here fetches:

    git ls-tree -r --name-only origin/main | grep '^upstream/'
    upstream/README.md
    upstream/pin.json

Nothing in any run above is evidence about them.

## A claim that was checked and turned out to be wrong

The action filters the dependency difference by scope before it runs either
check, and its default is the runtime scope alone. Every dependency this
repository declares is a development dependency, which reads like a gate that
has been examining nothing since it landed. A line naming both scopes was
written on that reasoning.

It was measured, and the reasoning was wrong. With that line removed and
everything else held still, the run refused the planted dependency exactly as
the run before it had:

    gh run view 31274820291 --repo iderex/entwurf --log
    pnpm-lock.yaml » caniuse-lite@1.0.30001809 – License: CC-BY-4.0
    ##[error]Dependency review detected incompatible licenses.

The dependency graph reports this repository's development dependencies under
the runtime scope, so the default was already reaching them. The line changed no
verdict, and a line that changes no verdict is not a guard. It is not in the
workflow.

What that leaves is a dependency on how the graph classifies a manifest, which
is somebody else's behaviour and is not pinned by anything here. If it changes,
this gate goes quiet rather than red, and the run that would say so is one where
a planted dependency is expected to be refused and is not.
