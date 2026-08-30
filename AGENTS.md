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

## Product reflection for evolutions

Before implementing any product evolution (feature, behavior, workflow,
interface, protocol, or data-model change), write a brief product reflection
that:

- restates the user problem and the intended outcome;
- explains where the change belongs in MCPIMP and why;
- identifies the relevant implications for existing flows, users and agents,
  security, data, compatibility, operations, documentation, and roadmap;
- checks assumptions and ambiguities, asking for clarification only when they
  could materially change the direction;
- confirms that the change is coherent with the product vision and current
  roadmap phase, and updates the roadmap or documentation when its scope or
  status changes.

Keep this reflection proportional to the change: one or two sentences are
enough for a small, localized evolution; use a structured note for a broader or
cross-cutting evolution. A bug fix that only restores already specified
behavior needs a short product-impact check, without reopening settled product
decisions.

French equivalent: [AGENTS.fr.md](AGENTS.fr.md)
