# Release and rollback

MCPIMP has two independently deployed surfaces:

- GitHub Pages publishes the static `site/` directory after every push to
  `main`.
- Cloudflare publishes `worker.ts` and the generated capability snapshot when
  a maintainer runs Wrangler explicitly.

## Release checks

1. Start from an up-to-date `main` with a clean worktree.
2. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
3. Run `pnpm run doctor -- --preflight` for the local runtime configuration.
4. Run `pnpm sources:sync -- --json` and review every pending catalogue change;
   do not apply imported scripts or updates solely to unblock a release.
5. Merge through a pull request only after the CI check is green.

The Pages workflow deploys after the merge and smoke-tests the English and
French landing pages plus both documentation trees. Verify its environment URL
in GitHub Actions if a route check fails.

## Cloudflare Worker

The Worker is intentionally deployed separately because the repository does
not store a Cloudflare API token in GitHub.

```bash
pnpm build
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler check startup
pnpm exec wrangler deploy
```

After deployment, use the URL printed by Wrangler:

```bash
curl -fsS "$WORKER_URL/health"
curl -fsS "$WORKER_URL/activity?limit=1"
curl -fsS "$WORKER_URL/message" \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

The health response must report the expected capability count, a recent
`startedAt`, and `runtime: "worker"`. The activity response must report
`persistence: "process-memory"`.

## Rollback

For a repository regression, revert the merge commit through a pull request.
This preserves history and automatically republishes GitHub Pages after CI.

For a Worker-only regression, list deployable versions and roll back to the
last known-good version:

```bash
pnpm exec wrangler versions list
pnpm exec wrangler rollback <VERSION_ID>
```

Repeat the Worker smoke tests after rollback. Do not use `git reset`, delete a
Worker, or overwrite catalogue content as a rollback mechanism.
