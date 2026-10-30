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
| Admin, web UI, website outside `src/content/`, Node scripts | `import {brand, webUrl, applyBrand} from "@catch/brand"` | Workspace package; plain ESM, no copy. |
| Website copy (`website/src/content/`) | `./brand.ts` (generated) | Content modules may only import content, and the release smoke runs them from a bare worktree with no packages installed. |
| Cloud Functions | `functions/src/shared/generated/brand.ts` (`BRAND`, `brandWebUrl`, `BRAND_ORIGIN_PATTERN`) | Functions deploys only `functions/`. |
| JSON copy (`legal.json`, …) | `{{brand.name}}`, `{{brand.web.domain}}`, … | The importing module passes the document through `applyBrand`. An unknown token throws. |

Run `node packages/brand/generate.mjs` after editing `brand.json`;
`--check` fails while a generated copy is stale.

CI runs `npm --workspace @catch/brand run check` and the package tests before
the website and admin typecheck, and `functions/src/shared/brand.test.ts` runs
the generator check and the guard in the Functions lane. A brand edit always
touches the generated Functions copy, so both lanes run.

## Guard

`check_brand_literals.mjs` fails when the domain, Instagram handle or support
email from the record appears anywhere in tracked files outside this package
and its generated copies, or when the display name appears in a copy file
(`website/src/content/**`, the ARB template). The patterns come from
`brand.json`, so after a rebrand the guard protects the new values.

`literal_allowlist.json` lists the files not yet migrated and the exact number
of matching lines each keeps. It may only shrink: a new file or a higher count
fails, and a lower count fails until `--prune` records it. A line that uses a
brand-equal value for another reason (the owner's own inbox, say) carries
`brand-literal-ok: <reason>` and is not counted. Markdown,
`design/source_packs/` and `design/sync/` are not scanned.

Firebase project ids, bundle ids (`com.catchdates.*`), Firestore paths and
`Catch*` code symbols are out of scope: they are identifiers, not brand copy,
and the patterns above do not match them.
