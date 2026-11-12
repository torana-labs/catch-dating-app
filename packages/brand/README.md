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
| Flutter apps, Widgetbook, Dart tests | `packages/kernel/lib/brand.dart` (`Brand.webOrigin`, `Brand.webUri(path)`, …) | Generated. |
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
   prints (`node packages/l10n/generate.mjs`, `node tool/copy/sync_native_copy.mjs`,
   `cd website && node scripts/renderPreviewCards.mjs --update`).
3. Re-render marketing captures (they show the domain in Safari's address bar).
4. Register the external surfaces listed in the rebrand PR checklist.

## Store links

`stores.consumer` and `stores.host` each hold an `ios` (App Store) and an
`android` (Google Play) listing URL, or `null` while that app is not on that
store. The schema checks the URL shape, and a test checks that a Play link
names the role's production `applicationId` from `tool/app_targets.json`. Use
the storefront-neutral App Store form (`https://apps.apple.com/app/<slug>/id<digits>`,
no country code) so visitors land on their own storefront.

To add a link, set it in `brand.json` and run `node packages/brand/generate.mjs`.
Every store badge and download link reads these slots; a null slot renders as
"Coming soon" and still records the press.

**Launch gate.** `launch_gate.mjs` checks that once any market city is live,
both Consumer links are set. City status comes from the website market pack
(`website/src/content/markets/in.ts`) until the markets catalog lands. It
prints a warning naming the missing slots; set `LAUNCH_GATE_MODE` to `"error"`
once city statuses are honest.

## Live config in the apps

The **Publish brand config** workflow (`.github/workflows/brand-config-publish.yml`)
keeps the public Firestore document `config/brand` equal to this record. A
merge to `main` that changes `brand.json`, its schema, `index.mjs`, the writer
or the contract publishes to dev, then to prod once dev succeeds, each as the
environment's deploy identity (Workload Identity, no keys) and behind the same
GitHub environment protection as the backend deploy. Dispatch it to publish
on demand (dev then prod, or one environment, staging included). Each run
shows the document, writes it, then reads it back and fails on any difference.
A run whose `brand.json` is older than `main`'s writes nothing. It never runs
for a pull request, and a change to the workflow files alone does not publish.

The workflow runs `tool/firebase/create_config_brand.mjs`, which you can also
run by hand with Application Default Credentials: dry-run by default,
`--apply` writes, `--allow-prod` is required for prod, `--all` targets dev,
staging and prod, `--verify` compares the live document read-only. The
document is the record itself, `contracts/firestore/config_brand.schema.json`
is `brand.schema.json` in draft-07 form, and the writer's tests fail when
either drifts.

The Flutter apps read the store links from `config/brand` when they need one
(`liveBrandProvider` in `catch_platform`), once per session and without
blocking startup. A missing, slow or invalid document, or a slot that is not
a store URL, falls back to the generated `Brand` constants. Functions and the
website keep reading their reviewed generated copies: the website ships
through a release.

## Changing contact details

The support email, phone and WhatsApp, the domain and the operator are plain
`brand.json` values. For a new domain or support address:

1. Edit `brand.json` (all origins and the sender domain must stay on
   `web.domain`; `brandConsistencyErrors` enforces it).
2. `node packages/brand/generate.mjs`, plus the follow-up commands it prints,
   and commit the result in one reviewed PR.
3. Merging it publishes the record to the apps: the Publish brand config
   workflow writes `config/brand` to dev, then prod, and verifies each. Check
   that run.
4. Re-register what code cannot switch (the rebrand checklist above).

The website and Functions pick the change up with their next release. The
apps read only the store links live today; other values in `config/brand`
are published for them but reach the apps through their generated `Brand`
constants, so a contact change in the apps ships with an app release.

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
`brand-literal-ok: <reason>` and is not counted. Markdown and
`design/source_packs/` are not scanned.

Firebase project ids, bundle ids (`com.catchdates.*`), Firestore paths and
`Catch*` code symbols are out of scope: they are identifiers, not brand copy,
and the patterns above do not match them.
