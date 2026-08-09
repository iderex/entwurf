# Notice

This software is developed for lawful use. Operators and users are
responsible for making sure that their deployment and use comply with the
laws that apply to them, including copyright and data protection law. The
project does not endorse or support unlawful use of any kind, and nothing
in it is designed to enable such use.

## Licence

AGPL-3.0-only. The full text is in [LICENSE](LICENSE), including the warranty
and liability disclaimer, and nothing here restates any of its terms.

Every source file declares its licence in its first two lines, as an SPDX short
form rather than a copy of the text. A file derived from the tool this project
builds on carries MPL-2.0 instead, because that copyleft is per file and travels
with the file rather than being this repository's to change. Which licence a
given location carries, and why, is printed by `corepack pnpm run check:headers`
rather than listed here.

## Third-party notices

The code this project depends on and did not write is licensed by other people,
and almost every one of those licences asks that its terms and its copyright line
travel with the software. They travel in
[docs/legal/third-party-notices.md](docs/legal/third-party-notices.md), which is
generated rather than written and carries each text as the package publishes it.
[docs/legal/bill-of-materials.md](docs/legal/bill-of-materials.md) is the list of
what those packages are and what each one declares.

This page stays short and stays here because it is about lawful use and about
this repository's own licence. The notices are several hundred kilobytes of
somebody else's text, and putting them under the paragraph above would leave the
thing a reader came for at the top of a file nobody scrolls.

Both generated pages cover one lock file and therefore one ecosystem. The upstream
design tool's own dependencies, in three other languages, and the rendering
library and its binaries, are in neither of them: this repository holds a pin to
that revision and no route to build it. Each page says so on its own first screen,
and issue #65 is where those notices are carried through rather than replaced.
