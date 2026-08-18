import { isBinaryExtension } from "../registry/text";
import type { CapabilityLicense } from "../registry/types";
import { fetchBytes, fetchJson, SourceUnavailableError } from "./http";
import { assertSafeRelativePath, capabilityIdFor, classifySkill, hashFileSet } from "./normalize";
import type {
  ContentSourceAdapter,
  DiscoveredFileRef,
  DiscoveredSkill,
  FetchedFile,
  GitHubSourceDefinition,
  SourceRevision,
} from "./types";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const DEFAULT_MAX_FILES = 200;

interface RepoResponse {
  default_branch: string;
  html_url: string;
  license?: { spdx_id?: string; name?: string; url?: string } | null;
}

interface CommitResponse {
  sha: string;
}

interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

interface TreeResponse {
  tree: TreeEntry[];
  truncated?: boolean;
}

function repoParts(repository: string): { owner: string; name: string } {
  const [owner, name, ...rest] = repository.split("/");
  if (!owner || !name || rest.length > 0) {
    throw new SourceUnavailableError(`Invalid GitHub repository: ${repository}`);
  }
  return { owner, name };
}

/** SPDX id only when GitHub actually identified a license; never assumed. */
function readLicense(repo: RepoResponse, repository: string, ref: string): CapabilityLicense | undefined {
  const spdxId = repo.license?.spdx_id;
  if (!spdxId || spdxId === "NOASSERTION") return undefined;

  return {
    spdxId,
    name: repo.license?.name || undefined,
    url: `https://github.com/${repository}/blob/${ref}/LICENSE`,
  };
}

function isUnderRoots(path: string, roots?: string[]): boolean {
  if (!roots || roots.length === 0) return true;
  return roots.some((root) => {
    const normalized = root.replace(/^\/+|\/+$/g, "");
    return normalized === "" || path === normalized || path.startsWith(`${normalized}/`);
  });
}

function isSelected(slug: string, source: GitHubSourceDefinition): boolean {
  if (source.exclude?.includes(slug)) return false;
  if (!source.include || source.include.length === 0) return true;
  return source.include.includes(slug);
}

export class GitHubSourceAdapter implements ContentSourceAdapter<GitHubSourceDefinition> {
  readonly type = "github";

  private repoCache = new Map<string, RepoResponse>();

  private async getRepo(repository: string): Promise<RepoResponse> {
    const cached = this.repoCache.get(repository);
    if (cached) return cached;

    const { owner, name } = repoParts(repository);
    const repo = await fetchJson<RepoResponse>(`${API}/repos/${owner}/${name}`);
    this.repoCache.set(repository, repo);
    return repo;
  }

  /** The commit SHA the ref points at: the only revision we ever record. */
  async getRevision(source: GitHubSourceDefinition): Promise<SourceRevision> {
    const { owner, name } = repoParts(source.repository);
    const repo = await this.getRepo(source.repository);
    const ref = source.ref || repo.default_branch;

    const commit = await fetchJson<CommitResponse>(
      `${API}/repos/${owner}/${name}/commits/${encodeURIComponent(ref)}`,
    );

    if (!commit.sha) {
      throw new SourceUnavailableError(`No commit found for ${source.repository}@${ref}`);
    }

    return {
      kind: "git-commit",
      value: commit.sha,
      url: `https://github.com/${source.repository}/tree/${commit.sha}`,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Walks the tree once at the pinned commit and groups blobs by the directory
   * holding their `SKILL.md`. A repository with many skills therefore costs one
   * API call, and every file already carries its blob SHA, so change detection
   * needs no download at all.
   */
  async discover(source: GitHubSourceDefinition, revision: SourceRevision): Promise<DiscoveredSkill[]> {
    const { owner, name } = repoParts(source.repository);
    const repo = await this.getRepo(source.repository);
    const ref = source.ref || repo.default_branch;

    const tree = await fetchJson<TreeResponse>(
      `${API}/repos/${owner}/${name}/git/trees/${revision.value}?recursive=1`,
    );

    if (tree.truncated) {
      throw new SourceUnavailableError(
        `GitHub tree for ${source.repository} is truncated; narrow the source with "roots"`,
      );
    }

    const blobs = tree.tree.filter((entry) => entry.type === "blob");
    const skillRoots = blobs
      .filter((entry) => entry.path.endsWith("SKILL.md") && isUnderRoots(entry.path, source.roots))
      .map((entry) => entry.path.slice(0, Math.max(0, entry.path.length - "SKILL.md".length - 1)))
      .filter((root, index, all) => all.indexOf(root) === index)
      .sort((a, b) => a.localeCompare(b));

    const license = readLicense(repo, source.repository, revision.value);
    const namespace = source.namespace || name;
    const maxFileBytes = source.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    const maxFiles = source.maxFiles ?? DEFAULT_MAX_FILES;

    const skills: DiscoveredSkill[] = [];

    for (const root of skillRoots) {
      const slug = root.split("/").filter(Boolean).at(-1) || name;
      if (!isSelected(slug, source)) continue;

      const prefix = root === "" ? "" : `${root}/`;
      // A nested skill is its own capability: never fold its files into the parent.
      const nestedRoots = skillRoots.filter((candidate) => candidate !== root && candidate.startsWith(prefix));
      const entries = blobs.filter(
        (entry) =>
          entry.path.startsWith(prefix) &&
          entry.path !== prefix &&
          !nestedRoots.some((nested) => entry.path.startsWith(`${nested}/`)),
      );

      const files: DiscoveredFileRef[] = [];
      const skippedAssets: DiscoveredSkill["skippedAssets"] = [];

      for (const entry of entries) {
        const relative = entry.path.slice(prefix.length);

        let safePath: string;
        try {
          safePath = assertSafeRelativePath(relative);
        } catch {
          continue;
        }

        const binary = isBinaryExtension(safePath);
        const bytes = entry.size ?? 0;
        const url = `${RAW}/${source.repository}/${revision.value}/${prefix}${safePath}`;

        if (binary && !source.downloadBinaries) {
          skippedAssets.push({ path: safePath, bytes, reason: "binary", url, sha: entry.sha });
          continue;
        }
        if (bytes > maxFileBytes) {
          skippedAssets.push({ path: safePath, bytes, reason: `larger than ${maxFileBytes} bytes`, url, sha: entry.sha });
          continue;
        }

        files.push({ path: safePath, bytes, binary, sha: entry.sha, url });
      }

      if (!files.some((file) => file.path === "SKILL.md")) continue;
      if (files.length > maxFiles) {
        throw new SourceUnavailableError(
          `Skill ${source.repository}/${root} has ${files.length} files (cap ${maxFiles})`,
        );
      }

      // Classified from paths alone: discovery must stay download-free so an
      // unchanged capability costs nothing. The manifest refines this with the
      // SKILL.md text once the content is actually fetched.
      const classification = classifySkill(
        [...files, ...skippedAssets.map((asset) => ({ path: asset.path, binary: true }))],
        "",
      );

      skills.push({
        namespace,
        slug,
        capabilityId: capabilityIdFor(namespace, slug),
        files,
        contentHash: hashFileSet(files),
        skillKind: classification.kind,
        skillTraits: classification.traits,
        license,
        skippedAssets,
        origin: {
          type: "github",
          sourceId: source.id,
          repository: source.repository,
          path: root,
          ref,
          commit: revision.value,
          url: `https://github.com/${source.repository}/tree/${revision.value}/${root}`,
          revision: { kind: revision.kind, value: revision.value },
          contentHash: hashFileSet(files),
          license,
          skillKind: classification.kind,
          skillTraits: classification.traits,
          skippedAssets,
        },
      });
    }

    return skills;
  }

  async fetch(source: GitHubSourceDefinition, skill: DiscoveredSkill): Promise<FetchedFile[]> {
    const maxFileBytes = source.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;

    return Promise.all(
      skill.files.map(async (file) => ({
        path: assertSafeRelativePath(file.path),
        bytes: await fetchBytes(file.url, { maxBytes: maxFileBytes }),
      })),
    );
  }
}
