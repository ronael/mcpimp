# MCPIMP host adapters

MCPIMP exposes routing through MCP `instructions`, but hosts do not all apply
server instructions with the same consistency. The files under `adapters/`
provide a deliberately small native bridge without duplicating catalog content.

- Codex: install `adapters/codex/mcpimp-router` as a project or user skill.
- Claude: include `adapters/claude/MCPIMP.md` in the project's agent guidance.
- Kimi: include `adapters/kimi/MCPIMP.md` in the project's agent guidance.

The adapter only mandates `resolve-capabilities` and progressive loading. The
registry remains the source of truth for selection, review state, conflicts,
and entrypoints.
