import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";
import { decodeTextContent, isBinaryExtension, mimeTypeFor } from "../text";

const binaryFixturesRoot = resolve("test/fixtures/binary-capabilities");

describe("binary file handling", () => {
  it("never decodes a binary extension, even when the bytes are valid UTF-8", () => {
    expect(decodeTextContent("assets/logo.png", new TextEncoder().encode("hello"))).toBeUndefined();
    expect(decodeTextContent("references/notes.md", new TextEncoder().encode("hello"))).toBe("hello");
  });

  it("treats a NUL byte as binary regardless of the extension", () => {
    expect(decodeTextContent("data/table.csv", new Uint8Array([0x61, 0x00, 0x62]))).toBeUndefined();
  });

  it("rejects invalid UTF-8 instead of producing replacement characters", () => {
    expect(decodeTextContent("notes.md", new Uint8Array([0xff, 0xfe, 0x41]))).toBeUndefined();
  });

  it("maps known extensions to their media type", () => {
    expect(mimeTypeFor("assets/logo.png")).toBe("image/png");
    expect(mimeTypeFor("data/rows.csv")).toBe("text/csv");
    expect(mimeTypeFor("SKILL.md")).toBe("text/markdown");
    expect(isBinaryExtension("fonts/Inter.ttf")).toBe(true);
  });

  it("indexes a binary asset as metadata without decoding it", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(binaryFixturesRoot);
    const capability = registry.getCapability("binary-skill");
    const asset = capability?.files.find((file) => file.path === "assets/pixel.png");

    expect(asset).toMatchObject({
      type: "asset",
      mimeType: "image/png",
      binary: true,
      lines: 0,
      bytes: 70,
    });
    expect(asset?.text).toBeUndefined();
    expect(asset?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps binary assets out of readable MCP resources", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(binaryFixturesRoot);

    expect(registry.listResources().map((resource) => resource.uri)).toEqual([
      "skill://binary-skill/SKILL.md",
    ]);
  });

  it("explains why a binary resource cannot be read as text", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(binaryFixturesRoot);

    expect(() => registry.readResource("skill://binary-skill/assets/pixel.png")).toThrow(
      /Binary resource is not readable as text/,
    );
  });

  it("still scans a capability that contains binary files", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(binaryFixturesRoot);

    expect(registry.getCapability("binary-skill")).toMatchObject({
      name: "binary-skill",
      description: "Capability shipping a binary asset alongside markdown.",
      tags: ["assets", "images"],
    });
  });
});
