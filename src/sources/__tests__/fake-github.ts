import { createHash } from "node:crypto";
import { vi } from "vitest";

/**
 * Minimal in-memory GitHub, so adapter tests exercise the real code paths
 * (revision → tree → raw download) without touching the network.
 */

export interface FakeRepo {
  repository: string;
  commit: string;
  defaultBranch?: string;
  license?: { spdx_id: string; name: string } | null;
  files: Record<string, string | Uint8Array>;
  /** Force the tree endpoint to report truncation. */
  truncated?: boolean;
}

function blobSha(content: string | Uint8Array): string {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  return createHash("sha1").update(bytes).digest("hex");
}

function byteLength(content: string | Uint8Array): number {
  return typeof content === "string" ? new TextEncoder().encode(content).byteLength : content.byteLength;
}

function buildTree(repo: FakeRepo) {
  const directories = new Set<string>();
  const blobs = Object.entries(repo.files).map(([path, content]) => {
    const segments = path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }

    return { path, type: "blob" as const, sha: blobSha(content), size: byteLength(content) };
  });

  return [
    ...[...directories].map((path) => ({ path, type: "tree" as const, sha: blobSha(path) })),
    ...blobs,
  ];
}

export interface FakeGitHub {
  /** Every URL requested, in order. */
  requests: string[];
  /** Replace a file and move the commit, as a real push would. */
  update(path: string, content: string, commit: string): void;
  remove(path: string, commit: string): void;
}

export function installFakeGitHub(repos: FakeRepo[]): FakeGitHub {
  const state = new Map(repos.map((repo) => [repo.repository, { ...repo }]));
  const requests: string[] = [];

  const respond = (body: unknown) => Response.json(body);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      const url = typeof input === "string" ? input : input.toString();
      requests.push(url);

      const repoMatch = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/?]+)$/);
      if (repoMatch) {
        const repo = state.get(`${repoMatch[1]}/${repoMatch[2]}`);
        if (!repo) return new Response("Not Found", { status: 404 });

        return respond({
          default_branch: repo.defaultBranch || "main",
          html_url: `https://github.com/${repo.repository}`,
          license: repo.license === undefined ? { spdx_id: "MIT", name: "MIT License" } : repo.license,
        });
      }

      const commitMatch = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/commits\/(.+)$/);
      if (commitMatch) {
        const repo = state.get(`${commitMatch[1]}/${commitMatch[2]}`);
        if (!repo) return new Response("Not Found", { status: 404 });
        return respond({ sha: repo.commit });
      }

      const treeMatch = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/git\/trees\/([^?]+)/);
      if (treeMatch) {
        const repo = state.get(`${treeMatch[1]}/${treeMatch[2]}`);
        if (!repo) return new Response("Not Found", { status: 404 });
        return respond({ tree: buildTree(repo), truncated: repo.truncated === true });
      }

      const rawMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
      if (rawMatch) {
        const repo = state.get(`${rawMatch[1]}/${rawMatch[2]}`);
        const content = repo?.files[rawMatch[4]];
        if (content === undefined) return new Response("Not Found", { status: 404 });

        return typeof content === "string"
          ? new Response(content)
          : new Response(content as unknown as BodyInit);
      }

      return new Response("Not Found", { status: 404 });
    }),
  );

  return {
    requests,
    update(path, content, commit) {
      for (const repo of state.values()) {
        if (path in repo.files) {
          repo.files[path] = content;
          repo.commit = commit;
        }
      }
    },
    remove(path, commit) {
      for (const repo of state.values()) {
        if (path in repo.files) {
          delete repo.files[path];
          repo.commit = commit;
        }
      }
    },
  };
}
