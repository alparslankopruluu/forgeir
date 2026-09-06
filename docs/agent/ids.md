# IDs, query, and patch (M2)

Three identifiers (ADR-003):

- `qid` — qualified name. Changes if the name changes. Examples: `examples.add`, `examples.add.add`, `examples.add.add/param/a`, `examples.add.add@body`, `examples.wrap.basename` (extern).
- `nid` — stable id (`nid_` + hex). **Symbol** nids (module, record, field, fn, param) are stored in `forge.lock.json`. **Expr** nids are derived from the expr qid and are not stored.
- `hid` — `hid_` + hex of the source slice for that node.

Lockfile schema is `forge.lock/v1`: a sorted `qid → nid` map. `forge lock <file>` upserts that file's symbols into `./forge.lock.json` and does not delete other modules. `forge check` does not write the lockfile.

Silent source edits that change a name allocate a new nid. **`rename` patch** retargets lockfile keys so the nid follows the symbol: `examples.add.add` → `examples.add.sum` keeps the same nid, including `/param/` children. Expr nids are not stored and still change.

## Query

Selector is an exact `qid` or `nid`, or a prefix followed by `.`, `@`, or `/`.

```
pnpm forge query examples/add/main.fir
pnpm forge query examples/add/main.fir examples.add
pnpm forge query examples/add/main.fir examples.add.add --kind expr
pnpm forge get examples/add/main.fir examples.add.add --detail compact
pnpm forge get examples/add/main.fir examples.add.add@body --detail body
```

Default kind is `symbol` (no exprs). Default limit is 20. Query never dumps source. `get --detail body` returns a snippet of that node only (cap 8KiB).

## Patch

Ops: `replace_expr` (expr or fn body) and `rename` (fn, extern, or record in the same file; updates call/construct/type sites). Default is preview. `--apply` / MCP `mode: apply` writes if the selector is valid (`PATCH-001` refuses bad targets). Rename apply also rewrites `forge.lock.json` keys when they change. `replace_expr` apply may write a program that still has type errors.

```
pnpm forge patch examples/add/main.fir --qid examples.add.add@body --expr 'a - b'
pnpm forge patch examples/add/main.fir --qid examples.add.add --rename sum
```

MCP tools (5, cap 8): `forge_status`, `forge_validate`, `forge_query`, `forge_get`, `forge_patch`.
