import { hidOf, nidFrom, qidJoin, sha256Hex } from "@forgeir/core";
import { describe, expect, it } from "vitest";

describe("core identifiers", () => {
  it("joins qualified names with dots", () => {
    expect(qidJoin("examples.add", "add")).toBe("examples.add.add");
  });

  it("hashes text with sha256 hex", () => {
    // SHA-256("abc") — known test vector
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("forgeir")).not.toBe(sha256Hex("ForgeIR"));
  });

  it("builds stable content hashes and node ids from a seed", () => {
    expect(hidOf("fn add")).toBe(hidOf("fn add"));
    expect(hidOf("fn add")).toMatch(/^hid_[0-9a-f]{16}$/);
    expect(nidFrom("examples.add.add")).toMatch(/^nid_[0-9a-f]{16}$/);
    expect(nidFrom("examples.add.add")).toBe(nidFrom("examples.add.add"));
    expect(nidFrom("examples.add.add")).not.toBe(nidFrom("examples.add.sub"));
  });
});
