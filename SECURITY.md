# Security policy

## What this repository holds, because it decides what a report can be about

This repository contains no application code. The design tool is upstream, and
what is tracked here is documents under `docs/`, workflow guards under
`.github/`, one pinned upstream revision under `upstream/`, and the TypeScript
in `tools/` and `tests/` that checks this repository against its own rules. The
`overlay/` directory that `docs/architecture.md` describes, which is where this
project's changes to the tool will eventually live, does not exist yet:

    gh api "repos/iderex/entwurf/git/trees/main?recursive=1" \
      --jq '[.tree[] | select(.path | startswith("overlay"))] | length'
    0

So there is no editor here, no server, no file format reader, no render engine
and no plugin runtime. Those are upstream's, at the revision named in
`upstream/pin.json`, and a bug in any of them is reported to upstream rather
than here. I would rather say that on the first screen than have somebody write
a careful report into the wrong tracker.

## Reporting

Private reports go through GitHub's advisory form:

<https://github.com/iderex/entwurf/security/advisories/new>

That channel is open today, which is a measurement rather than an assumption:

    gh api repos/iderex/entwurf/private-vulnerability-reporting
    {"enabled":true}

Use it for anything where publishing the report is itself part of the harm.
Everything else is welcome as an ordinary issue, and most things here are
everything else.

I promise no acknowledgement deadline. A deadline this project cannot keep is
worse than none: a reporter told to expect an answer by a certain day and left
without one cannot tell whether the report was received, ignored, or is being
worked on quietly, and that is a worse position than knowing there was never a
clock. What I will do is read it and answer it as the work allows, and say
plainly if it belongs somewhere else.

## What is actually attackable here

Ranked by how much I would want the report.

**The workflows.** There are twelve of them and eleven run on pull requests,
including one opened from a fork, where a first-time contributor's run waits for
an approval and every later run starts on its own. Five of those eleven install
a toolchain and execute this repository's own TypeScript against a branch the
author controls: `clean-machine`, `unit-suite`, `invariants`, `source-headers`
and `document-lint`. The twelfth, `scorecard.yml`, runs on a schedule, on pushes
to `main` and when a branch protection rule changes, and never on a pull
request. Those eleven are the only place where somebody else's input reaches
something that runs. The posture today is deliberately narrow, which is exactly
why a way around it is worth reporting: no workflow uses `pull_request_target`,
every third-party action is pinned to a full commit SHA with the version in a
trailing comment, all fourteen checkout steps set `persist-credentials: false`,
and the repository grants nothing by default:

    gh api repos/iderex/entwurf/actions/permissions/workflow
    {"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}
    gh api repos/iderex/entwurf/actions/secrets --jq .total_count
    0

Report a path that gets more than that. Contributor-controlled text reaching a
`run:` block as shell rather than as an environment variable, a route by which
one of the three jobs holding `security-events: write` uploads something other
than its own findings, a checkout whose token survives the step that made it:
those are findings against this repository. Two of those three jobs, in
`code-scanning.yml` and `zizmor.yml`, run on pull requests, so they are where I
would look first.

**The checks in `tools/src/`.** They parse files the tree carries, and in CI
those files are whatever the pull request made them.
`tools/src/dependency-set.ts` reads `pnpm-lock.yaml` line by line with regular
expressions rather than with a YAML reader, `tools/src/checks/notices.ts` reads
a generated notices page of some 317 kB, and the docs, header and asset checks
walk markdown and source across the tree. The interesting failure in all of them
is not a crash. It is an input that makes a check report success while the
property it asserts is false, or that makes it run long enough never to report
at all. An active ruleset on the default branch requires ten status checks:

    gh api repos/iderex/entwurf/rulesets/20487962 \
      --jq '.rules[] | select(.type == "required_status_checks")
            | .parameters.required_status_checks[].context'
    DCO sign-off
    dependency-review
    Reject Trojan Source Unicode
    Audit workflows (zizmor)
    invariants
    source-headers
    unit-suite
    clean-machine
    code-scanning
    code-scanning-proof

Four of those ten run this code: `invariants` runs `check:invariants`,
`source-headers` runs `check:headers`, and `unit-suite` and `clean-machine` run
the unit suite. The ruleset names no bypass actor and requires no approving
review, so one of those four going green for the wrong reason is a merge that
nothing else stops. `document-lint`, which is where `check:docs` and
`check:commands` run, is not among the ten, so a fail-open there is not held by
the ruleset at all. A crafted file that survives one of these checks, or that
walks a path outside the repository root, is a report I want.

**The pinned supply chain.** `pnpm-lock.yaml`, the `engines` and
`packageManager` pins in `package.json`, the tool versions in
`tools/toolchains.json`, and the revision in `upstream/pin.json`. CI installs
with `corepack pnpm install --frozen-lockfile`. A way to get a package onto the
runner that the lock file does not name, or to move a pin past the drift checks
that exist to catch exactly that, is in scope. Nothing here is published:

    gh api repos/iderex/entwurf/releases --jq length
    0

so there is no artefact somebody else installs, and the blast radius of anything
in this paragraph is a contributor's machine and an ephemeral runner.

**The hardware suite.** This is the only browser in the tree.
`tools/src/hardware/probe.ts` launches Chromium with `--enable-gpu` and reads
GPU facts back over a CDP session, and `tests/hardware/gpu-path.spec.ts`
navigates to about:blank, draws into a four-by-four canvas and reads one pixel
back. If you find a path by which that browser loads content from anywhere but
about:blank, that is a real finding: a browser launched with those flags is
one I intend to keep pointed at nothing.

## What is not a vulnerability here

**`tests/fixtures/code-scanning/typescript/path-injection.ts`.** It is
deliberately vulnerable, and it is the only file the proof job scans. It hands a
request path straight to `readFile` with nothing resolving it against a root.
Nothing imports it, no test loads it, the server it constructs is never told to
listen, and the second job in `.github/workflows/code-scanning.yml` scans it in
isolation and fails when the scanner stops finding the flaw. Reporting it
reports a file doing its job. The same holds for
`tests/fixtures/second-analyser/`, which carries three more files planted for the
same purpose, including the `spawnSync` call that passes `shell: true` on purpose
so that a rule can be shown telling it apart from the identical call in the
function below.

**A bug in the design tool itself.** The editor, the server, the file format,
the render engine and the plugin runtime are upstream's, and a report about them
belongs on upstream's tracker. Holding such a report in a private advisory here
would delay the fix by however long it takes me to forward it, which helps
nobody.

**A hostile design file that makes something slow or large.** This is the report
the repository description invites, and today there is nothing here to send it
to: no parser, no corpus generator, no harness. A file that degrades the tool is
an upstream matter until code that reads one lands in this tree, at which point
this section changes rather than staying convenient.

**A flaw in a decision record.** Records 0009, 0010 and 0012 argue a plugin
contract, a permission model and the conditions under which a plugin may reach
the network. None of it is implemented. If the argument in one of them is wrong
I want to know, and the tracker is where I want to hear it, because a private
advisory about an unimplemented design gives a reader an embargo with nothing
behind it.

**An advisory against a development dependency.** `package.json` declares five
devDependencies and no runtime dependencies. Nothing here is shipped to a user
or run on a server, so such an advisory is a version bump on the tracker rather
than a private report. I would still rather see it than not.

**Missing headers, TLS settings, authentication, rate limits, session
handling.** There is nothing to attach them to. This project runs no service and
holds no operator's data, which `docs/not-for.md` states as a decision rather
than as a stage. The absence of telemetry is a recorded refusal on the same
page, so a report that this project cannot observe an attack on somebody else's
deployment is answered there rather than here.

**A scanner result with no path through this tree.** A tool's output pasted
without a route from an input somebody else controls to the thing it reaches is
something I will read, but it is not yet a report.

## What happens after a report

I reproduce it if I can and say what I found, including when what I found is
that I could not. Where it is upstream's I say so and point at where to file it
rather than forwarding it on your behalf without asking. Where it is fixed here,
the fix lands as an ordinary pull request through the same guards as every other
change, and the advisory names the commit. Credit goes in the advisory unless
you would rather it did not.
