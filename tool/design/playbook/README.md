# Website playbook tools

Scripts for the website playbook source pack in
[`design/source_packs/website-playbook`](../../../design/source_packs/website-playbook/README.md).

| Script | What it does |
|---|---|
| `build_boards.mjs` | Writes the canvas boards and their phone wrappers into `build/design/playbook-boards`. |
| `check_playbook.mjs` | Validates the page specs, renders every kit component, page section and board, and checks the source pack hashes. |
| `import_kit_tokens.mjs` | Writes the kit's values into `design/tokens/catch.tokens.json`; `--check` fails when they disagree. |

## The canvas owns the design tokens

The design canvas ("Catch directions", Website · conversion playbook) is the
source of truth for the values the kit draws. The canvas draws with the kit
stylesheets, `kit/playbook-panels.css` and `kit/playbook-kit.css`, which keep
their own literal values: the canvas serves only its own flat file set and
cannot load the repository's generated stylesheet. The importer is therefore
what keeps the canvas, the website and the apps on one value.

To bring a canvas change into the code:

1. Replace the changed kit files from the canvas and update
   `source-pack.json` as the source pack README describes.
2. Run `node tool/design/playbook/import_kit_tokens.mjs`. It writes every
   kit-owned value into the token file, creates the tokens a new row
   describes, points role aliases (such as `ground.ink.fill`) at their
   tokens, and rewrites the mapping table in the source pack README
   (updating that file's hash in `source-pack.json`).
3. Run `node tool/design_tokens.mjs` to regenerate
   `packages/web-config/generated/catch-tokens.css` and the Flutter constants
   in `packages/catch_tokens/lib/generated/catch_design_tokens.g.dart`.

`node tool/design/playbook/import_kit_tokens.mjs --check` runs in CI through
the `design:website-playbook-tokens` check. It fails when:

- a kit hex has no row, or a row names a hex, selector or property the kit no
  longer has;
- a kit-owned token differs from the kit;
- a shared token (mode `match`) differs from the kit, which means the kit moved
  off a shared scale step and the row needs remapping rather than the step
  changing;
- a role alias does not point at its token;
- the mapping table is stale.

The map lives in `lib/kit_token_map.mjs`, and the table of every kit
selector and value with its token is in the "Token mapping" section of
[`design/source_packs/website-playbook/README.md`](../../../design/source_packs/website-playbook/README.md#token-mapping). Mode `own` means the kit owns the
token and the importer writes it. Mode `match` means the token is a shared
scale step (spacing, a type role the apps also use) that the importer only
checks. Colour rows list the selectors that show the colour's role; every
other use of the same hex resolves to the same token.
