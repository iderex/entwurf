# Code scanning: what is scanned, and what is not

A scanner that reaches nothing prints the same green tick as one that reaches
everything and finds nothing. This page is the difference between the two. It
says which languages this tree carries, which of them are scanned, what stands in
place of a scanner where nothing scans, and what the gate does not reach even
where it runs.

## What runs

CodeQL, on every pull request and on every push to the default branch, from
`.github/workflows/code-scanning.yml`. Two jobs, under two check names, asking
two different questions.

`code-scanning` asks what is wrong with this repository. Its results go to the
code-scanning tab rather than only into a workflow log, which is the point of
uploading them: a finding nobody opens a log to read is a finding nobody has.

`code-scanning-proof` asks whether the scanner can see this repository at all.
That is not the same question, and the first job going green does not answer it,
which is what the next section is about.

Each job id is also its check name, and there is no matrix, so the name a rule or
a reader knows does not move when a second language arrives. That convention is
the one the unit suite and the invariants gate already use.

## Which languages this tree carries

Derived rather than asserted. The languages check reads the extension of every
tracked path and prints what it found:

    node tools/src/check-languages.ts
    examined 71 tracked path(s) by extension: typescript (36); 35 path(s) carry an extension this check does not classify and were NOT judged.
    languages named by tools/toolchains.json: clojure, clojurescript, rust, typescript

That is the runner the `check:languages` script executes. It is run directly here
because the script refuses under a Node other than the pinned one, and the
classification it produces is a fact about the tree rather than about the runtime
it was produced under.

Two numbers in that line matter. Every tracked source file in this repository is
TypeScript. And thirty-five paths carry an extension the check declines to
classify, which is the Markdown, the JSON, the YAML, the lock file and the
ignore file.

## Language by language

**TypeScript.** Scanned by CodeQL, which is what the workflow named above runs.
Every tracked path with a TypeScript or JavaScript extension is handed to it, and
the run prints that list before the scan.

**GitHub Actions workflows.** Not scanned by CodeQL here, and something else
stands in its place: the workflow audit in `.github/workflows/zizmor.yml`, which
fails the build on any actionable finding and uploads the same set to the
code-scanning tab. That is the reason CodeQL is not also pointed at the workflow
files. It is not the whole reason, and the other half is worth writing down: the
only way to prove a workflow scanner reaches this tree is to commit a deliberately
unsafe workflow, and that same file would be refused by the audit that already
runs. A fixture that cannot be committed cannot prove anything, so this surface is
held by one scanner rather than by two.

**Clojure and ClojureScript.** No tracked file in this tree is written in either,
which the count above is the evidence for. They are named in
`tools/toolchains.json` because that table records the upstream project's
toolchain rather than this repository's contents. If a file in either language
ever lands here, nothing scans it and nothing stands in its place: CodeQL does not
support either language. That is an absence rather than a plan, and it is written
here so it is not discovered later.

**Rust.** The same, with one difference. No tracked file in this tree is written
in it, and were one to arrive, CodeQL does support the language, so the repair
would be to add it to the workflow rather than to accept a gap. Nothing scans it
today because there is nothing to scan.

**Markdown, JSON, YAML and the ignore file.** Not code, not scanned, and nothing
stands in place of a scanner because a scanner is not the right instrument. What
does judge them is narrower and is described elsewhere: `check:invariants` refuses
a set of string facts in tracked text, and it prints its own bound on every run.

## The fixture, and how the proof is made a verdict

`tests/fixtures/code-scanning/typescript/path-injection.ts` is a deliberately
vulnerable file. A request arrives, the path it asks for is handed to the file
system exactly as it was received, and nothing resolves it against a root first.
It is the proof that the scanner is reaching this repository's code rather than
passing over an empty set.

The flow in it is direct, from the request straight into the read, and that is a
correction rather than a first draft. The first version took the file name out of
the query string, which is the more realistic shape, and the scanner did not
follow it: the run evaluated the query that judges this and reported nothing. A
fixture whose own flow the scanner cannot see proves the opposite of what it was
written for. This is worth knowing beyond this file, because it is the bound in
the sharpest form available: what the scanner finds is what its queries model, and
a real defect written the way the first version was written would have gone past
it in silence.

The fixture is excluded from the analysis that uploads, and scanned on its own by
`code-scanning-proof`, which uploads nothing and fails when the planted
vulnerability is not found. That arrangement was arrived at rather than designed,
and the reason is worth having in writing.

Left inside the uploaded analysis, the fixture does raise a real alert. It was
tried that way. The alert is filed against this repository, it stays open for as
long as the fixture exists, and it reds the code-scanning check on every pull
request that follows, so the cost of the proof is paid by everybody who opens a
change afterwards. Worse than the noise is what it does to the proof itself: it
becomes a thing somebody has to go and look at. Nothing fails when it stops being
there.

Scanned separately, the same fixture answers the same question and the answer is
a verdict. The proof job reads the result file, counts the results for the query
that finds this, and refuses on zero, saying that a zero means the instrument is
not reading rather than that the tree is clean. The day the scanner stops finding
the fixture, that job goes red and names the causes that produce a zero.

## The filter that made the proof wrong, and what it still does to the other job

On a pull request the action computes the changed ranges and reports only results
inside them. It says so in its own log:

    gh run view 31261841784 --repo iderex/entwurf --log | grep -E "Persisted .* diff range|result\(s\) for js/path-injection"
    Computing PR diff ranges...
    Persisted 7 diff range(s) across 6 file(s).
    sarif-results/javascript.sarif: 0 result(s) for js/path-injection

That was a pull request about an asset register. It changed six files, none of
them the fixture, so the fixture's alert was filtered out and the proof job read
the silence as a scanner that had stopped reading. The same fixture, in the same
tree, on a pull request that edited it, and on the push that followed the merge:

    gh run view 31254469335 --repo iderex/entwurf --log | grep -E "Persisted .* diff range|result\(s\) for js/path-injection"
    Computing PR diff ranges...
    Persisted 3 diff range(s) across 3 file(s).
    sarif-results/javascript.sarif: 1 result(s) for js/path-injection

    gh run view 31254801308 --repo iderex/entwurf --log | grep -E "Computing PR diff ranges|result\(s\) for js/path-injection"
    sarif-results/javascript.sarif: 1 result(s) for js/path-injection

So the proof was green on the two cases nobody needed it for and red on the one
everybody else would meet. The proof job now sets
`CODEQL_ACTION_DIFF_INFORMED_QUERIES` to false, next to the reason, and its own
assertion is what proves the setting took effect: on a pull request whose diff
excludes the fixture, a count of one is only reachable with the filter off.

The other job keeps the filter, and that is deliberate rather than an oversight.
An alert about code a change did not touch is noise on that change. But it decides
what a green tick there covers, and that is worth stating plainly rather than
leaving to be inferred:

**On a pull request, `code-scanning` reports findings in the changed ranges. It
is not a scan of the tree.** A defect elsewhere in the repository does not appear
on the pull request that happens to be open, and a green tick there is not
evidence that the rest of the tree is clean.

**On a push to the default branch, no diff is computed and the whole offered set
is analysed.** That run is the one whose green tick is a statement about the tree,
and it is the run whose findings reach the code-scanning tab as the current state.

The exclusion has a cost and it is stated rather than buried. Nothing under
`tests/fixtures/code-scanning/` is covered by the analysis that uploads, so real
code put there would not be scanned by it. The directory holds fixtures and the
proof job scans it, but the direction of that exclusion is worth knowing before
somebody puts something else there.

Nothing imports the fixture, no test loads it, no build includes it, and the
server it constructs is never told to listen. The unit suite runs only the tests
under `tests/unit/`, and coverage is measured only over `tools/src/`, so the file
is outside both. The type checker is the one route that reads it, which is why it
compiles.

## What this gate does not reach

**It does not prove the scan covered a path.** The run prints the set of paths it
offers the scanner, and the scanner decides for itself what it extracts from that
set, so a printed path is not by itself an analysed one. The direction that does
hold is the useful one: a path absent from that list was not scanned.

**It does not fail the build.** No ruleset on the default branch requires any
check today, so a finding here blocks nothing on its own. Issue #8 is where a
check gets put in front of the default branch, and until that lands this gate
reports rather than refuses.

**It finds what its queries look for and nothing else.** A clean run is a
statement about the query set that ran, not about the code being free of defects.

**It is one lens.** One tool's blind spot is not visible from inside that tool.
There is a second analyser now, and the rest of this page is about it.

## The second analyser

Opengrep, on every pull request and on every push to the default branch, from
`.github/workflows/second-analyser.yml`. Two jobs again, under two check names,
asking two different questions: `second-analyser` asks what is wrong with this
repository, and `second-analyser-proof` asks whether the two analysers still
disagree about anything.

### How the lens differs

CodeQL compiles the tree into a database and asks dataflow questions of it.
Opengrep matches the syntax as it is written, and follows taint inside a single
function. Neither is the better instrument. They fail differently, which is the
whole reason for running both:

- A flow the first one's model does not connect is invisible to it however
  obvious it looks in the source. That is not a hypothetical here. The fixture
  under `tests/fixtures/code-scanning/` had to have its indirection removed
  before the first analyser would follow it, and the paragraph above about that
  correction is the measurement.
- A shape the second one is not written to match is invisible to it, because it
  matches what its rules say and infers nothing. Its rule set is three rules
  written in this repository; the first analyser brings a query suite maintained
  somewhere else.

So the second analyser is narrow and literal where the first is broad and
inferential, and each finds a class the other passes over.

It is also not the greppable-invariants gate, which is worth saying because in
the gate this project takes as its target one workflow plays both roles. Here
they are two checks with two rule sets, and they differ in kind rather than in
configuration. `check:invariants` judges string facts in tracked text and cannot
tell a token in a comment from the same token in code. This one reads syntax and
can. `tests/fixtures/second-analyser/typescript/runtime-require.ts` is where the
difference is held: the word appears three times in that file, once as a call and
twice as prose, and the rule refuses one of the three.

### The rule set

`tools/opengrep/rules.yml`, read from the tree. Nothing is fetched from a
registry, so the same commit scanned twice gives the same answer and every rule
that ran is a rule somebody reviewed. Three rules today, each with the failure it
prevents and the bound on what it reaches written beside it, and each naming the
fixture that proves it bites.

No rule is switched off. The file says so, and it says where the reason goes when
one is: beside the rule, in that file, rather than in a workflow argument nobody
reads.

The scan reads what `.semgrepignore` at the root leaves it, and that file is
short and deliberate. Without it the tool falls back to a default ignore list
that skips `tests/` and fixture directories, and under that default this scan
read zero of the three fixture files and printed a green summary saying so. A
gate that is green because it read nothing is the failure the fixtures exist
against.

### The proof, and why it fails in two directions

`second-analyser-proof` scans the fixture directory on its own, uploads nothing,
and asserts a count of exactly one per rule. Exactly one rather than at least
one, because two of the three fixture files carry the defect and its near miss a
line or two apart: the same spawn with and without the shell option, the same
word as a call and as prose. A zero is a rule that has stopped reaching its
defect, so a green gate elsewhere means nothing for that rule. A two is a rule
that has started refusing correct code.

The third file's near miss is in the other fixture directory rather than beside
it. The two hold the same defect one indirection apart, and which of the two each
analyser follows is the difference this page is about.

The same job then runs the first analyser over the same directory and asserts it
finds nothing there. That is the half that is easy to leave out, and without it
the claim at the top of this section is an anecdote about a run in the past
rather than a measurement on this one. If the first analyser ever does follow
that flow, the job goes red and says what it means: not a defect in the tree and
not a failure of either tool, but a fixture that has stopped demonstrating the
difference, and a paragraph here that has to be corrected rather than an
assertion that has to be deleted.

That is why `tests/fixtures/second-analyser/` is excluded from the analysis that
uploads, in the same way and for a different finding than the other fixture
directory. Nothing there raises an alert today. The exclusion is what stops the
day that changes from becoming a permanent alert against this repository instead
of a red assertion.

### Triage

Findings do not accumulate, because the gate refuses on any finding at all. Each
one is either repaired or accepted at the call site, with the reason and what
would retire it written there rather than in a register somewhere else, and the
acceptance names the single rule it accepts rather than switching the line off.

There is one accepted finding today. `tools/src/check-lockfile-drift.ts` starts a
child process through a shell in the branch that has a bare program name and no
path to it. The name and every argument are literals, so nothing a caller
supplies reaches the command line; what retires it is resolving the executable in
that file, or the branch going away. Removing that one comment line and running
the gate is what proves the gate is a gate: it exits non-zero and names the line.

### What this analyser does not reach

**Languages.** The same three absences as the first analyser, for a different
reason. Every tracked source file here is TypeScript, which the languages check
counts on every run. Clojure and ClojureScript are named in the toolchain table
because it records the upstream project's toolchain, and no tracked file is
written in either; Opengrep can parse them, so the repair on the day one arrives
is a rule that names the language rather than an absence to accept. Rust is the
same. Markdown, JSON, YAML and the ignore file are not code and are not scanned
here either.

**Workflows.** Not scanned by this one, and the audit in
`.github/workflows/zizmor.yml` still stands in its place, exactly as it does for
the first analyser.

**Anything its rules do not name.** Three rules is three rules. A clean run says
those three shapes are absent from the files it read, and it says nothing else. A
broader rule set is the way that changes; a green tick is not.

**One function at a time.** The taint rule follows a value inside the function it
appears in. A request value handed to a helper and read from the file system
there is not followed, and that is the class the first analyser is the better
instrument for.

**It does not fail the build either.** No ruleset on the default branch requires
any check today, so this gate reports rather than refuses until #8 lands, the
same as everything else here.
