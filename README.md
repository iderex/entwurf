# entwurf

Fluid performance on very large design files, granular version history, and the
conditions a plugin ecosystem needs, built on the open design tool. The design
files live on your own hardware.

Planning happens on the issue tracker first. Every decision that shapes
the architecture is written down there with its reasons before the code
that depends on it exists.

[docs/architecture.md](docs/architecture.md) is what the parts are and how they
fit. [docs/decisions/](docs/decisions/) is where each decision is argued.

## Two halves, and they are not the same kind of promise

**The performance work is a commitment with numbers.** What counts as a large
file is defined on axes with three named sizes, the metrics are defined down to
where each clock starts and stops, and every published number carries the machine
and the conditions it was produced under. A change that makes a measured number
worse is meant to be refused rather than argued about. That is a promise this
project can keep by itself, because it is code, and code can be profiled, changed
and measured.

**The ecosystem work is an enabling effort, and its outcome depends on people
this project does not control.** Whether authors write plugins is a decision
thousands of people make about their own time, and no amount of engineering
produces it. What engineering can do is remove every reason not to.

Saying this is not modesty. A project that implies a crowd is coming has made a
promise it cannot keep, and an author who arrives expecting one and finds none
leaves with a worse impression than one who was told the truth.

What this project does commit to on that side is the concrete work, and it is
this: a contract with a compatibility promise rather than an interface that
drifts, a published deprecation policy an author can plan against, a development
loop that works on the author's own machine, a registry the operator controls, and
documentation that answers the question an author actually has.
[docs/plugins/](docs/plugins/) is where that is written for the person building
one.

See [NOTICE.md](NOTICE.md) for the intended-use notice, and
[docs/not-for.md](docs/not-for.md) for what this project declines to build and
what it does not promise.

## License

AGPL-3.0-only, copyright 2026 Nils Lehnen.

The full text is in [LICENSE](LICENSE).
