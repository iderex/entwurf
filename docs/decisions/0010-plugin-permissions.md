# 0010. The plugin permission model

Status: accepted.
Issue: #42.

## What already exists upstream

A permission model is not being chosen from nothing. The upstream tool has one,
plugins declare permissions in a manifest, and the set of names that manifest may
carry is fixed by a schema rather than by documentation about it. Read from the
tree at the revision `upstream/pin.json` names, 2026-08-09 UTC:

    gh api "repos/penpot/penpot/contents/plugins/libs/plugins-runtime/src/lib/models/manifest.schema.ts?ref=b5bec4f983b5540a3ed7969121badf08a14f384e" --jq .content | base64 -d

    permissions: z.array(
      z.enum([
        'content:read',
        'content:write',
        'library:read',
        'library:write',
        'user:read',
        'comment:read',
        'comment:write',
        'allow:downloads',
        'allow:localstorage',
        'clipboard:read',
        'clipboard:write',
      ]),
    ),

Eleven names in two shapes. Nine are a subject and a verb, over five subjects that
a designer would recognise as parts of the tool. Two carry an `allow` prefix, and
those two are not access to the document at all: they are capabilities that leave
the tool, one to the person's disk and one to storage outside the document.

Two things about that list matter more than its contents.

**It is a schema rather than a list in a document**, so it is checkable and it
cannot drift from what the runtime accepts. That is the shape this project wants
and it is already there.

**No name in it is about the network.** A plugin's reach beyond the host is not
expressed in this vocabulary at all, which means the question record 0012 answers
cannot be answered by adopting this set. That is the single largest fact this
record establishes, and it is established by the absence in the block above
rather than by inference.

The example manifest in the author documentation lists five of the eleven, which
is where an earlier reading of this stopped, and a set read from an example is a
subset presented as a whole.

## The position

**This project adopts the upstream permission set unchanged, extends it where it
is not sufficient, and never redefines a name that already exists.**

That follows record 0009 rather than deciding anything new: the contract is a
superset of the upstream surface, and permissions are part of the surface. A
plugin written against upstream declares upstream's names and runs here. A name
this project adds is marked in the reference as this project's, so an author using
one is choosing knowingly.

Redefining an existing name is refused outright, and not as a matter of taste.
Record 0009 puts the identity of an existing permission, meaning what it grants,
among the things that may never change in any release. A name that means one thing
upstream and a wider thing here is a plugin that was granted less than it received.

**Permission is decided at two levels. The operator sets a ceiling, and the user
grants inside it.**

The ceiling is the set of permissions this deployment will ever let a plugin hold.
The grant is what a particular user allows a particular plugin, and it can only
ever be a subset of the ceiling. Neither level can widen the other.

This is one mechanism rather than a position on how open a deployment should be,
and that is deliberate. A ceiling holding nothing is a deployment where plugins
can reach nothing. An open ceiling is a deployment where the user decides. A
ceiling with the grant step removed is a deployment where the operator decides for
everybody. The tracker holds the question of which of those an operator should
pick; this record makes all of them expressible, so the answer lands as
configuration rather than as a rebuild of the model, the sandbox tests in #43 and
the conformance suite in #41.

**The shipped ceiling is empty.** A fresh install grants nothing to anything, so no
deployment acquires a capable plugin by accident. An operator who wants plugins to
do anything at all makes a decision and can point at when they made it.

## Why this granularity, and what the choice costs

**The upstream granularity is adopted because it is coarse in the right way.** Five
subjects and a read or a write over each is a set a person can hold in their head
while looking at a dialog, and a permission dialog nobody understands is a
permission dialog everybody accepts.

**What it costs is real and is not softened here.** A permission for `"content:write"`
covers every write there is: adding a rectangle and rewriting every text in the
file are the same grant. A plugin that needs to change one colour asks for the
same thing as one that could replace the document. Finer permissions would
separate those, and the reason for not having them is that the separation would
not survive contact with a person clicking through a list of fifteen checkboxes.

**The alternative that was rejected, and why.** A capability-per-operation model
makes each grant precise and makes the aggregate meaningless: nobody reads
fifteen lines, so the effective behaviour is that everything is accepted, and a
model whose real-world outcome is "accept all" is worse than a coarse one that is
actually read. This is a judgement about people rather than about software, and it
is written here so that a later argument for finer permissions has to argue with
it rather than around it.

**Where the coarse set is genuinely not enough, the repair is a new name rather
than a finer subdivision of an old one.** Record 0012 adds one, for exactly the
case the upstream vocabulary has no name for.

## Fail closed, at three points

**A plugin that requests nothing gets nothing.** It cannot read the document, the
libraries, the user, the comments or the clipboard, and it cannot write any of
them. Absence of a declared permission is refusal rather than a default, so a
manifest with the permissions array missing and one with it empty behave
identically.

**An operation attempted without its permission fails, before it does anything.**
The refusal is an error the plugin can catch and handle, carrying which permission
was missing, so an author can ask for it or degrade rather than crash. What it may
never be is a partial success: an operation that touches half of what it was going
to touch and then refuses has left the document in a state neither the user nor
the plugin asked for, and there is no way for either to find out what happened.
The check is before the effect, always.

**A permission the ceiling does not carry cannot be granted, and the failure is at
install time rather than at first use.** A plugin declaring a permission outside
the ceiling is refused when it is installed, naming the permission and saying that
the operator is who decides it. Discovering it at first use means a person has
already put the plugin in front of their work.

## What the user is shown

Permissions are declared ahead of time in the manifest and shown before the plugin
runs for the first time, and they are shown as consequences rather than as method
names. "This plugin can change any shape, text or page in your files" is what
`"content:write"` means to the person being asked. The mapping from a name to that
sentence is part of the contract and is covered by the conformance suite, because
a wording that quietly weakens is the same failure as a disclosure that quietly
weakens, and record 0011 has already written that rule for federation.

## Where this record stops and record 0012 begins

The line is whether the capability sends design content off the host.

Everything in the upstream set is reach inside the tool or onto the person's own
machine, and this record governs all of it, `"allow:downloads"` and
`"allow:localstorage"` included. A download is the user's own copy arriving on the
user's own disk by the user's own action, which is not an exit in the sense record
0011 is about.

Reaching a network destination is an exit, it has no name in the upstream
vocabulary, and record 0012 is where the name, the default and the shape of the
grant are decided. This record supplies the two-level mechanism that record uses
and takes no position on whether the ceiling should ever carry it.

## The five clauses of record 0011

Record 0011 places its five clauses on any feature that sends design content off
the host, and it says explicitly that a plugin doing so is such a feature. Two of
them constrain this model rather than record 0012, so they are recorded here.

Clause 2 puts the decision with the operator rather than the user. A model in
which the installing user alone can grant an exit does not meet it. The two-level
shape above is what makes the clause satisfiable while a user still grants
anything at all, because the operator's ceiling bounds every grant a user can make.

Clause 5 requires the disclosure at the point data leaves to name the plugin and
its destination. That is a requirement on what a grant records: a grant that
stores only "this plugin may reach the network" cannot produce that disclosure,
so a grant is per destination and record 0012 is where that is stated as the rule.

## What no machine refuses today

Everything above is a position, and nothing in this tree enforces any of it,
because nothing in this tree runs a plugin. Stated here in the sentences that
state the rules rather than in a footnote, because a rule a reader believes is
enforced is worse than no rule.

Nothing refuses an operation added to the contract with no permission assigned to
it. That is the fifth condition of #42 and it is the one part of that issue that
could be built before a runtime exists, because it is a check over the contract
source rather than over a running plugin. It needs the contract source, which is
issue #48's generator and does not exist yet.

Nothing proves that a plugin requesting nothing can read nothing, that an
operation without its permission fails closed, or that a refusal never partially
succeeds. Those are #42's second, third and fourth conditions and every one of
them needs a runtime.

## What this record does not decide

It does not decide whether a plugin may reach the network, which is record 0012.

It does not decide who may lift a default, beyond placing the ceiling with the
operator. Which position an operator should take is held on the tracker.

It does not decide how a plugin gets into a registry or who vouches for it, which
is issue #53, though a registry that records declared permissions per plugin is
what makes a ceiling reviewable rather than guessed at.

It does not decide the sandbox boundary that makes any of this hold, which is
issue #43. A permission model in front of a sandbox that can be reached around is
a description of an intention.
