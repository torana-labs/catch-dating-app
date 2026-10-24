---
doc_id: design_token_migration_prompt
version: 1.0.1
updated: 2026-08-06
owner: ui_elevation_initiative
status: reference — reusable agent prompt + DoD gate
---

# Design-token migration — agent prompt

Reusable prompt for handing the **raw color / font / text-style → token** sweep to
a capable model (Sonnet recommended — routing a raw color to the *right* semantic
role is judgment). The deterministic definition of done is the Catch UI analyzer
lint set, summarized by `tool/check_catch_ui_lint_drift.sh`. Pairs with
[`design_language.md` → "Color"](design_language.md).

> **Check first:** `bash tool/check_catch_ui_lint_drift.sh --count`. If it prints `0`,
> there is nothing to do (the token system already owns every color/font on this
> branch). Point the agent at a branch/PR where the count is non-zero.

The gate accepts a sanctioned escape hatch — `// token:allow: <reason>` on the
flagged line **or the line directly above it** (above survives `dart format`
wrapping a long color expression).

---

Copy everything below into the agent task:

````markdown
# Task: route raw colors / fonts / text styles through the token system (Catch Flutter app)

Drive `tool/check_catch_ui_lint_drift.sh` to a clean exit (0). Catch re-skins from ONE
source — flipping a token must re-skin the whole app, in light AND dark. Raw
`Color(...)`, `Colors.<named>`, raw `TextStyle(...)`, and `GoogleFonts.*` outside
the token layer break that. Source-of-truth: `docs/design_language.md → Color`.
Work in small batches; verify constantly.

## Step 1 — see the work
```bash
bash tool/check_catch_ui_lint_drift.sh --count   # how many candidates (if 0, STOP)
bash tool/check_catch_ui_lint_drift.sh           # lists matching analyzer diagnostics, exits 1
```
Scanned: all of `lib/` except generated code, the token DEFINITIONS
(`packages/catch_tokens/lib/**`) and app theme foundations (`lib/core/theme/**`), design fixtures (`lib/design_fixtures/**`), and retired
concept files (`*explore_concept*`),
and color-only art exemptions (`graded_image.dart`,
`event_activity_visuals.dart`). `Colors.transparent` and transparent
`Color(0x00...)` literals are allowed; `// token:allow:` works on the same line
or directly above the raw color expression.

## Step 2 — for EACH finding, route it (PREFER a token; annotate only sanctioned art)

1. **Neutral / structural color** (background, surface, text, hairline, scrim,
   shadow) → `CatchTokens.of(context).<role>`. Tokens are brightness-aware, so
   this is also how you delete hardcoded dark hexes. Role map:
   | Use | Token |
   |---|---|
   | page background | `t.bg` |
   | card/sheet surface | `t.surface` / `t.raised` |
   | primary / secondary / tertiary text | `t.ink` / `t.ink2` / `t.ink3` |
   | hairline / heavier divider, borders | `t.line` / `t.line2` |
   | default action (ink/paper) + its text | `t.primary` / `t.primaryInk` / `t.primarySoft` |
   | success / warning / danger | `t.success` / `t.warning` / `t.danger` |
   | like / pass / gold | `t.like` / `t.pass` / `t.gold` |
   | scrim/pill that stays dark on any theme | `t.darkScrimFill` / `t.darkPillFill` / `t.darkPillInk` |
   | legible fg on an arbitrary fill | `t.onFill(fill)` / `t.onFillMuted(fill)` |
   ```dart
   color: const Color(0xFF16140F)        →  color: t.ink
   border: Border.all(color: Colors.black12) → border: Border.all(color: t.line)
   ```
   `final t = CatchTokens.of(context);` once per build.

2. **Activity color** (a per-`ActivityKind` pigment) →
   `ActivityPalette.of(context).forKind(kind)` → `.accent` / `.deep` / `.soft`.
   Never hardcode an activity hex.
   ```dart
   final sw = ActivityPalette.of(context).forKind(event.activityKind);
   color: sw.accent   // CTA / kicker      color: sw.soft   // tint fill
   ```

3. **Raw `TextStyle(...)`** → a named `CatchTextStyles.<style>(context)`
   (display/headline/headlineS/titleL/sectionTitle/bodyL/M/S/supporting/
   label*/kicker/monoLabel/…). If no semantic role fits, add one to
   `CatchTextStyles`; app UI must not call `CatchFonts` directly or own
   `letterSpacing` at the call site.
   ```dart
   style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)  →  style: CatchTextStyles.sectionTitle(context)
   ```

4. **`GoogleFonts.*` / `getFont(`** → a semantic `CatchTextStyles` role backed by
   bundled fonts. Production must have zero `GoogleFonts` outside the sandbox.

5. **A "palette-owner" file** (a class holding a PARALLEL hardcoded palette, e.g.
   `ProfileCardPalette`, `ClubCoverVisualPalette`, `pace_level_theme`) → rewrite its
   `of(context)` to DERIVE every field from `CatchTokens` (drop `isDark` hex
   branches — the tokens are already brightness-aware):
   ```dart
   static ProfileCardPalette of(BuildContext context) {
     final t = CatchTokens.of(context);
     return ProfileCardPalette(
       background: t.bg, surface: t.surface, border: t.line2,
       textPrimary: t.ink, textSecondary: t.ink2, accent: t.primary,
       // …every field maps to a token; no raw hex, no isDark branch…
     );
   }
   ```

6. **Genuinely fixed / sanctioned art** — CustomPainter pattern/glyph fill,
   platform-spec map-pin color, app-icon brand color, a photo scrim that must be
   pure black — keep it and annotate (specific reason):
   ```dart
   // token:allow: CustomPainter pattern fill over the activity backdrop (theme-independent)
   color: Colors.white.withValues(alpha: patternOpacity),
   ```

## Step 3 — hard rules (this is how it goes wrong)
- **Light AND dark must be correct.** Read tokens; never bake a dark hex. Verify
  both `ThemeMode.light` and `ThemeMode.dark`.
- **Don't hide a hex in a private constant** (`static const _cardBg = Color(0x…)`)
  to dodge the scanner — `catch_no_local_design_constant` catches that pattern.
- **Don't blanket-annotate.** `// token:allow:` is for theme-independent art only.
  If a file has more than a couple, you're escape-hatching things that should be tokens.
- **Behavior-preserving:** pick the token whose value matches the old color's
  *intent* (an `#16140F` is `t.ink`, not a random near-black). When unsure which
  role, match the value in `package:catch_tokens/catch_tokens.dart`.

## Step 4 — verify (after every 5–10 files, and at the end)
```bash
bash tool/check_catch_ui_lint_drift.sh --count      # trend to 0
bash tool/check_catch_ui_lint_drift.sh --code catch_no_local_design_constant --label 'local design constants'
flutter analyze                                     # must stay clean
flutter test --concurrency=1                        # at the end — no new failures vs. baseline
```
Spot-check any touched screen in light + dark.

## Definition of done
- `bash tool/check_catch_ui_lint_drift.sh` exits 0.
- the focused `catch_no_local_design_constant` report exits 0.
- `flutter analyze` clean; no NEW test failures vs. the pre-change baseline.
- `// token:allow:` used only for theme-independent art, each with a specific reason.
````
