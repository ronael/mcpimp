# MCPIMP — instructions pour l'agent

Avant toute modification du projet, consulte les capabilities disponibles via le
MCP MCPIMP (`list-capabilities` / `search-capabilities`). Si une capability
pertinente existe (par exemple `elaya-design-landing-page-design` pour toute
modification frontend : HTML, CSS, JS visuel, design), charge-la avec
`load-capability` et applique ses règles avant d'écrire du code.

Si la capability n'est pas disponible dans le MCP (serveur non lancé, snapshot
obsolète, id inconnu), regarde directement les fichiers correspondants sur
disque (par exemple `catalog/capabilities/local/…` ou `catalog/capabilities/<namespace>/…`) pour retrouver les règles à appliquer.
