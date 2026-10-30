---
status: active
---

# Brand record

`brand.json` is the only place the product's name, web domain, contact
details, legal operator, social handle, store names and message sender names
are written. Everything user-facing reads them from here, so a rebrand is an
edit to this file plus re-registering the external surfaces that the code
cannot switch.

## How each runtime reads it

| Runtime | Reads | Notes |
|---|---|---|
| Website, admin, web UI (`@catch/brand`) | `import {brand, webUrl, applyBrand} from "@catch/brand"` | Workspace package; no copy. |
| Node scripts (`website/scripts`, `tool/`) | the same import, or `@catch/brand/brand.json` | Plain ESM, no build step. |
| Cloud Functions | `functions/src/shared/generated/brand.ts` (`BRAND`, `brandWebUrl`) | Functions deploys only `functions/`, so `generate.mjs` writes a copy. |
| JSON copy (`legal.json`, `meta.json`, …) | `{{brand.name}}`, `{{brand.web.domain}}`, … | The importing module passes the document through `applyBrand`. An unknown token throws. |

Run `node packages/brand/generate.mjs` after editing `brand.json`;
`--check` fails while a generated copy is stale.

## Guard

`check_brand_literals.mjs` fails when the domain, Instagram handle or support
email from the record appears anywhere in tracked files outside this package
and its generated copies, or when the display name appears in a copy file
(`website/src/content/**`, the ARB template). The patterns come from
`brand.json`, so after a rebrand the guard protects the new values.

`literal_allowlist.json` lists the files not yet migrated and the exact number
of matching lines each keeps. It may only shrink: a new file or a higher count
fails, and a lower count fails until `--prune` records it. Markdown,
`design/source_packs/` and `design/sync/` are not scanned.

Firebase project ids, bundle ids (`com.catchdates.*`), Firestore paths and
`Catch*` code symbols are out of scope: they are identifiers, not brand copy,
and the patterns above do not match them.
