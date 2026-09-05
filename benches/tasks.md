# Initial benchmark tasks

Definitions only. None of these except T01 have an implementation harness in M0.

| ID | Task | Why |
|---|---|---|
| T01 | Hello / `add` | smoke |
| T02 | Fizzbuzz | control flow |
| T03 | Record + field access | data |
| T04 | `Option` map/unwrap | null alternative |
| T05 | `Result` propagate | errors |
| T06 | List filter/map/fold | collections |
| T07 | Binary search | algorithms |
| T08 | Word count | strings |
| T09 | Parse JSON via extern | interop |
| T10 | CSV to records | file + parse |
| T11 | HTTP GET | effects `net` |
| T12 | HTTP retry/backoff | loops + effects |
| T13 | CLI argv | `env` |
| T14 | In-memory CRUD | modules |
| T15 | Config from env | defaults |
| T16 | Pure authz predicate | no effects |
| T17 | Type error repair (str vs int) | diagnostics |
| T18 | Add record field + fix sites | patch |
| T19 | Rename function across files | semantic rename |
| T20 | Change timeout literal | 1-node patch |
| T21 | Effect violation (fs in pure) | effects |
| T22 | Wrap `node:crypto` hash | extern |
| T23 | Two-module import | resolver |
| T24 | Implement T12 then patch T20 without rewriting the file | thesis test |
