export type {
  CompactNode,
  GetDetail,
  Graph,
  IrKind,
  IrNode,
  QueryOpts,
} from "./graph.ts";
export {
  compactNode,
  exprSpan,
  findNode,
  getNode,
  indexModule,
  isSymbol,
  matchesSelector,
  queryGraph,
} from "./graph.ts";
export type { Lockfile } from "./lock.ts";
export {
  emptyLock,
  loadLock,
  saveLock,
  upsertNid,
} from "./lock.ts";
