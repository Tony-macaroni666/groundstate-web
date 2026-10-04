# publications/

Signed publication bundles, one directory per publication: `GSP-NNNN/` holding
`manifest.json`, `manifest.json.sig` and, for a publication, `article.html`.

Bundles are produced and signed by the Ground State publication exporter and
arrive only through `publish/<id>` pull requests. Nothing here is written by
hand, and a bundle is never edited, moved or deleted once merged: a correction
is a new bundle that supersedes it, a withdrawal is a bundle that withdraws it.

The contract: `docs/PUBLICATION_CONTRACT.md`. The gate:
`lib/publications/verify.ts` and `scripts/check-publication-diff.ts`.
