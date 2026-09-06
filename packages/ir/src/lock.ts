import { readFileSync, writeFileSync } from "node:fs";
import { type Nid, nidFrom, type Qid } from "@forgeir/core";

export type Lockfile = {
  schema: "forge.lock/v1";
  ids: Record<Qid, Nid>;
};

export function emptyLock(): Lockfile {
  return { schema: "forge.lock/v1", ids: {} };
}

export function loadLock(path: string): Lockfile {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<Lockfile>;
    if (
      raw.schema !== "forge.lock/v1" ||
      typeof raw.ids !== "object" ||
      !raw.ids
    ) {
      return emptyLock();
    }
    return { schema: "forge.lock/v1", ids: { ...raw.ids } };
  } catch {
    return emptyLock();
  }
}

export function saveLock(path: string, lock: Lockfile): void {
  const ids: Record<string, string> = {};
  for (const key of Object.keys(lock.ids).sort()) {
    const nid = lock.ids[key];
    if (nid) {
      ids[key] = nid;
    }
  }
  writeFileSync(
    path,
    `${JSON.stringify({ schema: "forge.lock/v1", ids }, null, 2)}\n`,
    "utf8",
  );
}

export function upsertNid(lock: Lockfile, qid: Qid): Nid {
  const existing = lock.ids[qid];
  if (existing) {
    return existing;
  }
  const nid = nidFrom(qid);
  lock.ids[qid] = nid;
  return nid;
}

export function lockIdsEqual(a: Lockfile, b: Lockfile): boolean {
  const keys = new Set([...Object.keys(a.ids), ...Object.keys(b.ids)]);
  for (const key of keys) {
    if (a.ids[key] !== b.ids[key]) {
      return false;
    }
  }
  return true;
}

export function retargetQid(lock: Lockfile, from: Qid, to: Qid): Lockfile {
  if (from === to) {
    return { schema: lock.schema, ids: { ...lock.ids } };
  }
  const kept: Record<string, Nid> = {};
  const moved: Record<string, Nid> = {};
  for (const [qid, nid] of Object.entries(lock.ids)) {
    if (!nid) {
      continue;
    }
    if (
      qid === from ||
      qid.startsWith(`${from}.`) ||
      qid.startsWith(`${from}/`) ||
      qid.startsWith(`${from}@`)
    ) {
      moved[`${to}${qid.slice(from.length)}`] = nid;
    } else {
      kept[qid] = nid;
    }
  }
  return { schema: lock.schema, ids: { ...kept, ...moved } };
}
