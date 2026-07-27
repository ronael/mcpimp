#!/bin/bash
# Régénère BUNDLE.md (version mono-fichier pour agents web) depuis les sources.
cd "$(dirname "$0")/.."
{
  echo "<!-- BUNDLE auto-généré — source de vérité : les fichiers individuels de ce repo. Régénérer via scripts/build-bundle.sh -->"
  echo
  for f in SKILL.md agents/*.md shared/*.md references/*.md; do
    echo "<!-- ══════════ FICHIER : $f ══════════ -->"
    echo
    cat "$f"
    echo
  done
} > BUNDLE.md
echo "BUNDLE.md régénéré ($(wc -l < BUNDLE.md) lignes)"
