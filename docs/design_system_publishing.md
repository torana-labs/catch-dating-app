---
doc_id: design_system_publishing
version: 1.0.0
updated: 2026-11-03
owner: ui_elevation_initiative
status: active
---

# Design System Publishing

The repo is the source of the design system; the claude.ai design-system
artifact and the design canvas are downstream copies. This document owns how a
library change in `@catch/web-ui` reaches them. The contract for names, props,
states and guidelines is `design/components/README.md`.

## The Loop

1. A library PR changes `packages/web-ui` (components, CSS modules, `Contract`
   stories) or a guideline in `design/components/guidelines`, and merges to
   `main` with web-ui's unit tests green on React 19 and React 18.
2. The reviewer builds the artifact folder from `main`:
   `node tool/design/publish_design_system.mjs --build`.
3. The reviewer checks it (`--check`), reads what changed against the live
   copy (`--compare`), and uploads it to the design-system artifact with Claude's
   Artifact tool.
4. The reviewer copies the new `components/` bundle into the canvas, and into
   the design source's mirror of it, so boards render against the published
   library.

Publishing is a release step after a library PR merges, never part of the PR:
the system first, then the canvas, as the design source's README prescribes.

## Commands

```sh
bash tool/git/bootstrap_worktree.sh --target root     # installs React 18 beside React 19 too
node tool/design/publish_design_system.mjs --build [--tokens-from <dir>]
node tool/design/publish_design_system.mjs --check [--tokens-from <dir>]
node tool/design/publish_design_system.mjs --compare ~/Development/catch-dating-app/catch-design-source/ds/catch/project
npm --workspace @catch/web-ui run build                # bundle.js, bundle.css and index.d.ts into build/web-ui
npm --workspace @catch/web-ui run build:storybook      # web-ui's own static Storybook
npm run web:ui:test                                    # every unit test on React 19, then on React 18
```

`--build` writes `build/design-system`, which Git ignores: the folder is a
build output with a manifest, not a tracked snapshot. `--out <dir>` builds
elsewhere.

`--check` rebuilds into a temporary folder and fails when the build breaks, a
card's guideline is missing, a present component is not exported under both
its names, a preview's `Contract` story is not in the Storybook build, a
manifest hash is not its file, or an existing `build/design-system` was built
from inputs that have changed since. Run it immediately before uploading; CI
runs it on every change to its inputs.

`--compare <dir>` lists, file by file, what is identical, what differs and
what only one side has, plus the component folders only one side has. Point it
at the design source's `ds/catch/project` (the live artifact's files) before
the first upload; once the live artifact comes from this repo, point it at a
copy read back from the artifact.

## The Folder

| Path | Built from |
|---|---|
| `components/bundle.js` | `packages/web-ui/artifact/build.mjs`: the web-ui barrel as one classic script that sets `window.Catch` and takes React and ReactDOM from the page (the canvas supplies React 18), minified for es2019. It starts with the `@ds-bundle` header listing the gallery cards. Every barrel export keeps its name; each system component web-ui carries is also exported under its system name, so `Catch.Button` is `Catch.CatchButton`. |
| `components/bundle.css` | `packages/web-config/generated/catch-tokens.css` with its fonts pointed at `../fonts/`, then every CSS module, with `<File>_<class>` class names. |
| `components/index.d.ts` | The barrel's declarations and the system-name aliases in one file (`dts-bundle-generator`). |
| `components/<Card>/README.md` | The card owner's guideline from `design/components/guidelines`. |
| `components/<Card>/preview.html` | Each member's `Contract` story, framed from the Storybook build and sized to it. |
| `storybook/` | web-ui's static Storybook (`packages/web-ui/.storybook`). |
| `fonts/` | The font files web-config's token CSS declares, with their OFL licences. |
| `tokens.json`, `tokens.css` | The artifact token format from the tokens pipeline, copied from `build/design-system` or from `--tokens-from <dir>`. |
| `design-system.json` | The artifact's metadata in the design source's shape: namespace `Catch`, React 18, and the commit the folder came from. |
| `manifest.json` | See below. |

A card is the design source's gallery folder. ChatMessage and ChatComposer
share `Chat`, Spinner sits in the `Skeleton` card, and Root and PaneHeader,
which the design source shows inside other cards, get folders of their own.
`tool/design/lib/system_components.mjs` assigns the cards through its `readme`
and `sharedReadme` fields.

A system component is present when the barrel exports the registry symbol the
canvas exports (`CatchButton` for Button). A component without that export is
missing, even when its registry record points at another web-ui export; the
manifest names that export as `registryTwin`, and the bundle does not alias it.

The folder does not build the artifact's top-level `README.md` (the system-wide
guidance), which has no repo source yet. An upload leaves files it does not
name in place, so the live artifact keeps its copy, its `components/src/`
sources and its `Cover` card until an upload removes them by passing `null`.

## The Manifest

`manifest.json` records:

- `builtFrom`: the git sha, whether any input was uncommitted, web-ui's version,
  the registry's sha256, and the sha256 of every input file (web-ui's source,
  Storybook config, artifact build and package files, web-config's generated
  CSS and fonts, the font licences, the registry, the guidelines, the system
  types, this tool and the lockfile).
- `tokens`: where `tokens.json` and `tokens.css` came from, if anywhere.
- `components`: the system components present (with their card), the missing
  ones (with any `registryTwin`), the missing parts, the present components
  without a `Contract` story, and the canvas's non-component exports (hooks,
  token and icon maps) the bundle lacks.
- `cards`: each card's group, guideline and preview stories.
- `notBuilt`: artifact files the repo has no source for.
- `files`: every other file in the folder with its sha256.

## Uploading

1. On fresh `main`, run `--build` and then `--check`. Until the tokens pipeline
   writes `build/design-system/tokens.json` and `tokens.css`, pass
   `--tokens-from <design source>/ds/catch/project`.
2. Run `--compare` against the live files and read the differences.
3. Read the live design-system artifact
   (https://claude.ai/artifact/BFDy9JwngvATkrJ2fEiZno) and its files listing.
4. Publish the folder to that url with the Artifact tool, each file at
   `project/<path>`, as the design source's publish lists map them. The design
   source keeps `design-system.json` beside its files but never lists it, so
   find its live path in the files listing before replacing it. One publish takes at
   most 255 files and 64 MB, and the Storybook build alone is about 250 files,
   so publish `storybook/` and the rest in separate calls to the same url.
5. Copy `components/bundle.js` and `components/bundle.css` into the canvas
   (https://claude.ai/artifact/S6RC4qZwMpNhyUrtxQ2xKf) at `project/ds/catch/`,
   and copy `components/` into the design source's
   `catch-directions/project/ds/catch/`, so local renders use the same bundle.

## React 18

The canvas mounts web-ui with React 18 while the apps run React 19, so web-ui
may use no React-19-only API. `packages/web-ui/vitest.config.ts` runs every unit
test twice: the `react19` project as the apps do, and the `react18` project with
React 18 from the `@catch/web-ui-react18` workspace member
(`packages/web-ui-react18`). Vite aliases web-ui's own `react` and `react-dom`
imports to it; module hooks loaded into each worker do the same for packages
Node loads itself, such as Testing Library; a setup file fails the run if React
19 slips back in. The member sits beside `packages/web-ui`, not inside it,
because npm does not install a workspace's dependencies when the workspace is
nested inside another one.

The `--check` bundle test loads `bundle.js` the way the canvas does, after the
React 18 UMD builds as page globals, and renders a Button.

Where a component needs behaviour the two versions spell differently, a helper
in web-ui writes it in the form each accepts: `inertProps` writes `inert` as
React 19's boolean and React 18's string.
