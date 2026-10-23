import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });

  it("provides IndexedDB via fake-indexeddb", () => {
    expect(globalThis.indexedDB).toBeDefined();
  });
});
