import { createHash } from "node:crypto";

export type Qid = string;
export type Nid = string;
export type Hid = string;

export type Span = {
  file: string;
  start: number;
  end: number;
};

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hidOf(canonical: string): Hid {
  return `hid_${sha256Hex(canonical).slice(0, 16)}`;
}

export function nidFrom(seed: string): Nid {
  return `nid_${sha256Hex(seed).slice(0, 16)}`;
}

export function qidJoin(...parts: string[]): Qid {
  return parts.filter((p) => p.length > 0).join(".");
}
