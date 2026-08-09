# The target gate, and what this project does with each part of it

The standard this project holds itself to is not invented here. It is the public
gate that iderex/jellyfin-plugin-sso already runs, and this milestone is about
reaching it on a project of a different shape rather than about designing a
standard from nothing. This page is the mapping: every part of that gate, and
what this project does with it.

It is derived from a fetch rather than from recollection, and the commands are
below so the next reader re-runs them instead of trusting this page.

## What was fetched, and when

Run 2026-08-09.

    gh api repos/iderex/jellyfin-plugin-sso/rulesets --jq '.[] | "\(.id)\t\(.name)"'
    18802863	Protect main and 5.0
    gh api repos/iderex/jellyfin-plugin-sso/rulesets/18802863 \
      --jq '[.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context] | join(", ")'
    build, ABI floor build, Package (JPRM) / Build package, Package (JPRM) / Generate SBOM, CodeQL, Analyze (csharp), DCO sign-off, Deterministic PR-hygiene checks, Enforce greppable invariants, Reject Trojan Source Unicode, Audit workflows (zizmor), prettier, dependency-review

Thirteen required contexts. That is the gate, and it is a better definition of it
than the workflow listing, which carries twenty four files and includes routes
that publish a release or run on a schedule:

    gh api repos/iderex/jellyfin-plugin-sso/contents/.github/workflows --jq '.[].name' | wc -l
    24

The routes that are not in the required set are not thereby out of scope for this
milestone, and they have a section of their own below. What the required set
settles is which of them the word gate covers.

The names on this side are check run names, and they are the ones
`docs/quality/check-names.md` lists. Nothing here names a check that page does
not.

## The thirteen required contexts

**build.** Adopted in a different tool. The target compiles a .NET solution; the
compile here is the TypeScript compiler with no emit, `check:types`, which runs
inside `unit-suite` rather than as a check run of its own.

**ABI floor build.** Not applicable. That job builds against the oldest host
application version the plugin supports, and nothing here is loaded into a host
application. The nearest constraint in this project is the pinned upstream
revision, which is a pin rather than a floor and is reported by
`corepack pnpm run upstream:revision`.

**Package (JPRM) / Build package.** Not adopted, and this is one of the three
entries below that fits none of the four states this document was asked for. The
counterpart is a container image an operator can run, which is #81 in the release
milestone rather than anything in this one.

**Package (JPRM) / Generate SBOM.** Adopted in a different tool, and not as a
check run. `check:bom` reads the resolved dependency set and regenerates
`docs/legal/bill-of-materials.md`, refusing a document this run would not
produce. It is a script a person runs before pushing; no workflow runs it, so it
is absent from the check names page for the same reason `check:locks` and
`check:notices` are.

**CodeQL** and **Analyze (csharp).** Adopted, same tool, different language.
Here it is `code-scanning`, over the TypeScript this tree carries, which is every
tracked source file in it. `docs/quality/code-scanning.md` is where the languages
it does not reach are named.

This project adds one thing the target does not have under this heading:
`code-scanning-proof` refuses the day the scanner stops finding a planted defect.
A scanner that reaches nothing prints what a scanner that reached everything and
found nothing prints, and the target has no equivalent assertion.

**DCO sign-off.** Adopted unchanged, under the same name.

**Deterministic PR-hygiene checks.** Not adopted, and no issue in this milestone
holds it. The target's route reasons about the pull request rather than the code:
that the body carries an issue reference, that every commit subject does, that a
version bump touches the changelog, and that commit messages stay inside an
explicit character set. Three of those four have no subject here, since this
repository has no changelog file and no version to bump. The one that transfers
is the issue reference, and the guide already carries that rule as one nothing
refuses.

**Enforce greppable invariants.** Adopted in a different tool. In the target this
is an Opengrep rule set; here it is `invariants`, a table in TypeScript with a
fixture per entry. The split matters for the next entry: in the target, one
workflow is both the invariant gate and the second analyser, and this project
runs them as two.

**Reject Trojan Source Unicode.** Adopted unchanged, under the same name.

**Audit workflows (zizmor).** Adopted unchanged, under the same name.

**prettier.** Not adopted, and the second of the three entries that fits none of
the four states. #4 holds it, and it is not blocked on the tool: it is blocked on
there being an overlay for its third condition to judge, which is written into
that issue.

**dependency-review.** Adopted unchanged, under the same name.

## The target's other routes, and where each one lands here

None of these is in the target's required set. Each is named because an issue in
this milestone traces to it, which is what the fifth condition of #72 asks for.

**opengrep.yml.** Adopted, same tool, split in two. In the target this one
workflow is both the greppable-invariant gate and the second analyser. Here the
invariants are `invariants` and the analyser is `second-analyser`, with
`second-analyser-proof` beside it asserting that the second lens still finds what
the first one does not, in both directions. #74 and #79 both trace to this one
entry, and both are closed.

**stryker-mutation.yml.** Not adopted. #75 holds it, and the tool for this
language is that issue's to name rather than this page's: naming one here would
make the decision instead of recording it. The target's own route is non-gating
by construction and reports surviving mutants rather than a score, which is the
shape #75 asks for.

**fuzz.yml.** Not adopted. #76 holds it. The target fuzzes a parse and validate
path with a coverage-guided harness on a weekly schedule and never on a pull
request. The surfaces this project would fuzz are named in #76 and most of them
do not exist in the tree yet.

**wiki-lint.yml.** Adopted in a different tool and against a different subject.
The target's wiki is a separate repository with no pull request gate, so its
route clones the live wiki and refuses broken anchors and dead source links.
This project's documents are in the tree, so the same class of defect is refused
by `document-lint` on every change instead. #78 traces here, and what is left in
it is written in the issue.

**The supply-chain posture across the target's workflows.** Adopted, and #77
holds what is left. Every action here is pinned by commit sha with a version
comment, `check:locks` refuses a lock file a resolve would rewrite, and
`check:pins` refuses a toolchain version that has drifted from the table. Signed
releases have no subject here yet.

**e2e-login.yml.** Not applicable to this milestone. It boots the real
application with the packaged artefact installed and drives login round trips.
The counterpart is the measurement harness in #15 and the upstream route in #98,
which are in other milestones and are not quality-parity work.

**perf-baseline.yml.** This is where the second condition of #72 changed. That
condition was answered once as this project carrying one obligation the target
does not have at all, a measured performance gate, and the target now carries a
performance route. It is not the same obligation. The target's is non-gating by
construction: it runs on a weekly schedule and on manual dispatch, archives its
output, and refuses nothing. #19 asks for a route that refuses a change making a
measured number worse, reading its thresholds from #18. So the entry this project
adds is not a performance measurement but a performance refusal, and nothing in
the target refuses one.

## What this project's gate carries that the target does not

**A proof that each analyser still reaches the code.** `code-scanning-proof` and
`second-analyser-proof` both fail in both directions: when the analyser stops
finding the planted defect, and, for the second, when the first analyser starts
finding it. #73 and #74 built them and both are closed.

**A refusal of a documentation defect.** `document-lint` refuses a backticked
path that resolves to nothing, a link whose target is not in this tree, an anchor
no heading carries, and a decision record departing from the convention. The
target's equivalent judges a wiki that sits outside its own repository and does
not gate a pull request.

**A refusal of a licence header.** `source-headers` refuses a source file that
declares no licence or declares one its location does not carry. This project
carries two licences by location and the target carries one, which is why the
check exists here and not there.

**A run on a machine carrying nothing.** `clean-machine` runs the guide's two
commands in a container holding the pinned runtime and nothing else, so the
guide's claim is executed rather than asserted.

**A performance refusal**, which is #19 and does not exist yet, argued in the
entry above.

**Architecture rules expressed as tests**, which is #80 and traces to nothing in
the target.

## Where every issue in this milestone lands

#72 is this page. #73 and #74 are the two analysers and their proofs, both
closed, and #79 is the invariant gate, closed. #75 traces to stryker-mutation.yml,
#76 to fuzz.yml, #77 to the supply-chain posture, #78 to wiki-lint.yml, and #80
to nothing in the target, which makes it an entry this project adds rather than
one it inherits.

No entry on this page has no issue behind it except the pull-request hygiene
route, which is named above as not adopted and not held.

## What this page cannot say yet

Three entries fit none of the four states #72 asks each one to be placed in.
Package (JPRM) / Build package, prettier and stryker-mutation.yml are not adopted
unchanged, not adopted in a different tool, not deliberately omitted, and not
inapplicable. Each is held by an open issue, which is a fifth state the condition
does not carry, and writing one of them down as any of the four would be false.
Two of the three would be settled by their issues rather than by anything on this
page.

The required set on this side is read by no run in this tree. It is quoted from a
command with the date it was run, in `docs/quality/check-names.md`, and so is the
target's. Both can be wrong without anything here going red.
