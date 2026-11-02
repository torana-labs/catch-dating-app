---
status: active
---

# Catch Web Config

Shared React web runtime configuration and tooling for Catch's web-native surfaces.

- `vite-react.ts` owns the common Vite defaults for marketing and admin.
- `tsconfig.*.json` owns the common TypeScript compiler options.
- `styles/catch-web.css` imports generated design tokens and shared browser
  baseline styles.
- `generated/` is written by `node tool/design_tokens.mjs`.

Keep deployable apps separate (`website/`, `admin/`) and share platform
plumbing here.

Runtime imports use the `@catch/web-config` workspace:

- `@catch/web-config/query` creates independent TanStack Query clients with one
  retry/cache policy. Public roots own their clients; Admin supplies a shorter
  freshness window and retains its session mutation fence and cache teardown.
- `@catch/web-config/firebase` owns environment field mapping and the development
  project configuration. The website requires a complete explicit production
  configuration. Admin currently retains its existing per-field development
  fallback; production build validation must supply and verify its environment.
  App Check provider selection and authorization remain surface-owned.

Sharing these factories does not share cached private data or sign users into
another origin. Firebase Auth persistence and session/role lifetimes remain
owned by each application.

## Stylesheet lint preset

`@catch/web-config/stylelint` (`lint/stylelint.mjs`) is the one stylelint rule
set for web CSS. Colours, spacing, radius, stroke widths, type, shadows,
timing and stacking order come from the generated tokens; unitless `0`,
`auto`, `inherit` and percentages stay allowed, and media queries may only use
the window-size bounds (`min-width` 600/840/1200/1600px, `max-width` one pixel
below). `lint/stylelint.test.mjs` seeds a failing probe for every rule family.

Each app records the violations it already has in its own
`stylelint-suppressions.json`. stylelint fails on any count above the recorded
one, and `lint/check-stylelint-suppressions.mjs` fails when a recorded count is
above what remains, so a fix must be recorded and the debt only shrinks:

```sh
npm --workspace catch-admin run check:css-tokens
npm --workspace catch-marketing run check:css-tokens
```

After fixing raw values, record the lower counts from the app directory with
`npx stylelint "src/**/*.css" --suppress` (the website also lints
`"app/**/*.css"`). Never run it to absorb a new violation; use the tokens
instead.
