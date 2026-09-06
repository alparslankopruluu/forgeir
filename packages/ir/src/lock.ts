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
