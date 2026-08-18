import { describe, expect, it } from "vitest";
import { assertSafeSegment, capabilityIdFor, slugify } from "../names";

describe("assertSafeSegment", () => {
  it("accepts a plain namespace", () => {
    expect(assertSafeSegment("ui-skills", "namespace")).toBe("ui-skills");
  });

  it("accepts a plain slug", () => {
    expect(assertSafeSegment("improve-ui", "slug")).toBe("improve-ui");
  });

  it.each([
    ["parent traversal", "../etc"],
    ["absolute path", "/etc"],
    ["windows backslash", "..\\etc"],
    ["null byte", "a\0b"],
    ["embedded slash", "a/b"],
    ["reserved segment", "node_modules"],
    ["dotdot", ".."],
    ["dot", "."],
    ["git dir", ".git"],
  ])("rejects %s", (_label: string, value: string) => {
    expect(() => assertSafeSegment(value, "namespace")).toThrow(/Unsafe namespace/);
    expect(() => assertSafeSegment(value, "slug")).toThrow(/Unsafe slug/);
  });
});

describe("capabilityIdFor", () => {
  it("prefixes a synced slug with its namespace", () => {
    expect(capabilityIdFor("ui-skills", "improve-ui")).toBe("ui-skills-improve-ui");
    expect(capabilityIdFor("matt-pocock", "codebase-design")).toBe("matt-pocock-codebase-design");
  });

  it("exposes a local namespace by slug alone, without a local- prefix", () => {
    expect(capabilityIdFor("local", "landing-page")).toBe("landing-page");
    expect(capabilityIdFor("", "landing-page")).toBe("landing-page");
  });
});

describe("slugify", () => {
  it("lowercases, strips accents and collapses separators", () => {
    expect(slugify("  Improve   UI  ")).toBe("improve-ui");
    expect(slugify("Màtt Pöcock")).toBe("matt-pocock");
  });
});