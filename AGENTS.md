# MCPIMP — agent instructions

Before making any change to this project, inspect the capabilities available via
the MCPIMP MCP server (`list-capabilities` / `search-capabilities`). If a
relevant capability exists (for example, `elaya-design-landing-page-design` for
any frontend change: HTML, visual CSS/JS, or design), load it with
`load-capability` and follow its rules before writing code.

If the capability is unavailable from MCP (server not running, stale snapshot,
or unknown ID), inspect the corresponding files on disk instead (for example,
`catalog/capabilities/local/…` or
`catalog/capabilities/<namespace>/…`) to retrieve the rules to apply.

French equivalent: [AGENTS.fr.md](AGENTS.fr.md)
