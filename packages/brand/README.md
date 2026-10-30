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
| Admin, website outside `src/content/`, Node scripts in `tool/` | `import {brand, webUrl, applyBrand} from "@catch/brand"` | Workspace package; plain ESM, no copy. |
| Website copy (`website/src/content/`) | `./brand.ts` (generated) | Content modules may only import content, and the release smoke runs them from a bare worktree with no packages installed. |
| Cloud Functions | `functions/src/shared/generated/brand.ts` (`BRAND`, `brandWebUrl`, `BRAND_ORIGIN_PATTERN`) | Functions deploys only `functions/`. |
| Flutter apps, Widgetbook, Dart tests | `lib/kernel/brand.dart` (`Brand.webOrigin`, `Brand.webUri(path)`, …) | Generated. |
| Managed surfaces (see below) | literal values, rewritten by the generator | Files another toolchain reads raw. |
| JSON copy (`legal.json`, …) | `{{brand.name}}`, `{{brand.web.domain}}`, … | The importing module passes the document through `applyBrand`. An unknown token throws. |

Run `node packages/brand/generate.mjs` after editing `brand.json`;
`--check` fails while a generated copy is stale.

## Managed surfaces

`managed_surfaces.json` lists files that gen-l10n, `tool/copy/sync_native_copy.mjs`,
Android, Xcode, static hosting or a bare release worktree read raw: the ARB,
`copy/*.json`, `website/src/content/meta.json`, the dart-defines, deep-link
hosts in the Android manifest and iOS entitlements, the web app manifests,
capture inputs and a few fixtures. They keep literal values so their authoring
and tooling stay as they are. `applied.json` records the brand they were
written for. When `brand.json` changes, `generate.mjs` rewrites every changed
value from `applied.json` to `brand.json` (longest value first, whole words, plain or
regex-escaped), then updates `applied.json`. `kind: "text"` surfaces rewrite
only the domain, origins, contacts and handle; `json-values` surfaces (the copy
catalogs) rewrite names too. The ARB's `exceptKeys` are messages where the word
is the "a catch" feature noun or a verb, not the brand; add a key there when you
write such a message. Files regenerated from a managed surface (`regenerated`)
come from their own tools.

## Rebrand

1. Edit `brand.json`.
2. `node packages/brand/generate.mjs`, then run the follow-up commands it
   prints (`flutter gen-l10n`, `node tool/copy/sync_native_copy.mjs`,
   `cd website && node scripts/renderPreviewCards.mjs --update`).
3. Re-render marketing captures (they show the domain in Safari's address bar).
4. Register the external surfaces listed in the rebrand PR checklist.

## CI

`meta:brand-literals` is a mandatory check in `tool/tools_manifest.json`, so
every PR runs the generator check, the package tests and the guard. The website
and admin typecheck (`check:brand`) and `functions/src/shared/brand.test.ts`
run them too.

## Guard

`check_brand_literals.mjs` fails when the domain, Instagram handle or support
email or phone from the record appears anywhere in tracked files outside this
package, its generated copies and the managed surfaces, or when the display
name appears in website copy (`website/src/content/**`). The patterns come from
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
