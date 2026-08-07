# The upstream pin

`pin.json` names the upstream repository and the exact commit this tree builds
and measures against. It is the only place that revision is written down, and
one command prints it:

    corepack pnpm run upstream:revision

Nothing under this directory is a copy of upstream source. The revision is
fetched into a working checkout that is not tracked here, so a rebase onto a
newer revision changes one field in one file rather than a directory of vendored
code. Record 0002 is where that position is argued.

## Which branch the revision comes from, and why it is not `main`

The pinned revision is a commit on `develop`, which is the upstream default
branch:

    gh api repos/penpot/penpot --jq .default_branch
    develop

That matters because the two branches carry different versions of the toolchains
this project pins. On the day this pin landed, `main` was four days behind and
named a different Node:

    gh api repos/penpot/penpot/branches/main --jq '.commit.sha'
    d835baefecb13a4abf273e02ccfcefc169306756
    gh api "repos/penpot/penpot/contents/.nvmrc?ref=d835baefecb13a4abf273e02ccfcefc169306756" --jq .content | base64 -d
    v24.18.0
    gh api "repos/penpot/penpot/contents/.nvmrc?ref=b5bec4f983b5540a3ed7969121badf08a14f384e" --jq .content | base64 -d
    v24.18.1

Work is offered upstream first, and an upstream pull request is opened against
the branch upstream develops on. A pin on the other branch would mean measuring
one tree and contributing to another.

## What moves this pin

Changing `revision` is a change to what every measurement in this repository was
produced against, so it is not a routine bump made in passing. Issue #10 is where
the rebase route and the drift report are built. Until that lands, moving the pin
means re-running the commands in `tools/toolchains.json` against the new revision
and correcting any version that moved, because a pin that moves while the
toolchain table stands still is the drift both files exist to prevent.
