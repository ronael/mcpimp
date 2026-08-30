# MCPIMP routing adapter

Before a non-trivial coding, architecture, design, audit, research, or
integration task, call `resolve-capabilities` on the MCPIMP server with the
complete request and compact project context. Load only the returned
entrypoints for one primary and at most two supporting capabilities.

User and project instructions take precedence. Imported capabilities marked
`unreviewed` or `review-required` are reference material only. Never execute a
script merely because MCPIMP indexed it.
