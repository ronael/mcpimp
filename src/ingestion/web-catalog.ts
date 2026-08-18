import { createHash } from "node:crypto";
import { fetchText } from "./http";
import type {
  DelegatedSource,
  DiscoverySourceAdapter,
  GitHubSourceDefinition,
  SourceRevision,
  WebCatalogSourceDefinition,
} from "./types";

/**
 * A catalogue is a discovery surface, not a content source.
 *
 * It is read to find out *where* capabilities actually live, then the import
 * runs against that original repository. The catalogue URL is kept as
 * `discoverySource` on every capability it led to. Nothing is scraped into the
 * registry, so the catalogue's HTML never becomes capability content.
 *
 * Importing is entirely opt-in per repository (`allowedRepositories`): a
 * catalogue can publish anything, and a page edit must never be able to add a
 * capability.
 */

const REPO_PATTERN = /https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9-_.]*)\/([A-Za-z0-9][A-Za-z0-9-_.]*)/g;
const IGNORED_REPO_PATHS = new Set(["sponsors", "orgs", "topics", "features", "about", "pricing"]);

function extractRepositories(html: string): string[] {
  const found = new Set<string>();

  for (const match of html.matchAll(REPO_PATTERN)) {
    const owner = match[1];
    const name = match[2].replace(/\.git$/, "");
    if (IGNORED_REPO_PATHS.has(owner.toLowerCase())) continue;
    found.add(`${owner}/${name}`);
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

export class WebCatalogSourceAdapter implements DiscoverySourceAdapter<WebCatalogSourceDefinition> {
  readonly type = "web-catalog";

  private pageCache = new Map<string, string>();

  private async loadPage(source: WebCatalogSourceDefinition): Promise<string> {
    const cached = this.pageCache.get(source.url);
    if (cached !== undefined) return cached;

    const { text } = await fetchText(source.url, {
      extraHosts: [new URL(source.url).hostname],
      headers: { accept: "text/html" },
    });

    this.pageCache.set(source.url, text);
    return text;
  }

  /**
   * Catalogue pages rarely expose a usable ETag, so the revision falls back to a
   * hash of the extracted repository list. That is the part we actually depend
   * on, and it does not churn when unrelated markup changes.
   */
  async getRevision(source: WebCatalogSourceDefinition): Promise<SourceRevision> {
    const html = await this.loadPage(source);
    const digest = createHash("sha256").update(extractRepositories(html).join("\n")).digest("hex");

    return {
      kind: "content-hash",
      value: `sha256:${digest}`,
      url: source.url,
      fetchedAt: new Date().toISOString(),
    };
  }

  async discoverSources(source: WebCatalogSourceDefinition): Promise<DelegatedSource[]> {
    const html = await this.loadPage(source);
    const allowed = source.allowedRepositories || [];
    const revision = await this.getRevision(source);

    return extractRepositories(html).map((repository) => {
      const definition: GitHubSourceDefinition = {
        id: `${source.id}:${repository}`,
        type: "github",
        repository,
        roots: source.roots,
        update: source.update,
        namespace: source.namespace ?? repository.split("/").at(-1),
        include: source.include,
        exclude: source.exclude,
        maxFileBytes: source.maxFileBytes,
        maxFiles: source.maxFiles,
        downloadBinaries: source.downloadBinaries,
      };

      return {
        discoverySource: {
          type: "website",
          url: source.url,
          name: source.id,
          revision: { kind: revision.kind, value: revision.value },
        },
        definition,
        allowed: allowed.includes(repository),
      };
    });
  }
}
