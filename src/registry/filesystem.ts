import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import type {
  Capability,
  CapabilityFile,
  CapabilityFileType,
  CapabilityResource,
  CapabilityRegistry,
  CapabilitySearchResult,
} from "./types";

const IGNORED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);

interface Frontmatter {
  name?: string;
  description?: string;
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function parseFrontmatter(markdown: string): Frontmatter {
  if (!markdown.startsWith("---")) return {};

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return {};

  const frontmatter = markdown.slice(3, end).trim();
  const parsed: Frontmatter = {};

  for (const line of frontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    if (key === "name") parsed.name = value;
    if (key === "description") parsed.description = value;
  }

  return parsed;
}

function detectFileType(path: string): CapabilityFileType {
  if (path === "SKILL.md") return "skill";
  if (path === "README.md") return "readme";
  if (path === "BUNDLE.md") return "bundle";
  if (path.startsWith("agents/") && path.endsWith(".md")) return "agent";
  if (path.startsWith("shared/") && path.endsWith(".md")) return "shared";
  if (path.startsWith("scripts/")) return "script";
  if (path.startsWith("assets/")) return "asset";
  return "other";
}

function mimeTypeFor(path: string): string {
  if (path.endsWith(".md")) return "text/markdown";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".txt")) return "text/plain";
  return "text/plain";
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;

    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function sortCapabilityFiles(files: CapabilityFile[]): CapabilityFile[] {
  const priority = new Map([
    ["SKILL.md", 0],
    ["README.md", 1],
    ["BUNDLE.md", 2],
  ]);

  return files.sort((a, b) => {
    const aPriority = priority.get(a.path) ?? 10;
    const bPriority = priority.get(b.path) ?? 10;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.path.localeCompare(b.path);
  });
}

export class FileSystemCapabilityRegistry implements CapabilityRegistry {
  private constructor(private readonly capabilities: Capability[]) {}

  static async scan(root: string): Promise<FileSystemCapabilityRegistry> {
    const entries = await readdir(root, { withFileTypes: true });
    const capabilities: Capability[] = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || IGNORED_NAMES.has(entry.name) || entry.name.startsWith(".")) {
        continue;
      }

      const capabilityRoot = join(root, entry.name);
      const skillPath = join(capabilityRoot, "SKILL.md");
      const skillStat = await stat(skillPath).catch(() => null);
      if (!skillStat?.isFile()) continue;

      capabilities.push(await this.readCapability(entry.name, capabilityRoot));
    }

    return new FileSystemCapabilityRegistry(capabilities);
  }

  static fromSnapshot(capabilities: Capability[]): FileSystemCapabilityRegistry {
    return new FileSystemCapabilityRegistry(capabilities);
  }

  private static async readCapability(id: string, root: string): Promise<Capability> {
    const skillText = await readFile(join(root, "SKILL.md"), "utf-8");
    const frontmatter = parseFrontmatter(skillText);
    const files = await Promise.all(
      (await walkFiles(root))
        .map((fullPath) => normalizePath(relative(root, fullPath)))
        .map(async (path) => {
          const text = await readFile(join(root, path), "utf-8");
          return {
            capabilityId: id,
            path,
            uri: `skill://${id}/${path}`,
            name: `${id}/${path}`,
            type: detectFileType(path),
            mimeType: mimeTypeFor(path),
            text,
            lines: text.split("\n").length,
          } satisfies CapabilityFile;
        }),
    );

    return {
      id,
      name: frontmatter.name || id,
      description: frontmatter.description || "",
      rootPath: root,
      files: sortCapabilityFiles(files),
    };
  }

  listCapabilities(): Capability[] {
    return this.capabilities.map((capability) => ({
      ...capability,
      files: [...capability.files],
    }));
  }

  getCapability(id: string): Capability | undefined {
    const capability = this.capabilities.find((item) => item.id === id);
    if (!capability) return undefined;
    return { ...capability, files: [...capability.files] };
  }

  listResources(): CapabilityResource[] {
    return this.capabilities.flatMap((capability) =>
      capability.files.map((file) => ({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        description: `${capability.name}: ${file.path}`,
      })),
    );
  }

  readResource(uri: string): CapabilityFile {
    const file = this.capabilities.flatMap((capability) => capability.files).find((item) => item.uri === uri);
    if (!file) throw new Error(`Resource not found: ${uri}`);
    return file;
  }

  search(query: string): CapabilitySearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return this.capabilities.flatMap((capability) =>
      capability.files
        .filter((file) => file.mimeType.startsWith("text/"))
        .filter((file) => file.text.toLowerCase().includes(normalizedQuery))
        .map((file) => {
          const snippet =
            file.text
              .split("\n")
              .find((line) => line.toLowerCase().includes(normalizedQuery))
              ?.trim() || "";

          return {
            capabilityId: capability.id,
            capabilityName: capability.name,
            path: file.path,
            uri: file.uri,
            title: basename(file.path),
            snippet,
          };
        }),
    );
  }
}
