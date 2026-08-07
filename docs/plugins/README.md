# Plugins

For the person building one. Read this before the reference, because it says what
this project is offering you and what it is not, and both are worth knowing before
you spend an evening.

## What you are being offered

**A contract, not an interface.** The plugin surface here is treated as something
you can build against and come back to. Record
[0009](../decisions/0009-plugin-contract.md) sets out what may change in which
kind of release and what may never change, names the conformance suite as the
authority for what the contract actually says, and states the one thing this
project cannot promise rather than leaving you to find it.

**A superset of the upstream surface.** A plugin written against the upstream
plugin package runs here. A plugin using something this project adds does not run
on an upstream installation that lacks the addition, and the reference marks which
part is which so that is a choice rather than a discovery.

**A deprecation policy with a notice period**, so that an operation going away is
something you hear about with time to move rather than something you find out from
a support request.

**A development loop on your own machine**, and a way to test against a large file
without owning one.

**A registry the operator controls**, so publishing does not depend on this
project's permission.

Some of that is decided and written down, and some of it is not built yet. The
tracker is where the state of each part actually lives, and this page does not
restate it, because a status list in a document drifts against the thing it
describes.

## What you are not being offered

**A crowd.** This project is not going to tell you a plugin ecosystem is
happening here, because whether one happens is a decision that thousands of people
make about their own time, and no amount of engineering produces it. What
engineering can do is remove every reason not to show up, and that is the list
above.

This is worth saying to you directly rather than in a planning document you would
never read. If you build here, build because the contract and the loop are worth
your time, not because a number in a chart implies company. If the ecosystem does
grow, it will be because enough people made that judgement individually.

**A promise about anything the contract does not describe.** Reaching around the
surface may work today. It is outside the promise, and record 0009 says so in the
same words.

## How this project talks about the size of the ecosystem

There is no target number of plugins here, and there will not be one. The moment a
count becomes a target, the project starts optimising the count rather than the
conditions, and the conditions are the only part this project controls.

Where a count is published at all, it is published as an observation with its date
and the command that produced it, next to the things this project does affect, for
example how long it takes to get from a clone to a running plugin.
[../ecosystem/observations.md](../ecosystem/observations.md) is that set, and most
of it is currently recorded as not measured rather than left out. No milestone,
issue or release note in
this repository is written against a plugin count, and that is a rule about how
this project plans rather than a claim about how well it is doing.
