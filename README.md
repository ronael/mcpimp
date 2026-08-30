# Personal Capability Registry MCP

![MCPIMP banner](site/assets/img/banniere-readme-en.png)

[Version française](README.fr.md)

MCPIMP is a personal capability registry for AI agents. This repository hosts
the MCP server and exposes the catalog's capabilities—such as
`landing-page/`—through MCP tools and resources.

MCPIMP is a capability intelligence and distribution layer, not an agent
framework or workflow engine. It helps an agent or its harness find a
capability and progressively load useful context; the calling harness remains
responsible for planning, execution, retries, and session management.

## Model

A **capability** is MCPIMP's domain unit. It is not necessarily a skill: it is
a directory that groups one or more components useful to an AI agent.

```txt
mcpimp/
  src/                           # registry, ingestion, MCP, HTTP, and CLI source code
  catalog/
    sources/                     # declared external sources (one JSON file per source)
    capabilities/                # capability catalog organised by namespace
      local/                     # capabilities created manually in this repository
      <namespace>/               # capabilities synchronised from external sources
  generated/                     # Cloudflare Worker snapshot generated at build time
  scripts/                       # build and maintenance scripts
  worker.ts                      # Cloudflare entry point
```

A capability is recognised when it contains at least one supported component:

- `SKILL.md` — a **skill** component
- `mcp.json` — an **upstream MCP** component

Other components—resources, prompts, and so on—can be added later without
changing the architecture.

### Namespace, slug, and public ID

On disk, a capability lives at:

```txt
catalog/capabilities/<namespace>/<slug>/
```

- `namespace`: a logical group (`local`, `ui-skills`, `matt-pocock`, …)
- `slug`: the capability's short name within its namespace
- `public ID`: the stable identifier exposed through MCP tools

```txt
local/landing-page          → ID: landing-page
ui-skills/improve-ui        → ID: ui-skills-improve-ui
matt-pocock/codebase-design → ID: matt-pocock-codebase-design
```

Local capabilities use the reserved `local` namespace and their public ID is
their slug. Synced capabilities combine namespace and slug, so disk paths can
change without breaking public IDs or existing MCP URIs.

### Provenance

A capability is either **local** (no `SOURCE.json`) or **synced** from an
external source (`SOURCE.json` beside `upstream/` and `overrides/`). Both are
exposed identically through MCP; provenance is metadata, not an organising
principle.

Imported capabilities also expose a review state that is independent from
ranking. A root `REVIEW.json` can attest one exact `SOURCE.json` `contentHash`;
if upstream content changes, the effective state automatically becomes
`review-required`. Local capabilities are `local`, and imports without an
attestation are `unreviewed`.

The server discovers capabilities automatically and exposes their files through
stable URIs, for example:

```txt
skill://landing-page/SKILL.md
skill://ui-ux-pro-max/SKILL.md
skill://ui-ux-pro-max/references/quick-reference.md
```

## MCP tools

| Tool | Purpose |
|---|---|
| `list-capabilities` | Lists available capabilities and their origin |
| `capability-info` | Returns metadata/files, a full Markdown outline with `path`, or a ranked heading shortlist with `path` + `query` |
| `load-capability` | Loads a capability, exact file, or complete Markdown heading subtree |
| `search-capabilities` | Searches indexed files and ranks results |
| `resolve-capabilities` | Selects one primary capability and up to two compatible supports with bounded entrypoints |
| `list-upstreams` | Checks configured upstream MCP servers |

`search-capabilities` supports multiple words and ranks results using field
weights, IDF, query coverage, exact-query bonuses, file-type weights, and a
resource-intent boost for queries asking for references or inspiration. It also
includes a light French/English synonym table in
`src/registry/synonyms.ts`. Global search returns a shortlist of eight
capabilities by default, with the best matching file for each one. Then use
`capabilityId` to search several internal files within the selected capability.
The optional `limit` parameter adjusts the maximum shortlist size.
Set `diagnostic: true` to include score components: coverage, terms and IDF,
matched fields, file weight, resource intent, and phrase bonus. Diagnostics are
omitted by default to keep normal responses compact.

For non-trivial tasks, call `resolve-capabilities` with the complete task before
loading guidance. Optional local `ROUTING.json` cards disambiguate specialists,
generalists, resources, conflicts and complements without changing upstream
content. See [capability routing](docs/capability-routing.md).

For a long Markdown entrypoint, inspect its outline before loading context:

```txt
search-capabilities(query)
→ capability-info(id, path: "SKILL.md", query)
→ load-capability(id, path: "SKILL.md", heading: "Workflow")
```

With `query`, the outline is ranked and limited to five headings by default
(`headingLimit`, maximum 8). Without it, the complete document-order outline is
returned for compatibility. Each entry reports its heading level and character
count. Set `diagnostic: true` to include heading scores and matched terms.
Loading a heading returns that complete section and its nested subsections, so
context is reduced without cutting instructions at an arbitrary boundary.

Ranked entries also expose `linkedPaths` and `linkedFiles` metadata when their
section mentions another file that exists inside the same capability. The
metadata includes MIME type, bytes and text characters so a harness can load a
small file directly or inspect a large Markdown file with another
`capability-info(id, linkedPath, query)` call before choosing a heading. These
links are navigation hints, not required dependencies or permission to execute
content. External and missing paths are never surfaced as internal links.

```bash
curl -sS http://localhost:3901/message \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search-capabilities","arguments":{"query":"accessibility contrast","limit":5}}}'
```

## Upstream MCP proxy

A capability may declare an upstream MCP in `mcp.json`:

```json
{
  "type": "mcp-remote",
  "url": "env:NOCO_MCP_URL",
  "headers": { "xc-mcp-token": "env:NOCO_MCP_TOKEN" }
}
```

`mcp-remote` is normalised internally to the standard streamable HTTP MCP
transport. Put real values only in `.env`; it is loaded by `pnpm run dev` and is
ignored by Git. Upstream tools receive a stable prefix, for example
`nocodb.list-tables` and `nocodb.get-records`.

## External sources

> For the detailed guide, use [`site/docs/sources.html`](site/docs/sources.html)
> in a browser.

MCPIMP imports skills published elsewhere (GitHub repositories and web
catalogues) and keeps them up to date. The runtime never depends on the
network: it reads only content already imported to disk.

Declare one JSON file per source under `catalog/sources/`; its filename must
match its `id`:

```json
{
  "id": "ibelick-ui-skills",
  "type": "github",
  "repository": "ibelick/ui-skills",
  "ref": "main",
  "roots": ["skills"],
  "namespace": "ui-skills",
  "update": "review",
  "include": ["improve-ui", "baseline-ui", "fixing-accessibility"]
}
```

| Field | Purpose |
|---|---|
| `roots` | Directories to scan; otherwise the whole repository |
| `namespace` | Prefix for generated IDs (`ui-skills-improve-ui`) |
| `include` / `exclude` | Filters by skill slug |
| `update` | `manual`, `review` (default), or `auto` |
| `maxFileBytes` | Per-file limit (512 KiB by default) |
| `downloadBinaries` | `false` by default: binaries are indexed, not downloaded |

GitHub sources currently discover capability roots through `SKILL.md`. The
ingestion pipeline itself is capability-centric: content adapters return
capabilities with detected components, so adapters can sync skill-only, MCP-only,
or skill+MCP capabilities without forcing a `SKILL.md`.

Synchronise sources with:

```bash
pnpm sources:sync                              # read-only report
pnpm sources:sync --apply                      # imports new capabilities
pnpm sources:sync --apply ui-skills-improve-ui # accepts one update
pnpm sources:sync --apply ibelick-ui-skills    # accepts a whole source
pnpm sources:sync --json                       # machine-readable output
pnpm capabilities:review                       # lists imports requiring review
pnpm capabilities:review -- ui-skills-improve-ui --reviewer <name>
```

The sync report also keeps removed or renamed upstream capabilities visible,
excludes catalogue repositories already owned by a declared source, and reports
same-path collisions between `upstream/` and `overrides/` as identical or
divergent. It never deletes a disappeared capability automatically.

Imported content is stored as follows:

```txt
catalog/capabilities/<namespace>/<slug>/
  SOURCE.json     # provenance written by MCPIMP
  REVIEW.json     # optional local review bound to one upstream contentHash
  upstream/       # upstream content, replaced on each resync
  overrides/      # local additions, never touched by synchronisation
```

All retrieved content is treated as untrusted data: imported scripts are never
executed, upstream instructions are not interpreted during ingestion, paths and
hosts are validated, and no secret is forwarded except an optional
`GITHUB_TOKEN` to `api.github.com`.

`REVIEW.json` and `ROUTING.json` are MCPIMP-owned metadata: synchronization
preserves them and they are never exposed as loadable capability resources.
Reviewed imported guidance remains subordinate to user and project
instructions; scripts stay inert in every review state.

The dashboard review queue is read-only. Attesting content remains a deliberate
local CLI action so a browser page or agent cannot approve upstream guidance on
the user's behalf.

## Connect through MCP

MCPIMP exposes two transports on `http://localhost:3901`:

- **Streamable HTTP**: `POST /message` — preferred modern MCP transport.
- **Legacy SSE**: `GET /sse` + `POST /message?sessionId=...` — for clients that
  only support SSE.

Start the local server first:

```bash
pnpm run dev
```

Once the server is running, execute the read-only runtime diagnostic:

```bash
pnpm run doctor
pnpm --silent run doctor -- --json
```

Always include `run`: `pnpm doctor` invokes pnpm's own built-in doctor command,
not MCPIMP's project script.

The default mode checks endpoint configuration, health reachability, catalog
freshness, the MCP 2025 initialization sequence, callable tools, and MCP 2026
discovery without `initialize`. It also reports the PID, capability and tool
counts, and warns when the running catalog differs
from the catalog on disk. `--json` emits the same report as structured data;
`--silent` suppresses pnpm's script banner so stdout contains JSON only.
Failures of health, initialization, modern discovery, or tool listing return a
non-zero exit code.

Before starting the server, use preflight mode instead:

```bash
pnpm run doctor -- --preflight
```

Preflight checks the catalog, activity-log path, local port, and required
upstream environment variables. Both modes report variable names only, never
their values.
`SIGINT` and `SIGTERM` stop the server cleanly and flush the activity log.

Use `http://localhost:3901/message` for streamable HTTP clients and
`http://localhost:3901/sse` for SSE-only clients. Current Codex and Claude Code
clients can connect directly:

```bash
codex mcp add mcpimp --url http://localhost:3901/message
claude mcp add --transport http --scope user mcpimp http://localhost:3901/message
```

MCP clients commonly load their tool catalog when a session starts. A client
may therefore keep displaying an older "connected" state after the local
process stops, or fail to discover tools when MCPIMP starts after the session.
Run `pnpm doctor` to verify the server independently, then restart the client
session. Also remove obsolete registrations that point another MCP name at the
same `/sse` or `/message` endpoint.

Verify the server without an MCP client:

```bash
curl -sS http://localhost:3901/health
curl -sS http://localhost:3901/message \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

MCPIMP advertises concrete resources and therefore answers the standard
`resources/templates/list` client probe with an empty `resourceTemplates` list.
For MCP 2026-07-28, `server/discover` advertises supported versions,
capabilities and bootstrap instructions without a session. Mismatched routing
headers use `-32020`; unsupported protocol versions use `-32022`.
Invalid request parameters use `-32602`, missing resources use the MCP
`-32002` code, and unexpected handler failures use `-32603`.
The standard `ping` heartbeat receives an immediate empty result.
Cancellation notifications are accepted even when the target request has
already completed; their free-text reason is never retained in the activity log.
The MCP 2025 Streamable HTTP path accepts JSON-RPC batches. Responses are returned only for batch
items carrying an ID; notification-only batches receive an empty `202`.

Observed client sequences and their validation level are tracked in
[`docs/mcp-compatibility.md`](docs/mcp-compatibility.md).
The first real-agent retrieval pilot is documented in
[`docs/agent-outcome-evaluation.md`](docs/agent-outcome-evaluation.md).
Minimal native bridges for Codex, Claude and Kimi are documented in
[`docs/host-adapters.md`](docs/host-adapters.md).

## Public website

The public static website lives in `site/` and is deployed to GitHub Pages by
[`.github/workflows/pages.yml`](.github/workflows/pages.yml). Public HTML
documentation belongs in `site/docs/`; root-level `docs/` is reserved for
technical repository documentation.

Preview the website locally:

```bash
cd site && python3 -m http.server 8080
# open http://localhost:8080/
```

Deployments are triggered by pushes to `main`. Configure GitHub Pages once via
**Settings → Pages → Source → GitHub Actions**.

## Development and deployment

```bash
pnpm install
pnpm run test
pnpm run typecheck
pnpm run build
pnpm run sources:sync   # external-source status (read-only)
pnpm run doctor         # live health + MCP handshake + tools/list (read-only)
pnpm run doctor -- --preflight # checks before starting the server
pnpm run dev
```

The local server listens on `http://localhost:3901` by default. The Cloudflare
Worker does not read the filesystem at runtime: `pnpm run build` creates
`generated/capability-snapshot.ts` from `catalog/capabilities/`, and `worker.ts`
serves that static snapshot.

Local MCP activity is available in the dashboard under **Activity**, as JSON at
`GET /activity`, and as a persistent NDJSON file at `logs/mcpimp.ndjson`.
Entries include the client, MCP method, tool or resource target, transport,
status, duration, JSON-RPC and SSE identifiers, sanitized registry-tool
parameters, result metrics, and errors. Upstream calls retain argument names and
types only. Sensitive keys are redacted, while authorization headers and
response contents are never logged.

```bash
pnpm run build
npx wrangler deploy
```

## Add a capability

1. Create a directory under `catalog/capabilities/local/`, for example
   `catalog/capabilities/local/design-system/`.
2. Add at least one supported component, usually a `SKILL.md` with `name:` and
   `description:` frontmatter.
3. Add `agents/`, `shared/`, `references/`, `assets/`, `data/`, `scripts/`, or
   `mcp.json` as needed. A `tags:` frontmatter field improves search results.
4. Run `pnpm run build` before a Cloudflare deployment.

For an external capability, do not copy files manually. Declare the source in
`catalog/sources/` and run `pnpm sources:sync --apply`; this preserves
provenance and makes future synchronisation possible.

For the complete French reference, including detailed update policies, binary
handling, source examples, and client-specific setup, see
[README.fr.md](README.fr.md).

The project’s priorities and longer-term evolution are tracked in the
[product roadmap](docs/roadmap.md).
