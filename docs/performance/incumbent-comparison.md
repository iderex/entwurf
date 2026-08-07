# Comparing against the incumbent

Issue: #20.

The gap this project was founded on is a gap against a commercial product. This
document says whether this project measures that product, and it is written
before any measurement exists so that the answer is not decided by whichever
number was convenient at the time.

## The position

This project publishes no measurement of Figma. Every performance number it
publishes is a measurement of its own build, on the named sizes in record 0003,
under the protocol in record 0004, and every goal it states is stated in absolute
terms rather than as a ratio to a product nobody here measured.

There are two reasons and they are independent of each other. The first would
hold even if the second went the other way.

## The first reason, which is about measurement

Issue #16 requires that every published number carries the conditions it was
produced under, and that the harness refuses to produce a result when a condition
cannot be read rather than producing one with a blank field.

For a hosted product, most of the conditions cannot be read. The server the work
runs on, its load at the moment of the run, the version being served, the rollout
group the account is in and what was cached where are all unobservable from
outside. A number produced in that state is not a measurement under this
project's own rule; it is a reading with the important fields missing. Publishing
it beside numbers that do satisfy the rule would put two different kinds of thing
in one table and let a reader compare them as though they were the same kind.

That is a self-imposed reason, and it is the one that would survive any change in
the paragraph below.

## The second reason, which is about the terms

The terms were read rather than assumed. Fetched on 2026-08-06 UTC:

    curl -sS https://www.figma.com/legal/tos/ | sed -e 's/<[^>]*>//g' | grep -oP '2\.2\. Use Restrictions\..*?(?=2\.3\.)'

which prints one line of 879 characters, wrapped here and otherwise unaltered:

> 2.2. Use Restrictions. Except as otherwise expressly authorized in these Terms,
> Customer will not, and will not encourage or assist third parties to: (i)
> reverse engineer, decompile, disassemble, or otherwise attempt to discover the
> source code, object code, or underlying structure, ideas, know-how, or
> algorithms relevant to the Services (except to the extent that such a
> restriction is impermissible under applicable law); (ii) provide, sell, resell,
> transfer, sublicense, lend, distribute, rent, or otherwise allow others to
> access or use the Services; (iii) copy, modify, create derivative works of, or
> remove proprietary notices from the Services; or (iv) use the Services in
> jurisdictions that are embargoed or designated as supporting terrorist
> activities by the United States Government or whose laws do not permit engaging
> in business with Figma or use of the Services.

The count is what makes the quote checkable. It is the whole of clause 2.2, from
its number to the start of clause 2.3, and the space before the final word is a
non-breaking space in the source, reproduced above rather than tidied away.

Clause (i) is the one that reaches this project's case. A profile of a closed
product, which is what a useful comparison would require, is an attempt to
discover how it works. A stopwatch held against a screen is not, but a stopwatch
held against a screen produces a number that fails the first reason above, so the
part of the comparison that would be worth publishing is the part clause (i)
covers.

The acceptable use policy was fetched on the same date and searched for a
benchmarking or publication restriction:

    curl -sSL https://www.figma.com/aup -o aup.html -w '%{http_code}\n'
    200
    grep -c -i benchmark aup.html
    0
    grep -o -E 'Last Updated: [A-Za-z]+ [0-9]+, [0-9]{4}' aup.html | head -1
    Last Updated: March 26, 2026

The third command is there because the second one is worthless without it. A zero
from a grep over a page whose text is assembled in the browser would say nothing
about the policy, only that the fetch returned a shell. The fetched file carries
the policy body as served markup, which is what the dated line demonstrates, so
the zero is a statement about the text that was read.

**No benchmarking or publication-of-performance clause was found in either
document.** That is a negative result and it stays a negative result. It is not a
finding that such measurement is permitted. The two documents fetched are the
ones a public reader can fetch; they are not necessarily the whole set of terms
that governs any particular account, they can change after the date above, and
whether clause (i) reaches a given method is a legal question that a search for a
keyword does not answer. This section records what was read, on what date, with
what command. It does not clear anything.

## What this project publishes instead

Absolute numbers, per metric, per named size, with conditions. A goal is written
as a number the project commits to hitting, not as a fraction of somebody else's
number. Record 0005, when it lands under issue #18, states those goals in that
form.

The readme already describes the goal in absolute terms. Verified at the commit
this file lands on:

    git grep -niE "figma|times faster|times slower|[0-9]+x |compared to|versus|vs\.|ratio" HEAD -- README.md NOTICE.md
    exit=1

Exit 1 from `git grep` means no match. If a comparative claim is ever added to
the readme, this document is what it has to be argued past.

## Third-party figures

None are cited today, here or anywhere else in this repository.

If one is ever cited, it carries its source, its date and the conditions it was
produced under, and it is marked in the same sentence as not measured by this
project. A third-party figure inherits its author's machine, its author's
version and its author's errors, and none of those become this project's by
quoting them. A figure without conditions is not citable here at all, whoever
produced it, because it fails the same rule that keeps this project from
producing one.

## Whether this needed a decision rather than a reading

It did not. Issue #20 is written to settle this itself, and neither the reading
above nor the measurement reason required an answer that only the maintainer can
give. No entry is owed in issue #89 as a result of this document, and none has
been added.

That changes if somebody wants to publish a ratio. Publishing a comparison would
be a product commitment rather than a reading, it would need the terms question
answered by somebody qualified to answer it rather than by a fetch, and it would
need the first reason above resolved or overruled. At that point it becomes a
maintainer entry, and it is written up as one rather than decided in a pull
request.
