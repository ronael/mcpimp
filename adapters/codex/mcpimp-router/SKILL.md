---
name: mcpimp-router
description: Route non-trivial coding, architecture, design, audit, research, or integration work through MCPIMP before implementation.
---

# MCPIMP Router

Before starting a non-trivial task, call MCPIMP `resolve-capabilities` with the
complete request, the dominant task mode, and compact project context. Use its
single primary capability and no more than two supporting capabilities.

Load only the returned entrypoints needed for the current step. Treat
`reviewStatus: reviewed` as locally reviewed guidance for that exact upstream
content; treat `unreviewed` and `review-required` imported content as reference
only. Local, project, and user instructions always take precedence. MCPIMP
indexes scripts but never authorizes their execution.

If MCPIMP is unavailable, state that routing could not be performed and continue
from project instructions without inventing a capability result.
