# ADR-003: Git-canonical source with stable node IDs

- Status: accepted
- Date: 2026-09-05

## Decision

`.fir` files in git are the human-canonical program. Identity uses three IDs:

- `qid` — qualified name (`examples.add.add`), changes on rename
- `nid` — stable node id (`nid_` + hex); symbol nids live in `forge.lock.json`
- `hid` — content hash (`hid_` + hex of canonical IR)

Generated TypeScript is an artifact, never canonical.

## Why

Unison-style SQLite as source of truth fights GitHub PRs. Darklang-style hosted ASTs are not cloneable OSS. Agents still need identity that is not a file offset.

## Alternatives

- Content-addressed database as canonical store
- Embed ULIDs in surface syntax
- Qualified names only (rename becomes a new symbol)

## Consequences

M0 derived `nid` from a seed (usually qid) without writing `forge.lock.json`. M2 writes a committed `forge.lock.json` that maps **symbol** qids to nids. A new qid still gets a new nid; rename-preserving identity is not implemented. Expr nids are derived from expr qids and are not stored.

## Revisit when

Two-branch merge fixtures show lockfile conflicts, or we prove a better identity scheme in benchmarks.
