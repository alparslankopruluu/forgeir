import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function moduleCandidates(qid: string, root: string): string[] {
  const rel = qid.split(".").join("/");
  return [join(root, rel, "main.fir"), join(root, `${rel}.fir`)];
}

export function resolveFir(qid: string, root: string): string | null {
  for (const path of moduleCandidates(qid, root)) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

export function readFir(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}
