# 0012. What a plugin may reach on the network

Status: accepted.
Issue: #44.

## Why this is not part of record 0010

Record 0010 adopts the upstream permission set, and that set has no name for the
network. The eleven names it fixes are reach inside the tool or onto the person's
own machine, and the block quoted in 0010 is the evidence: there is no entry there
about hosts, requests or destinations.

So this is not a default to be chosen inside an existing vocabulary. It is a name
this project adds, and record 0009 already says what adding one costs: a plugin
using it does not run on an upstream installation that lacks it, and the reference
has to mark it as this project's rather than upstream's.

It also deserves its own record for the reason the issue was opened with. A plugin
that can read the document and reach the network can move an organisation's
unreleased design work anywhere, and the person who clicked accept was thinking
about a colour palette. That is the one permission where the granularity argument
in record 0010, which says few and broad beats many and precise, does not hold,
and the section on named destinations below is where it stops holding.

## The position

**A plugin may reach the network. Only a destination the operator has named, only
within a ceiling the operator sets, and only where a user has granted it inside
that ceiling. The default is off and the shipped ceiling is empty.**

Off by default is not a recommendation about how to configure a deployment. A
fresh install with no configuration has no destination in its ceiling, so there is
nothing for a user to grant, and a plugin that asks for network reach is refused
at install with the reason.

The position was taken on the tracker, in #89, where the question of whether the
software may have an outbound capability at all was held. It is recorded here with
its cost rather than as a settled fact with the cost left behind.

## The alternatives, and what each one costs

**Never.** Clean, and it needs no mechanism, no ceiling and no disclosure. It costs
a category of plugin rather than a feature: anything that talks to an asset
service, an icon library or a translation system disappears, and record 0011
already places a plugin sending design content to a network destination under the
same five clauses as a feature this project builds, so a never here would have
decided half the plugin milestone by implication rather than by argument. It would
also turn issues #42 and #44 into a lock rather than a model, and a lock is what
gets quietly picked later by whoever needs the asset service.

**The installing user decides, alone.** How most plugin systems work, and it is
ruled out rather than weighed. Clause 2 of record 0011 puts a decision about data
leaving the host with the operator, on the argument that the operator knows what
the organisation has agreed to and a designer cannot. One person accepting a
dialog moving an organisation's unreleased work to a third party is the exact case
that clause was written for.

**The operator decides for the whole deployment, with no user step.** Meets every
clause, and it is the same mechanism as the position above with the grant step
removed, which is why record 0010 builds the mechanism rather than one level of
it. It costs the designer the ability to use a plugin without asking somebody, and
it makes the operator the person who reviews every plugin anybody wants.

**A ceiling the operator sets with a grant the user makes inside it**, which is
what is chosen. It costs a permission model two different people have to
understand, and that cost is real: an operator who thinks the ceiling is the grant
will believe they have approved something they have only permitted. The reference
and the operator documentation have to keep those two words apart every time they
use them.

## Named destinations, never the network

**A grant is to a host, and there is no grant that means "the internet".**

This is where record 0010's argument for coarse permissions stops applying, and
the reason is that the two are not the same kind of question. A coarse permission
answers what a plugin may do to the document, and the person answering can see the
document. A network permission answers where the document may go, and "somewhere"
is not an answer a person can consent to. Clause 5 of record 0011 makes that
concrete rather than aesthetic: the disclosure at the point data leaves has to
name the destination as something the person can recognise, and a grant that
recorded only "may reach the network" cannot produce one.

So the ceiling is a list of destinations, a grant is per destination, and a
request to any other host is refused whatever else the plugin holds. A plugin that
needs three services asks for three, and an operator who allows one has allowed
one.

**What that costs.** A plugin whose destination is a content network with rotating
hostnames is hard to permit precisely, and the honest outcome is that some plugins
are awkward here and a few are impractical. That is the trade, and the alternative
is a wildcard that makes every disclosure say nothing.

## The operator's refusal is unconditional

An operator can refuse network-capable plugins for the whole deployment, and no
grant by any user can reach past that. That is the empty ceiling, and it is the
shipped state.

The direction that matters is that the ceiling only ever narrows what is possible.
A user grant is a subset of the ceiling, never an addition to it, and there is no
configuration in which a user's acceptance widens what the operator allowed. Where
the two disagree, the ceiling wins, and it wins silently rather than by asking
again.

## What this costs the claim in the readme

**The unconditional sentence falls, and this record says so rather than leaving it
to be discovered.**

The readme carries the claim with no clause after it:

    git grep -n 'own hardware' -- README.md
    README.md:5:files live on your own hardware.

Record 0011 predicted exactly this. The moment an outbound capability is permitted
at all, that sentence acquires a hinge, and 0011 exists so the hinge is specified
before there is pressure to widen it. The hinge is now real, and it is the five
clauses rather than a phrase.

Three things change because of it, and none of them is this record's to write.
Issue #85 rewrites the readme and is where the sentence gains its condition.
Issue #66 writes the data protection statement, which clause 4 requires to name
this exit; that is the fifth condition of #44 and it cannot be met from here.
`docs/not-for.md` already requires a condition to sit where the claim sits, and it
carries claims about outbound behaviour that have to be read again against this.

What must not happen is the claim staying unconditional while the capability
exists. A sentence that was true when it was written and is not true now is worse
than one that was never made, because everybody who read it is still relying on
it.

## The five clauses of record 0011, one by one

**Off by default.** The shipped ceiling is empty. A fresh install does not
federate, and no template, container or compose example turns it on.

**Configured by the operator, not by a user.** The ceiling is an operator setting.
A designer cannot add a destination to it, for themselves or for their team, and
cannot add one by accepting a dialog.

**Visible while it is on.** A deployment whose ceiling is non-empty says so in the
tool, continuously, not once at sign-in. Someone using it can tell that plugins
here can reach outside without going to look.

**Named in the data protection statement.** Plugin network reach is an exit and is
named there as one, per plugin destination rather than as a category. Issue #66
carries it and this record is a standing requirement on that issue rather than a
one-time addition.

**Disclosing at the point data leaves.** The disclosure names the plugin, what is
leaving in the vocabulary of the design, the destination as a recognisable host,
who controls it, and that the operator permitted it. Record 0011's own section on
that clause is the authority for the wording and is not restated here.

## What no machine refuses today

Nothing in this tree runs a plugin, makes a request or holds a ceiling, so every
sentence above is a position and none of it is enforced. The second condition of
#44 asks for a test proving a plugin without the permission cannot reach any host,
the third and fourth ask for behaviour of a running system, and all three need the
runtime that #43 and the pinned revision bring.

The fifth condition is a document rather than a runtime and is still blocked: it
asks the data protection statement to name this exit, and that statement is #66,
which waits on the outbound connection inventory in #63.

There is one thing this record does not leave to a later mechanism. The eleven
upstream permission names are fixed by a schema the runtime reads, so the name
this project adds belongs in a schema too rather than in prose. Where it lands is
the contract source, which does not exist yet.

## What this record does not decide

It does not decide the permission model, which is record 0010. It adds one name to
the set that record adopts and uses the two levels that record defines.

It does not decide whether this project itself ever builds a federating feature,
which record 0011 holds open and the tracker carries.

It does not decide how a plugin gets into a registry or who vouches for one, which
is issue #53. A registry that records declared permissions per plugin is what
would let an operator see which plugins want a destination before deciding, and
this record assumes nothing about that.

It does not decide the sandbox, which is issue #43. A destination list in front of
a sandbox a plugin can reach around is a description rather than a boundary.
