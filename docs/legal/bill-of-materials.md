# Bill of materials

Generated. Nothing here is written by hand, and a hand edit is refused as drift
rather than kept. The command that produces it is the bom script in
`package.json`, and the check that refuses a stale copy is `check:bom`.

Every licence below is what the package declares about itself in its own
package.json, read out of the resolved store. Where it was read from is not a
column, because it is the same answer on every row and a store path carries the
resolving machine's peer hashes, which would drift between two checkouts of one
lock file. Whether a declaration is the licence the package's files actually carry
is a judgement, and no reading of a manifest makes it.

The set is every package `pnpm-lock.yaml` names. It is not the set installed in a
working checkout: a store keeps the directories of packages that were resolved
once and are not resolved now, so a list built by walking the installed tree
reports dependencies this repository does not have.

## What this does not cover

This repository tracks 1 lock file: pnpm-lock.yaml. Everything below comes
from it and from nothing else.

The upstream design tool's own dependency set, in three other languages, and the
rendering library and its binaries, are not here. This repository holds a pin to
that revision and no route to build it, so nothing here is evidence about what an
operator would actually ship. Issue #98 is where the pinned revision becomes
runnable and issue #65 is where these notices are carried through rather than
replaced.

27 of the packages below are restricted by the lock file to a platform other
than one machine can hold at once, so their terms were not read here at all. They
are listed with the constraint that stopped the reading rather than left out, and
the count is here rather than only in the table. Establishing them needs a
generation route that runs on each platform, which this repository does not have.

## The dependencies

94 package(s): MIT (53), Apache-2.0 (6), BSD-3-Clause (4), ISC (3), MPL-2.0 (1).

| Package | Version | Licence |
| --- | --- | --- |
| @babel/helper-string-parser | 7.29.7 | MIT |
| @babel/helper-validator-identifier | 7.29.7 | MIT |
| @babel/parser | 7.29.8 | MIT |
| @babel/types | 7.29.8 | MIT |
| @bcoe/v8-coverage | 1.0.2 | MIT |
| @jridgewell/resolve-uri | 3.1.2 | MIT |
| @jridgewell/sourcemap-codec | 1.5.5 | MIT |
| @jridgewell/trace-mapping | 0.3.31 | MIT |
| @oxc-project/types | 0.143.0 | MIT |
| @playwright/test | 1.62.1 | Apache-2.0 |
| @rolldown/binding-android-arm64 | 1.2.3 | NOT READ: the lock file restricts it to os android, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-darwin-arm64 | 1.2.3 | NOT READ: the lock file restricts it to os darwin, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-darwin-x64 | 1.2.3 | NOT READ: the lock file restricts it to os darwin, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-freebsd-x64 | 1.2.3 | NOT READ: the lock file restricts it to os freebsd, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-arm-gnueabihf | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu arm, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-arm64-gnu | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-arm64-musl | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-ppc64-gnu | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu ppc64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-s390x-gnu | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu s390x, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-x64-gnu | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-linux-x64-musl | 1.2.3 | NOT READ: the lock file restricts it to os linux, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-openharmony-arm64 | 1.2.3 | NOT READ: the lock file restricts it to os openharmony, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-win32-arm64-msvc | 1.2.3 | NOT READ: the lock file restricts it to os win32, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/binding-win32-x64-msvc | 1.2.3 | NOT READ: the lock file restricts it to os win32, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| @rolldown/pluginutils | 1.0.1 | MIT |
| @standard-schema/spec | 1.1.0 | MIT |
| @types/chai | 5.2.3 | MIT |
| @types/deep-eql | 4.0.2 | MIT |
| @types/estree | 1.0.9 | MIT |
| @types/node | 24.13.3 | MIT |
| @vitest/coverage-v8 | 4.1.10 | MIT |
| @vitest/expect | 4.1.10 | MIT |
| @vitest/mocker | 4.1.10 | MIT |
| @vitest/pretty-format | 4.1.10 | MIT |
| @vitest/runner | 4.1.10 | MIT |
| @vitest/snapshot | 4.1.10 | MIT |
| @vitest/spy | 4.1.10 | MIT |
| @vitest/utils | 4.1.10 | MIT |
| assertion-error | 2.0.1 | MIT |
| ast-v8-to-istanbul | 1.0.5 | MIT |
| chai | 6.2.2 | MIT |
| convert-source-map | 2.0.0 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |
| es-module-lexer | 2.3.1 | MIT |
| estree-walker | 3.0.3 | MIT |
| expect-type | 1.4.0 | Apache-2.0 |
| fdir | 6.5.0 | MIT |
| fsevents | 2.3.2 | NOT READ: the lock file restricts it to os darwin, and no route here reads a package built for a platform other than the one generating this |
| fsevents | 2.3.3 | NOT READ: the lock file restricts it to os darwin, and no route here reads a package built for a platform other than the one generating this |
| has-flag | 4.0.0 | MIT |
| html-escaper | 2.0.2 | MIT |
| istanbul-lib-coverage | 3.2.2 | BSD-3-Clause |
| istanbul-lib-report | 3.0.1 | BSD-3-Clause |
| istanbul-reports | 3.2.0 | BSD-3-Clause |
| js-tokens | 10.0.0 | MIT |
| lightningcss | 1.33.0 | MPL-2.0 |
| lightningcss-android-arm64 | 1.33.0 | NOT READ: the lock file restricts it to os android, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-darwin-arm64 | 1.33.0 | NOT READ: the lock file restricts it to os darwin, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-darwin-x64 | 1.33.0 | NOT READ: the lock file restricts it to os darwin, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-freebsd-x64 | 1.33.0 | NOT READ: the lock file restricts it to os freebsd, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-linux-arm-gnueabihf | 1.33.0 | NOT READ: the lock file restricts it to os linux, cpu arm, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-linux-arm64-gnu | 1.33.0 | NOT READ: the lock file restricts it to os linux, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-linux-arm64-musl | 1.33.0 | NOT READ: the lock file restricts it to os linux, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-linux-x64-gnu | 1.33.0 | NOT READ: the lock file restricts it to os linux, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-linux-x64-musl | 1.33.0 | NOT READ: the lock file restricts it to os linux, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-win32-arm64-msvc | 1.33.0 | NOT READ: the lock file restricts it to os win32, cpu arm64, and no route here reads a package built for a platform other than the one generating this |
| lightningcss-win32-x64-msvc | 1.33.0 | NOT READ: the lock file restricts it to os win32, cpu x64, and no route here reads a package built for a platform other than the one generating this |
| magic-string | 0.30.21 | MIT |
| magicast | 0.5.4 | MIT |
| make-dir | 4.0.0 | MIT |
| nanoid | 3.3.17 | MIT |
| obug | 2.1.4 | MIT |
| pathe | 2.0.3 | MIT |
| picocolors | 1.1.1 | ISC |
| picomatch | 4.0.5 | MIT |
| playwright | 1.62.1 | Apache-2.0 |
| playwright-core | 1.62.1 | Apache-2.0 |
| postcss | 8.5.26 | MIT |
| rolldown | 1.2.3 | MIT |
| semver | 7.8.5 | ISC |
| siginfo | 2.0.0 | ISC |
| source-map-js | 1.2.1 | BSD-3-Clause |
| stackback | 0.0.2 | MIT |
| std-env | 4.2.0 | MIT |
| supports-color | 7.2.0 | MIT |
| tinybench | 2.9.0 | MIT |
| tinyexec | 1.3.0 | MIT |
| tinyglobby | 0.2.17 | MIT |
| tinyrainbow | 3.1.1 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| undici-types | 7.18.2 | MIT |
| vite | 8.2.1 | MIT |
| vitest | 4.1.10 | MIT |
| why-is-node-running | 2.3.0 | MIT |
