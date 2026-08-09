# The check names, and which of them the default branch requires

A ruleset requires a check by its literal name. Nothing resolves a renamed check
to the rule that used to name it, and nothing reports that a required name has
stopped matching anything: the rule goes on being listed, the check goes on
running under its new name, and the branch is protected by a string that matches
no check run. So the name is the thing that has to hold still, and this page is
where a reader is sent when they ask what has to pass.

One entry per job in `.github/workflows/`, because that is what produces a check
run. Where a job sets `name:`, that is the name; where it does not, the name is
the job id. Several workflows keep the two identical on purpose, so a rule naming
either one keeps matching.

## The commands behind this page

What the server reported on one commit, taken on the head of the pull request
that produced the merge on the default branch rather than on the merge itself,
because two of these run on a pull request and on nothing else. Run 2026-08-09:

    gh api repos/iderex/entwurf/pulls/119 --jq .head.sha
    f0f74f92d6ca374582562e3353070f632518768f
    gh api repos/iderex/entwurf/commits/f0f74f92d6ca374582562e3353070f632518768f/check-runs \
      --jq '.check_runs[].name' | sort -u

What the default branch requires. This is the command the list below is measured
against, and it is the one to re-run rather than to trust this page for:

    gh api repos/iderex/entwurf/rulesets --jq '.[] | select(.name == "gate") | .id'
    20487962
    gh api repos/iderex/entwurf/rulesets/20487962 \
      --jq '[.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context] | sort[]'
    Audit workflows (zizmor)
    DCO sign-off
    Reject Trojan Source Unicode
    clean-machine
    code-scanning
    code-scanning-proof
    dependency-review
    invariants
    source-headers
    unit-suite

Ten names, run 2026-08-09. Fourteen jobs declare a name in this tree, so four of
them are not required, and each says so in its own entry below.

## Required by the default branch

### `unit-suite`

Refuses a failing unit test and a coverage figure under the floor, on a runner
with no display, no GPU and no browser driver. It is `check:types` and
`corepack pnpm test`, and the machine it runs on is the evidence for the headless
rule rather than an assertion about it.

### `invariants`

Refuses a tracked text file carrying one of the string facts this tree holds
against: a credential shape, a path under somebody's home directory, a backticked
check name nothing declares, a duration quoted with no spread beside it, a check
name that would move on its own, and a check name this page does not list. It is
`check:invariants`, the table is in `tools/src/checks/invariants.ts`, and every
run prints each entry with the failure it prevents and the bound on what it
reaches.

### `source-headers`

Refuses a source file that declares no licence, one that declares a licence its
location does not carry, and one sitting where no rule says which licence
applies. It is `check:headers`.

### `code-scanning`

CodeQL over the code this tree carries, which is TypeScript and nothing else
today, with the results uploaded where a reader looks for them.
`docs/quality/code-scanning.md` is where the languages it does not reach are
named.

### `code-scanning-proof`

Refuses the day the scanner stops finding the planted defect in
`tests/fixtures/code-scanning/`. A scanner that reaches nothing prints what a
scanner that reached everything and found nothing prints, so the first job going
green is not evidence that it read anything.

### `dependency-review`

Refuses a newly introduced or upgraded dependency carrying a known vulnerability,
and one under a licence this repository may not combine into a distributed work.
`docs/quality/dependency-licences.md` is where that list is argued.

### `DCO sign-off`

Refuses a non-merge commit in a pull request with no `Signed-off-by:` trailer
matching its author. It is the enforced half of
`docs/legal/contribution-terms.md`, and the certificate itself is `DCO` at the
root.

### `Reject Trojan Source Unicode`

Refuses a bidirectional override, isolate or mark, and a zero-width character, in
tracked text. Those are the characters that make a file render differently from
how it runs, which is a defect a reviewer cannot see by reading.

### `Audit workflows (zizmor)`

Refuses an actionable security finding in the workflow files themselves, which
are the most privileged code in this tree. Workflow YAML here asks for write
scopes and runs on pull requests from any branch, so it is audited like any other
code.

### `clean-machine`

Refuses the day the contributor guide's claim stops holding: that a fresh clone
on a machine carrying nothing beyond the pinned Node runtime reaches a working
environment with one command and runs the suite with a second. The machine is a
container rather than a hosted runner image, and the step before the install
refuses the run if it finds a display, a display server socket or a GPU device
node.

## Not required by the default branch

Each of these produces a check run and none of them is in the required set above.
Adding one is a change to the repository settings rather than to this tree, so
this page reports the gap rather than closing it, and issue #8 is where it is
held.

### `document-lint`

Refuses a backticked path in a tracked document that resolves to nothing, a link
whose target is not in this tree, an anchor no heading carries, a decision record
departing from the convention `docs/decisions/0001-means.md` states, and two
records claiming one number. It is `check:docs`. It runs on every pull request
and is not required.

### `second-analyser`

Refuses what the rules in `tools/opengrep/rules.yml` match, which is a second
lens on the same code rather than a second copy of the first analyser: this one
matches syntax as written and follows taint inside a function. It runs on every
pull request and is not required.

### `second-analyser-proof`

Refuses in both directions: the day the second analyser stops finding the file in
`tests/fixtures/second-analyser/` that the first one does not find, and the day
the first one starts finding it. Either way the fixture has stopped proving what
it was written for. It runs on every pull request and is not required.

### `Scorecard analysis`

Publishes a supply-chain hygiene score and uploads the findings. It cannot be
required, which is a different case from the three above: it declares no
`pull_request` trigger, and a name a pull request never produces would leave every
pull request waiting for a check that is not coming.

## Two names on a commit that no job here declares

The command above prints two names this page gives no entry, and they are not an
omission. `CodeQL` and `zizmor` are added by the code scanning service when a
result set is uploaded under a tool's name, so nothing in this tree writes either
string and no run here can compare them against anything. They are named here so
that a reader counting the names on a commit against the entries below does not
read the difference as drift.

`Reject Trojan Source Unicode` also appears twice on a pull request head, once
for the push and once for the pull request, because that workflow declares both
triggers. Two runs, one name.

## What a run refuses about this page, and what it does not

Two of the invariants in `check:invariants` are about this page.

The first refuses a check name that would move on its own: one carrying a
version, a date, or an expression the runner substitutes per matrix leg. Any of
the three empties the required set silently rather than failing, because the
ruleset goes on requiring the string it was given.

The second refuses drift between this page and the workflows, in both directions.
A job whose name has no entry here is refused, so a check cannot be added or
renamed without this page moving with it, and the refusal survives this page
being deleted, since a page that is not there gives no entry to anything. An
entry naming something no job declares is refused too, so an entry cannot outlive
its check.

What neither of them reaches is the required set. The ruleset is not in this
tree; reading it takes the network and a credential, which no check here has. So
the ten names above are quoted from a command with the date it was run, and a
reader who needs to know what is required today runs it again rather than
trusting this page. That is the reason issue #8 stays open with the four names in
the second section, and it is the part of this page that can be wrong without
anything going red.
