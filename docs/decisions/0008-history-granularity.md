# 0008. What granular history means, and where it lives

Status: accepted.
Issue: #31.

Sizes are cited by the names in record 0003.

## What already exists upstream

This is not history where there is none. The upstream tool takes file snapshots,
lets a user label one, and lists them from the backend. The shape of that feature
is read out of its source rather than from the product description, fetched
2026-08-07 UTC:

    gh api repos/penpot/penpot/contents/backend/src/app/features/file_snapshots.clj --jq .content | base64 -d

Five facts out of that file carry most of the reasoning below.

Snapshots are rows in a table named `file_change`, joined to file data of type
`snapshot`, and the listing query selects only rows where a label is present:

    gh api repos/penpot/penpot/contents/backend/src/app/features/file_snapshots.clj --jq .content | base64 -d | sed -n '45,49p'
         FROM file_change AS c
         LEFT JOIN file_data AS fd ON (fd.file_id = c.file_id
                                       AND fd.id = c.id
                                       AND fd.type = 'snapshot')
        WHERE c.label IS NOT NULL

The indentation is the source's own. The Clojure string terminator that closes the
last of those five lines is dropped here so the block reads as the SQL it is.

Each snapshot carries who caused it, as an enum of three values:

    [:created-by [:enum "system" "user" "admin"]]

The listing is bounded rather than complete. It takes at most 500 system-created
and 500 user-created snapshots per file, as two limited selects unioned together,
and system-created ones are additionally filtered by a deletion timestamp. The
module offers create, update, restore, delete, lock and unlock operations on a
snapshot, and a reduce operation over them.

So upstream's unit is the whole file at a moment, identified by a label, revision
number and timestamp. What it cannot answer is what changed between two of them,
because it stores states and not transitions.

## The position

**A user recovers a change, not a moment. The store is a hybrid: periodic whole
file snapshots with the operations that happened between them, and a recovery is
a snapshot plus a replay of operations up to the chosen point.**

**History is per file, and an entry is addressed by the objects it touched.** The
two halves of that sentence are separate claims and the section on the unit below
separates them.

## The three options and what each costs

Costs are stated in three currencies because the options do not trade against each
other in only one: storage, recovery time, and the migration burden that lands on
every future change to the document model.

**Snapshot the whole file more often.** It is simple, it is what upstream already
does, and it is correct by construction because a stored state cannot be wrong
about itself.

Storage: the worst of the three. Every snapshot is a whole file, so cost scales
with file size times snapshot frequency, and a `beyond` file snapshotted often is
the case where an operator notices. Recovery time: the best of the three, because
recovery is a read with no replay. Migration burden: the highest, and this is the
cost that is usually missed. Every stored snapshot is a document in the format of
the day it was written, so a change to the document model has to migrate every
snapshot or carry a reader for every historical format forever. Upstream already
carries per-snapshot migration and version fields, which is what that burden looks
like in practice.

The reason it is rejected is not the storage. It is that this option cannot
deliver the feature at all. A sequence of states does not say what changed
between them without a diff, and a diff computed after the fact over two whole
documents recovers a description of the difference rather than the change the user
made. Those are not the same thing: moving a shape and deleting it then drawing an
identical one in the new place produce the same difference and are different
changes.

**Record the operations that produced each state, and nothing else.** Storage: the
best of the three, because an operation is small next to a document. Recovery
time: the worst, because recovering an old state means replaying from the
beginning of the file's life, and on a `strained` or `beyond` file that is a long
replay that gets longer forever. Migration burden: the worst in kind rather than
in size. Every operation's meaning has to stay stable or be migrated, and an
operation's meaning is harder to migrate than a document's shape because it is a
function rather than a value. A change to what an operation means makes every
historical use of it either wrong or in need of a rewritten equivalent, and this
burden lands on every future change to the document model rather than on the
history feature.

**The hybrid: periodic whole file snapshots with the operations between them.**
This is what systems that have solved this converge on, and it costs the
complexity of both plus the seam between them, which is the part that goes wrong.

Storage: between the two, and controllable, because the snapshot interval is a
knob rather than a constant. Recovery time: bounded rather than unbounded, because
a replay never starts further back than the previous snapshot. Migration burden:
between the two, and the reason it is not the sum of both is the seam: an
operation log that is only ever replayed forward from the nearest snapshot has a
bounded horizon, so an operation whose meaning changed can be handled by cutting a
new snapshot and retiring the operations before it rather than by migrating them.

It is chosen because the first option cannot deliver the feature and the second
puts an unbounded migration burden on every future change to the document model,
which is a cost paid by people who are not working on history.

**None of the three costs above is measured.** They are reasoning from the shape
of each option, not from a number produced here. Issue #32 is where the storage
cost per file is put on a number against the sizes in record 0003, and it is
entitled to contradict this section. If the hybrid's storage turns out to be
closer to the whole-file option than to the operation log at `strained`, that is
an amendment here with the measurement as its argument, and the original text
stays visible.

## The unit a user can recover

In the vocabulary a designer uses, not the vocabulary the storage uses.

**A user recovers an edit.** An edit is one thing they did that they would
describe in one clause: moved these three layers, changed this fill, renamed this
component, applied this token, deleted this frame. It carries what was touched, in
the names the user sees, and when it happened.

The unit is not a transaction, an operation, a delta, a revision, a commit or a
patch. Those are storage words, and a history feature that shows them has moved
its own vocabulary into the interface. Where an edit is stored as several
operations, the several are presented as the one edit, and where the storage
cannot group them, the interface shows what it can rather than inventing a
grouping.

**An edit is addressed by the objects it touched**, so the question a designer
actually asks, what happened to this component, is answerable without reading the
whole history of the file. That is a requirement on the index rather than a
storage decision, and issue #35 is where the presentation of a difference between
two entries is built in the same vocabulary.

## Per file, per page, or per object

**History is per file.** The other two are rejected, and the reasons differ.

**Per page is rejected because a page is not a boundary the data respects.** A
component defined on one page and instanced on another means an edit to the
definition changes what is drawn on a page it did not touch. History scoped to a
page would either miss that edit or claim it happened on a page where nothing was
edited, and both are wrong in a way a user would notice.

**Per object is rejected as the storage unit and kept as the index.** A history
whose store is per object cannot answer what the file looked like at a moment,
because reassembling a moment means joining every object's timeline, and the
number of objects is exactly the axis record 0003 says these files are large
along. So the store is per file and the per-object question is answered by an
index over it, which is the addressing sentence above. This is the one place where
the rejected option survives as half of the answer, and saying so is better than
implying per object was rejected outright.

Per file also matches where the data already is. Upstream's snapshots are rows
keyed by file, its restore operates on a file, and its visible-snapshot limits are
per file, all read out of the module fetched above. A different scope would mean
running two granularities against one store.

## What history does not promise

Stated so that a user cannot infer a guarantee the implementation does not make.

**It does not promise that every keystroke is recoverable.** The store has a
snapshot interval and an operation log, and both are subject to the retention and
disk budget the operator sets in issue #36. An edit older than the retention is
gone, and the interface says it is gone rather than showing an empty list.

**It does not promise a merge.** Recovering an edit means putting the file back
the way it was for what that edit touched. It does not reconcile that with work
done since on the same objects, and it does not offer a three-way merge. Issue #34
is where restoring is proved not to move anything it was not asked to move, which
is the guarantee that is actually made.

**It does not promise a record of who did what for audit.** Upstream's snapshots
carry a profile identifier and a created-by enum, so some of that information
exists, but this project makes no completeness or tamper-evidence claim about it,
and a claim of that kind would need a threat model this project has not written.

**It does not promise history survives a file being deleted.** Issue #37 decides
what deletion means for history when a person asks for their data to be removed,
and a promise here that history is permanent would contradict the answer that
issue has to give.

**It does not promise the same granularity for every kind of change.** Some
changes will group into one edit and some will not, depending on how they reach
the store. The interface shows the grouping it has rather than a uniform one it
does not.

## Where the work lands

Applying record 0002's test.

The store is an extension of the upstream `file_change` table and the snapshot
module fetched above, not a parallel store beside it. That is a deliberate
consequence of this record: a second history store next to upstream's would mean
two things claiming to answer the same question.

**The store and the operation log are offered upstream.** By question 1, a
designer using the upstream tool with no knowledge of this project wants to
recover a change rather than a whole file, and the feature is correct for them
with no reference to this project's packaging, defaults or measurement. This is
the largest part of the work and it is the part most likely to be argued about
rather than declined outright, because it changes a table upstream owns.

**Retention policy, disk budget and the operator-facing controls are expected in
the overlay, by question 3.** A default retention is a default upstream is
entitled to choose differently, and issue #36 is where this project's is set. The
mechanism that enforces a budget is question 1 work and goes upstream with the
store; the number it is set to is question 3 work and stays here.

**Anything that exists so this project can measure history stays in the overlay,
by question 2.** A counter, a mark or a fixture that only means something against
the corpus in issue #13 depends on something only this repository has.

This is an expectation rather than a plan. Record 0002's test is applied per
change when the change exists, and a decline upstream moves that change to the
overlay with what came back recorded, which is the ordinary case rather than a
failure.

## What no machine refuses today

Nothing in this tree records a history entry, restores one or compares two, so
every rule above is a position and none of it is refused. That covers the unit a
user can recover, the vocabulary a difference has to be presented in, and the
list of things history does not promise, which is the one most likely to be read
as a guarantee because it is written as a limit.

What would carry them is named rather than left to be found. Issue #38 asks for
the snapshot policy, the recording path, the retention logic, the comparison and
the restore to be covered with no display and no GPU, including the paths where
they fail. Issue #34 holds the comparison that refuses a field the document model
gained without being added to it, which is the one rule here whose absence is
silent rather than visible: a comparison that skips a field reports equal.

Both need the store, which is issue #32.

## What this record does not decide

It does not decide the storage format, the snapshot interval or the compaction
strategy, which is issue #32 along with the number this record's cost section is
missing.

It does not decide the retention policy or the disk budget, which is issue #36.

It does not decide what deletion means, which is issue #37.

It does not decide how a difference between two entries is presented, which is
issue #35, beyond fixing the vocabulary it has to be presented in.
