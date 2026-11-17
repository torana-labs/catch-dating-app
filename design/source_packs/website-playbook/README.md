# Website playbook boards

The redesign of catchdates.com, drawn on the Catch directions design canvas on its "Website · conversion playbook" page: https://claude.ai/artifact/S6RC4qZwMpNhyUrtxQ2xKf. The implementation plan, the open decisions and the backend gap audit are in https://claude.ai/artifact/9t3LZkaTS6qoqhEHY4a7PV.

Unlike `website-v2`, most boards here are not hand-drawn. They are composed from a small kit of configurable sections, so a change to a kit component reaches every page that uses it, and a page's copy lives in one JSON file.

## What is here

| Path | What it holds |
|---|---|
| `pages/<Board>.json` | One kit-composed page (52 in all): title, preview heights, an optional page-state switch, and its sections in order. Each section names a kit component and carries that component's copy and options as `data`. |
| `schema/page.schema.json` | JSON Schema (2020-12) for `pages/*.json`. |
| `kit/` | The 18 kit components (`Kit*.dc.html`) and the two stylesheets they share (`playbook-kit.css`, `playbook-panels.css`). |
| `oneoff/` | Boards that are not data-driven: homepage, hosts, pricing, no-show calculator, compare, compare detail, sitemap and event page, with their phone wrappers. Edit them directly. |
| `source-pack.json` | Provenance and the sha256 of every file. |

The boards run on the design canvas, which supplies `support.js` and the template runtime. Here they are reference sources, not runnable pages.

## Regenerate and check

The scripts live in `tool/design/playbook/`. From the repository root:

```sh
node tool/design/playbook/build_boards.mjs [out-dir] [--pages-only]
```

This writes each page board and its 390px phone wrapper, and copies `kit/` and `oneoff/`, so `out-dir` holds the full flat file set the canvas serves (139 files). The default `out-dir` is `build/design/playbook-boards`, which Git ignores. Publish that folder to the canvas project. Board positions and titles stay on the canvas.

```sh
node tool/design/playbook/check_playbook.mjs [--against <dir>]
```

The check needs the root npm install (`bash tool/git/bootstrap_worktree.sh --target root`) for `ajv`. It:

- validates every page against the schema and its cross-references;
- renders every kit component with its sample data, every page section through its component, and each generated board in each page state;
- fails on a template hole with no value or a render that throws;
- requires `source-pack.json` to list every file with its current sha256.

`--against <dir>` also requires the generated boards to match the files in `<dir>` byte for byte, for example a download of the published canvas.

To bring canvas edits back, replace the changed files, run the check, update the hashes and `importedAt` in `source-pack.json`, run `node tool/design/playbook/import_kit_tokens.mjs` and `node tool/design_tokens.mjs` when a kit stylesheet changed, and commit.

## How to use them

- Build each kit component as a `@catch/web-ui` section component, then compose pages from them (blueprint D18). The kit-to-library mapping and the PR sequence are in the implementation plan.
- The canvas values are the defaults (owner decision, blueprint D26). Do not snap to older library caps:
  - The hero headline is 80px (`typography.role.displayHero`); D19's 72px cap is retired.
  - Buttons are pills (`radius.button`); D20's corners are retired.
  - Colours, type steps, radii and spacing come from tokens that hold the kit's own values. Each kit tone (`m-coral`, `m-pink`, `m-yellow`, `m-mint`, `m-indigo`, `m-magenta`, `ink`) maps to a `Ground` value, and the `ink` ground is the kit's `#1B171B`.
  - `tool/design/playbook/import_kit_tokens.mjs` writes the kit's values into `design/tokens/catch.tokens.json`, and its README holds the table that maps every kit selector and value to its token. After a canvas change, run it and then `node tool/design_tokens.mjs`; its `--check` fails CI while the kit and the tokens disagree.
  - The kit stylesheets keep literal values because the canvas serves only its own flat file set; the importer's check is what keeps them and the site on one value.
- Copy written in square brackets, such as `[N]` or `[date]`, is a placeholder awaiting an owner decision or real data. It renders dashed on the canvas and must never ship.
- Sample people, organisers, reviews and figures inside mock screens are illustrative. Data-bound sections read the live read models.
- Phone numbers in the boards are the dummy `+91 00000 00000`. Real contact links come from the brand pack.
- Some promises on these pages have no backend yet (Catch-sent WhatsApp messages, phone-only lead forms, the city digest, the founding-host counter). The gap audit in the implementation plan lists each one, with the copy that must change if the backend does not ship first.

## Relation to the website contracts

`design/website/routes.json` and `design/website/components.json` describe the live marketing website. A playbook page is not a route until it is added to `routes.json` and built in `website/`. Nothing in `website/` reads this folder yet. The plan moves page copy into validated content under `website/src/content/` once the section components exist, so that the canvas and the site share one source.
