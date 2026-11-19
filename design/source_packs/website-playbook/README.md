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

## Token mapping

The canvas owns these values (blueprint D26). `tool/design/playbook/import_kit_tokens.mjs` writes each into `design/tokens/catch.tokens.json` and regenerates this table, and its `--check` (`design:website-playbook-tokens`) fails while the kit, the tokens and this table disagree. Mode `own`: the kit owns the token. Mode `match`: the token is a shared scale step the importer only checks. Colour rows list the selectors that show the colour's role; every other use of the hex resolves to the same token. The importer's README (`tool/design/playbook/README.md`) has the workflow.

<!-- kit-token-map:start (generated by import_kit_tokens.mjs) -->

| Kit selector and property | Kit value | Token | Mode |
|---|---|---|---|
| `.pg` | `#141114` | `palette.ink` | own |
| `.pg` | `#FFFFFF` | `palette.white` | own |
| `.pg .lead` | `#5A5450` | `palette.inkSecondary` | own |
| `.pg .tint` | `#F6F0E8` | `palette.paper` | own |
| `.pg .m-coral, .pg .bigwm` | `#F07A55` | `palette.coral` (also `ground.coral.fill`) | own |
| `.pg .m-pink` | `#F08AA0` | `palette.pink` (also `ground.pink.fill`) | own |
| `.pg .m-yellow` | `#F5C451` | `palette.yellow` (also `ground.yellow.fill`) | own |
| `.pg .m-mint` | `#5CCB9F` | `palette.mint` (also `ground.mint.fill`) | own |
| `.pg .m-indigo` | `#8C9BF2` | `palette.indigo` (also `ground.indigo.fill`) | own |
| `.pg .m-magenta` | `#E58AC8` | `palette.magenta` (also `ground.magenta.fill`) | own |
| `.pg .m-sky` | `#5EC2E6` | `palette.sky` (also `ground.sky.fill`) | own |
| `.pg .tile.s-coral` | `#FDE7DF` | `palette.coralSoft` (also `ground.coralSoft.fill`) | own |
| `.pg .tile.s-pink` | `#FDE4EA` | `palette.pinkSoft` (also `ground.pinkSoft.fill`) | own |
| `.pg .tile.s-yellow` | `#FFF4D6` | `palette.yellowSoft` (also `ground.yellowSoft.fill`) | own |
| `.pg .tile.s-mint` | `#DDF3EA` | `palette.mintSoft` (also `ground.mintSoft.fill`) | own |
| `.pg .tile.s-indigo` | `#E8EBFD` | `palette.indigoSoft` (also `ground.indigoSoft.fill`) | own |
| `.pg .tile.s-magenta` | `#FBE4F3` | `palette.magentaSoft` (also `ground.magentaSoft.fill`) | own |
| `.pg .tile.s-sky` | `#DDF1F8` | `palette.skySoft` (also `ground.skySoft.fill`) | own |
| `.pg .ink, .pg .foot, .pg .offer` | `#1B171B` | `palette.inkGround` (also `ground.ink.fill`) | own |
| `.pg .ink, .pg .foot` | `#F6EFE6` | `palette.nightInk` (also `ground.ink.ink`) | own |
| `.pg .foot a` | `#BDB3A7` | `palette.nightSecondary` (also `ground.ink.inkSecondary`) | own |
| `.pg .legal, .pg .fine` | `#8A8079` | `palette.nightTertiary` | own |
| `.pg .m-mint .lead` | `#123D2C` | `palette.mintInk` (also `ground.mint.inkSecondary`) | own |
| `.pg .kbanner, .pg .ktag.warn` | `#4A3A0B` | `palette.yellowInk` (also `ground.yellow.inkSecondary`) | own |
| `.pg .ktabs button:focus-visible` | `#4C5BC4` | `palette.indigoDeep` | own |
| `.pg .wa` | `#1F7A57` | `palette.mintDeep` | own |
| `.pg .ktag.info` | `#1E2550` | `palette.indigoInk` | own |
| `.pg .bar nav, .pg .kp` | `#2B2427` | `website.color.inkBody` | own |
| `.pg .kgroup ul, .pg .cmp td` | `#4D4549` | `website.color.inkList` | own |
| `.pg .crumb, .pg .consent` | `#6B6266` | `website.color.inkMuted` | own |
| `.pg .cmp td.na` | `#A39A93` | `website.color.inkFaint` | own |
| `.pg .crumb span` | `#B5ACA5` | `website.color.separator` | own |
| `.pg .in, .pg .chipsel button` | `#D6CEC7` | `website.color.controlLine` | own |
| `.pg .proto` | `#CFC6BE` | `website.color.protoLine` | own |
| `.pg .ktoc a, .pg .kstory .stat` | `#E3DAD1` | `website.color.lineOnPaper` | own |
| `.pg .q, .pg .ans` | `#E6DFD9` | `website.color.lineFaq` | own |
| `.pg .krow, .pg .cmp th` | `#EEE7E1` | `website.color.lineRow` | own |
| `.pg .cmp td` | `#F1EBE5` | `website.color.lineCell` | own |
| `.pg .kperson .ph2` | `#EFE7DE` | `website.color.placeholderStripe` | own |
| `.pg .proto` | `#F3EEE9` | `website.color.protoStripe` | own |
| `.pg .proto` | `#FBF8F5` | `website.color.protoStripeLight` | own |
| `.pg .kbanner` | `#F7CF6B` | `website.color.bannerStripe` | own |
| `.pg .ktag.warn, .pg .klabel` | `#FCE3B5` | `website.color.tagWarn` | own |
| `.pg .ktag.good` | `#D6F2E6` | `website.color.tagGood` | own |
| `.pg .ktag.info` | `#E3E6FC` | `website.color.tagInfo` | own |
| `.pg .cmp td.us` | `#EAF7F1` | `website.color.compareUs` | own |
| `.pg .cmp td.us` | `#0F3D2B` | `website.color.compareUsInk` | own |
| `.pg .phone, .pg .tablet` | `#121013` | `website.color.deviceBezel` | own |
| `.pg .mbar .b.wab` | `#25D366` | `website.color.whatsapp` | own |
| `.pg .kchat` | `#ECE5DD` | `website.color.chatGround` | own |
| `.pg .kchat p.me` | `#D9FDD3` | `website.color.chatOwn` | own |
| `.pg` font-family | `Inter` | `font.family.function` | own |
| `.pg .d` font-family | `Archivo` | `font.family.voice` | match |
| `.pg .d` font-weight | `760` | `typography.role.displayHero.weight` | match |
| `.pg .d` line-height | `.98` | `typography.role.displayHero.lineHeight` | own |
| `.pg .d` letter-spacing | `-.03em` | `typography.role.displayHero.tracking` | own |
| `.pg .d-hero` font-size | `80px` | `typography.role.displayHero.size` | own |
| `.pg .d-hero` font-size (phone) | `44px` | `website.type.hero.compactSize` | own |
| `.pg .d-sec` font-size | `56px` | `website.type.section.size` | own |
| `.pg .d-sec` font-size (phone) | `36px` | `website.type.section.compactSize` | own |
| `.pg .d-sm` font-size | `30px` | `typography.role.displaySection.size` | match |
| `.pg .d-sm` line-height | `1.05` | `typography.role.displaySection.lineHeight` | match |
| `.pg .d-sm` font-size (phone) | `26px` | `website.type.small.compactSize` | own |
| `.pg .d-xs` font-size | `22px` | `website.type.xs.size` | own |
| `.pg .d-xs` line-height | `1.1` | `typography.role.displayXs.lineHeight` | match |
| `.pg .d-xs` letter-spacing | `-.02em` | `website.type.xs.tracking` | own |
| `.pg .lead` font-size | `19px` | `typography.role.bodyLead.size` | own |
| `.pg .lead` line-height | `1.5` | `typography.role.bodyLead.lineHeight` | match |
| `.pg .lead` font-size (phone) | `17px` | `website.type.lead.compactSize` | own |
| `.pg .body` font-size | `15px` | `typography.role.body.size` | match |
| `.pg .body` line-height | `1.5` | `website.type.body.lineHeight` | own |
| `.pg .k` font | `13px` | `typography.role.labelKicker.size` | match |
| `.pg .k` font | `18px` | `website.type.kicker.lineHeight` | own |
| `.pg .k` letter-spacing | `.04em` | `website.type.kicker.tracking` | own |
| `.pg .wm` font-size | `26px` | `website.wordmark.bar.size` | own |
| `.pg .wm` font-weight | `800` | `website.wordmark.weight` | own |
| `.pg .wm` letter-spacing | `-.03em` | `website.wordmark.bar.tracking` | own |
| `.pg .bigwm` font-weight | `800` | `website.wordmark.weight` | match |
| `.pg .bigwm` font-size | `120px` | `website.wordmark.footer.sizeMin` | own |
| `.pg .bigwm` font-size | `24cqi` | `website.wordmark.footer.sizeFluid` | own |
| `.pg .bigwm` font-size | `330px` | `website.wordmark.footer.sizeMax` | own |
| `.pg .bigwm` font-size (phone) | `31cqi` | `website.wordmark.footer.compactSizeFluid` | own |
| `.pg .bigwm` letter-spacing | `-.05em` | `website.wordmark.footer.tracking` | own |
| `.pg .bigwm` line-height | `.8` | `website.wordmark.footer.lineHeight` | own |
| `.pg .bigwm` margin | `56px` | `website.wordmark.footer.gap` | own |
| `.pg .bigwm` margin-top (phone) | `40px` | `space.s10` | match |
| `.pg .bar` height | `68px` | `website.header.height` | own |
| `.pg .bar` height (phone) | `60px` | `website.header.compactHeight` | own |
| `.pg .bar` gap | `26px` | `website.header.gap` | own |
| `.pg .bar` gap (phone) | `10px` | `website.header.compactGap` | own |
| `.pg .bar` padding | `1200px` | `website.content.max` | own |
| `.pg .bar` padding | `24px` | `website.content.gutter` | own |
| `.pg .bar` padding (phone) | `16px` | `website.content.compactGutter` | own |
| `.pg .bar nav` gap | `22px` | `website.header.navGap` | own |
| `.pg .bar nav` font-size | `15px` | `website.header.navSize` | own |
| `.pg .bar nav` font-weight | `500` | `website.header.navWeight` | own |
| `.pg .bar nav svg` width | `14px` | `website.header.chevronSize` | own |
| `.pg .wa` font-size | `14px` | `typography.role.labelAction.size` | match |
| `.pg .wa` gap | `8px` | `space.s2` | match |
| `.pg .wa svg` width | `20px` | `website.header.contactIconSize` | own |
| `.pg .bar .signin` font-size | `14px` | `typography.role.labelAction.size` | match |
| `.pg .bar .menu` width | `40px` | `size.controlMd` | match |
| `.pg .bar .menu` border-radius | `999px` | `radius.pill` | match |
| `.pg .crumb` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.pg .b` border-radius | `999px` | `radius.pill` (also `radius.button`) | match |
| `.pg .b` height | `48px` | `size.controlLg` | match |
| `.pg .b` padding | `22px` | `website.button.lg.padding` | own |
| `.pg .b` font | `15px` | `typography.role.labelButton.size` | match |
| `.pg .b` border | `1.5px` | `stroke.control` | match |
| `.pg .b.sm` height | `38px` | `website.button.sm.height` | own |
| `.pg .b.sm` padding | `16px` | `space.s4` | match |
| `.pg .b.sm` font-size | `14px` | `typography.role.labelAction.size` | match |
| `.pg .bar .b.sm` height (phone) | `36px` | `website.button.sm.compactHeight` | own |
| `.pg .bar .b.sm` padding (phone) | `14px` | `space.micro14` | match |
| `.pg .bar .b.sm` font-size (phone) | `13px` | `website.button.sm.compactSize` | own |
| `.pg .b.ow` border-color | `rgba(255,255,255,.7)` | `website.color.onInkControlLine` | own |
| `.pg .foot` margin | `16px` | `space.s4` | match |
| `.pg .foot` margin | `24px` | `website.content.gutter` | match |
| `.pg .foot` border-radius | `36px` | `radius.panel` | own |
| `.pg .foot` padding | `64px` | `space.s16` | match |
| `.pg .foot` padding | `72px` | `website.panel.padInline` | match |
| `.pg .foot` padding | `40px` | `space.s10` | match |
| `.pg .foot` margin (phone) | `8px` | `space.s2` | match |
| `.pg .foot` border-radius (phone) | `28px` | `radius.mat` | match |
| `.pg .foot` padding (phone) | `36px` | `space.s9` | match |
| `.pg .foot` padding (phone) | `20px` | `space.s5` | match |
| `.pg .foot` padding (phone) | `26px` | `website.footer.compactPadBottom` | own |
| `.pg .foot .top` padding-bottom | `36px` | `space.s9` | match |
| `.pg .foot .top` margin-bottom | `40px` | `space.s10` | match |
| `.pg .foot .top` gap | `16px` | `space.s4` | match |
| `.pg .foot .top` border-bottom | `rgba(246,239,230,.12)` | `theme.dark.color.line` | match |
| `.pg .foot .top h3` font-size | `22px` | `website.footer.titleSize` | own |
| `.pg .foot .cols` columns | `192px` | `website.footer.columnMin` | own |
| `.pg .foot .cols` column-gap | `24px` | `space.s6` | match |
| `.pg .foot .cols>div` padding-bottom | `32px` | `space.s8` | match |
| `.pg .foot h4` margin | `14px` | `space.micro14` | match |
| `.pg .foot h4` font-size | `15px` | `typography.role.body.size` | match |
| `.pg .foot a` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.pg .foot a` line-height | `1.4` | `website.footer.linkLineHeight` | own |
| `.pg .foot a` padding | `4.2px` | `website.footer.linkPadBlock` | own |
| `.pg .legal` margin-top | `28px` | `space.s7` | match |
| `.pg .legal` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.pg .legal` gap | `16px` | `space.s4` | match |
| `.pg .fn` margin | `24px` | `space.s6` | match |
| `.pg .fn` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.pg .fn` line-height | `1.6` | `website.footer.noteLineHeight` | own |
| `.pg .panel` border-radius | `36px` | `radius.panel` | own |
| `.pg .panel` padding | `88px` | `website.panel.padBlock` | own |
| `.pg .panel` padding | `72px` | `website.panel.padInline` | own |
| `.pg .panel` margin | `16px` | `space.s4` | match |
| `.pg .panel` margin | `24px` | `website.content.gutter` | match |
| `.pg .panel` border-radius (phone) | `28px` | `radius.mat` | match |
| `.pg .panel` margin (phone) | `8px` | `space.s2` | match |
| `.pg .panel` padding (phone) | `40px` | `space.s10` | match |
| `.pg .panel` padding (phone) | `20px` | `space.s5` | match |
| `.pg .heroc .htext` padding-bottom | `72px` | `website.hero.textPadBottom` | own |
| `.pg .heroc .htext` padding-bottom (phone) | `8px` | `space.s2` | match |
| `.pg .flush .htext` padding-bottom | `88px` | `website.panel.padBlock` | match |
| `.pg .flush .htext` padding-bottom (phone) | `8px` | `space.s2` | match |
| `.pg .mat` border-radius | `28px` | `radius.mat` | own |
| `.pg .tile` border-radius | `24px` | `radius.xl` | match |
| `.pg .tile` padding | `24px` | `space.s6` | match |
| `.pg .ktoc` border-radius | `20px` | `radius.lg` | match |
| `.pg .ktip` border-radius | `16px` | `radius.md` | match |
| `.pg .ph` border-radius | `6px` | `radius.xs` | match |
| `.pg .in` border-radius | `14px` | `website.radius.field` | own |
| `.pg .date` border-radius | `12px` | `website.radius.square` | own |
| `.pg .steps` gap | `6px` | `space.micro6` | match |
| `.pg .steps li` grid-template-columns | `40px` | `website.steps.markerWidth` | own |
| `.pg .steps li` gap | `14px` | `space.micro14` | match |
| `.pg .steps li` padding | `14px` | `space.micro14` | match |
| `.pg .steps li` padding | `18px` | `space.micro18` | match |
| `.pg .steps li` border-radius | `20px` | `radius.lg` | match |
| `.pg .steps li.on` background | `rgba(255,255,255,.55)` | `website.color.stepOnLight` | own |
| `.pg .ink .steps li.on` background | `rgba(255,255,255,.07)` | `website.color.stepOnInk` | own |
| `.pg .steps .n` font | `800` | `website.type.figure.weight` | own |
| `.pg .steps .n` font | `30px` | `typography.role.displaySection.size` | match |
| `.pg .steps h3` font-size | `17px` | `typography.role.titleBar.size` | match |
| `.pg .steps .body` margin-top | `4px` | `space.s1` | match |
| `.pg .steps .body` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.pg .in` height | `48px` | `size.controlLg` | match |
| `.pg .in` border | `1.5px` | `stroke.control` | match |
| `.pg .grid3` gap | `16px` | `space.s4` | match |
| `.pg .grid3` margin-top | `40px` | `space.s10` | match |
| `.pg .split` gap | `64px` | `space.s16` | match |
| `.pg .open` padding | `112px` | `space.s28` | match |
| `.pg .btns` gap | `10px` | `space.micro10` | match |
| `.pg .btns` margin-top | `28px` | `space.s7` | match |
| `.pg .open` padding | `24px` | `space.s6` | match |
| `.pg .open` padding (phone) | `60px` | `website.section.compactPadTop` | own |
| `.pg .open` padding (phone) | `8px` | `space.s2` | match |
| `.pg .in` padding | `14px` | `space.micro14` | match |
| `.pg .fld label` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.pg .fld label` font-weight | `600` | `typography.role.labelAction.weight` | match |
| `.pg .fld label` margin-bottom | `6px` | `space.micro6` | match |
| `.pg .phone` border-radius | `44px` | `website.radius.device` | own |
| `.pg .phone` padding | `8px` | `space.s2` | match |
| `.pg .phone` box-shadow | `0 30px 60px -20px rgba(20,17,20,.45),0 0 0 1px rgba(0,0,0,.5)` | `website.shadow.device` | own |
| `.pg .phone>img` border-radius | `36px` | `radius.panel` | match |
| `.pg .mbar` bottom (phone) | `8px` | `space.s2` | match |
| `.pg .mbar` margin (phone) | `8px` | `space.s2` | match |
| `.pg .mbar` gap (phone) | `8px` | `space.s2` | match |
| `.pg .mbar` padding (phone) | `8px` | `space.s2` | match |
| `.pg .mbar` border-radius (phone) | `999px` | `radius.pill` | match |
| `.pg .mbar` box-shadow (phone) | `0 16px 40px -12px rgba(0,0,0,.5)` | `website.shadow.dock` | own |
| `.pg .mbar .b` height (phone) | `44px` | `size.touchMin` | match |
| `.pg .mbar .b.wab` width (phone) | `44px` | `size.touchMin` | match |
| `.mbar .b.sec` border-color (phone) | `rgba(255,255,255,.6)` | `website.color.dockSecondaryLine` | own |
| `.hmedia` padding-top | `24px` | `space.s6` | match |
| `.hmedia` padding-top (phone) | `8px` | `space.s2` | match |
| `.hmedia` max-height (phone) | `340px` | `website.hero.compactMediaMax` | own |
| `.hphone` width | `360px` | `website.hero.phoneWidth` | own |
| `.hphone` margin-bottom | `-250px` | `website.hero.phoneBleed` | own |
| `.hphone` width (phone) | `230px` | `website.hero.compactPhoneWidth` | own |
| `.hphone` margin-bottom (phone) | `-300px` | `website.hero.compactPhoneBleed` | own |
| `.notify` margin-top | `22px` | `website.hero.notifyGap` | own |
| `.notify` border-radius | `22px` | `website.radius.card` | own |
| `.notify` padding | `16px` | `space.s4` | match |
| `.notify` max-width | `540px` | `website.hero.notifyMax` | own |
| `.notify h3` font-size | `15px` | `typography.role.body.size` | match |
| `.notify p` margin | `2px` | `space.micro2` | match |
| `.notify p` margin | `10px` | `space.micro10` | match |
| `.notify p` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.notify .row` gap | `8px` | `space.s2` | match |
| `.notify .in` height | `44px` | `size.fieldMd` | match |
| `.consent` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.hchip` padding | `12px` | `space.s3` | match |
| `.hchip` padding | `16px` | `space.s4` | match |
| `.hchip` gap | `12px` | `space.s3` | match |
| `.hchip` border-radius | `20px` | `radius.lg` | match |
| `.hchip` box-shadow | `0 18px 40px -16px rgba(0,0,0,.45)` | `website.shadow.chip` | own |
| `.hchip` bottom (phone) | `24px` | `space.s6` | match |
| `.hchip` padding (phone) | `8px` | `space.s2` | match |
| `.hchip` padding (phone) | `12px` | `space.s3` | match |
| `.hchip p` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.hchip strong` font-size | `15px` | `typography.role.body.size` | match |
| `.hchip strong` font-size (phone) | `13px` | `typography.role.bodyMeta.size` | match |
| `.date` width | `48px` | `website.date.width` | own |
| `.date` height | `52px` | `website.date.height` | own |
| `.date` font | `11px` | `website.date.labelSize` | own |
| `.date` letter-spacing | `.04em` | `website.type.kicker.tracking` | match |
| `.date b` font | `22px` | `website.type.xs.size` | match |
| `.hchip .date` width (phone) | `40px` | `website.date.compactWidth` | own |
| `.hchip .date` height (phone) | `44px` | `website.date.compactHeight` | own |
| `.entries` gap | `12px` | `space.s3` | match |
| `.entries` margin-top | `40px` | `space.s10` | match |
| `.entries` gap (phone) | `10px` | `space.micro10` | match |
| `.ent` border-radius | `24px` | `radius.xl` | match |
| `.ent` padding | `20px` | `space.s5` | match |
| `.ent` min-height | `200px` | `website.tile.minHeight` | own |
| `.ent` gap | `8px` | `space.s2` | match |
| `.ent` min-height (phone) | `160px` | `website.tile.compactMinHeight` | own |
| `.ent` padding (phone) | `16px` | `space.s4` | match |
| `.ent svg` width | `28px` | `website.tile.iconSize` | own |
| `.ent h3` font-size | `18px` | `website.type.cardTitle.size` | match |
| `.ent h3` line-height | `1.2` | `website.type.tileTitle.lineHeight` | own |
| `.ent p` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.ent p` line-height | `1.45` | `website.type.tileBody.lineHeight` | own |
| `.ent p` color | `rgba(20,17,20,.78)` | `website.color.inkOnColour` | own |
| `.hd` gap | `32px` | `space.s8` | match |
| `.hd` gap (phone) | `16px` | `space.s4` | match |
| `.rail` gap | `16px` | `space.s4` | match |
| `.rail` margin-top | `40px` | `space.s10` | match |
| `.r3` gap | `20px` | `space.s5` | match |
| `.plan` border-radius | `24px` | `radius.xl` | match |
| `.plan` padding | `14px` | `space.micro14` | match |
| `.plan` box-shadow | `0 0 0 1px rgba(20,17,20,.06)` | `website.shadow.cardRing` | own |
| `.plan .phx` height | `150px` | `website.plan.mediaHeight` | own |
| `.plan .phx` border-radius | `16px` | `radius.md` | match |
| `.plan .row` gap | `12px` | `space.s3` | match |
| `.plan .row` margin-top | `14px` | `space.micro14` | match |
| `.plan h3` font-size | `17px` | `typography.role.titleBar.size` | match |
| `.plan h3` line-height | `1.25` | `website.type.cardTitle.lineHeight` | match |
| `.plan p` margin | `4px` | `space.s1` | match |
| `.plan p` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.plan .meta` margin-top | `14px` | `space.micro14` | match |
| `.plan .meta` padding-top | `12px` | `space.s3` | match |
| `.plan .meta` border-top | `#eee7e1` | `website.color.lineRow` | match |
| `.plan .meta` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.plan .badge` left | `10px` | `space.micro10` | match |
| `.plan .badge` padding | `5px` | `website.badge.padBlock` | own |
| `.plan .badge` padding | `10px` | `space.micro10` | match |
| `.plan .badge` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.card .mat` padding | `10px` | `space.micro10` | match |
| `.card .mat>div` border-radius | `20px` | `radius.lg` | match |
| `.card h3` margin | `14px` | `space.micro14` | match |
| `.card h3` font-size | `18px` | `website.type.cardTitle.size` | own |
| `.card h3` line-height | `1.25` | `website.type.cardTitle.lineHeight` | own |
| `.card .body` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.card .body` margin-top | `4px` | `space.s1` | match |
| `.card .more` margin-top | `10px` | `space.micro10` | match |
| `.card .more` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.chips` gap | `10px` | `space.micro10` | match |
| `.chips` margin-top | `20px` | `space.s5` | match |
| `.chip2` min-height | `44px` | `size.touchMin` | match |
| `.chip2` padding | `18px` | `space.micro18` | match |
| `.chip2` box-shadow | `0 0 0 1px rgba(20,17,20,.1)` | `website.shadow.chipRing` | own |
| `.chip2` font-size | `15px` | `typography.role.body.size` | match |
| `.chip2` gap | `8px` | `space.s2` | match |
| `.chip2 i` width | `8px` | `website.chip.dotSize` | own |
| `.chip2` min-height (phone) | `40px` | `size.controlMd` | match |
| `.chip2` padding (phone) | `14px` | `space.micro14` | match |
| `.chip2` font-size (phone) | `14px` | `typography.role.bodySmall.size` | match |
| `.bento` gap | `16px` | `space.s4` | match |
| `.bento .mid` padding | `24px` | `space.s6` | match |
| `.bento .mid` border-radius | `28px` | `radius.mat` | match |
| `.bento .mid h2` font-size | `42px` | `website.type.feature.size` | match |
| `.bento .mid` padding (phone) | `20px` | `space.s5` | match |
| `.bento .mid h2` font-size (phone) | `32px` | `website.type.feature.compactSize` | match |
| `.tile` border-radius | `24px` | `radius.xl` | match |
| `.tile` padding | `20px` | `space.s5` | match |
| `.tile` min-height | `200px` | `website.tile.minHeight` | match |
| `.tile` gap | `16px` | `space.s4` | match |
| `.tile` min-height (phone) | `150px` | `website.tile.bentoCompactMinHeight` | own |
| `.tile` padding (phone) | `16px` | `space.s4` | match |
| `.tile .tag` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.tile .tag` padding | `5px` | `website.badge.padBlock` | match |
| `.tile .tag` background | `rgba(255,255,255,.55)` | `website.color.stepOnLight` | match |
| `.tile p` font-size | `15px` | `typography.role.body.size` | match |
| `.tile p` line-height | `1.4` | `website.type.tile.lineHeight` | own |
| `.tile .mini` border-radius | `14px` | `website.radius.field` | match |
| `.tile .mini` padding | `10px` | `space.micro10` | match |
| `.tile .mini` padding | `12px` | `space.s3` | match |
| `.tile .mini` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.tile .mini` box-shadow | `0 8px 20px -10px rgba(0,0,0,.3)` | `website.shadow.mini` | own |
| `.frm` gap | `10px` | `space.micro10` | match |
| `.frm` margin-top | `18px` | `space.micro18` | match |
| `.frm .row` gap | `8px` | `space.s2` | match |
| `.ref` gap | `48px` | `space.s12` | match |
| `.ref` gap (phone) | `20px` | `space.s5` | match |
| `.pg .price` font-size | `200px` | `website.type.price.size` | own |
| `.pg .price` font-size (phone) | `130px` | `website.type.price.compactSize` | own |
| `.pg .price` line-height | `.8` | `website.type.price.lineHeight` | own |
| `.pg .price` letter-spacing | `-.05em` | `website.type.price.tracking` | own |
| `.pg .price` font-weight | `800` | `website.type.figure.weight` | match |
| `.pg .calc2 .sv` font | `52px` | `website.calculator.valueSize` | own |
| `.pg .calc2 .sv` font-size (phone) | `40px` | `website.calculator.compactValueSize` | own |
| `.pg .calc2 .sv` letter-spacing | `-.02em` | `website.type.xs.tracking` | match |
| `.pg .calc2 small` font-size | `13px` | `typography.role.bodyMeta.size` | match |
| `.pg .rmm` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.pg .rmm` margin | `16px` | `space.s4` | match |
| `.pg .tiles2` gap | `12px` | `space.s3` | match |
| `.pg .tiles2>div` border-radius | `18px` | `website.radius.tile` | own |
| `.pg .tiles2>div` padding | `16px` | `space.s4` | match |
| `.pg .tiles2>div` background | `rgba(255,255,255,.06)` | `website.color.fillOnInk` | own |
| `.pg .tiles2 b` font | `34px` | `website.calculator.tileSize` | own |
| `.pg .capped` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.pg .capped` margin | `14px` | `space.micro14` | match |
| `.pg .fine` font-size | `12px` | `typography.role.labelBadge.size` | match |
| `.pg .ink .incl span` background | `rgba(255,255,255,.08)` | `website.color.pillOnInk` | own |
| `.pg .incl` gap | `8px` | `space.s2` | match |
| `.pg .ex` gap | `12px` | `space.s3` | match |
| `.pg .ex>div` border-radius | `20px` | `radius.lg` | match |
| `.pg .ex>div` padding | `20px` | `space.s5` | match |
| `.pg .ex b` font | `32px` | `website.type.example.size` | own |
| `.ex` margin-top | `48px` | `space.s12` | match |
| `.ex b` font | `30px` | `typography.role.displaySection.size` | match |
| `.orgline` margin-top | `28px` | `space.s7` | match |
| `.orgline` padding-top | `24px` | `space.s6` | match |
| `.orgline` border-top | `rgba(246,239,230,.14)` | `website.color.lineOnInk` | own |
| `.capbar` height | `56px` | `website.capBar.height` | own |
| `.capbar` border-radius | `16px` | `radius.md` | match |
| `.capbar` margin-top | `28px` | `space.s7` | match |
| `.capbar span` padding | `14px` | `space.micro14` | match |
| `.stg` border-radius | `24px` | `radius.xl` | match |
| `.stg` padding | `24px` | `space.s6` | match |
| `.stg` gap | `10px` | `space.micro10` | match |
| `.stg` min-height | `230px` | `website.routeCard.minHeight` | own |
| `.stg h3` font-size | `20px` | `typography.role.displayXs.size` | match |
| `.stg p` font-size | `15px` | `typography.role.body.size` | match |
| `.stg .go` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.path` min-height | `300px` | `website.routeCard.tallMinHeight` | own |
| `.path h3` font-size | `21px` | `website.routeCard.tallTitleSize` | own |
| `.path h3` line-height | `1.2` | `website.type.tileTitle.lineHeight` | match |
| `.path p` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.path .n` font | `15px` | `typography.role.body.size` | match |
| `.vid` height | `110px` | `website.routeCard.mediaHeight` | own |
| `.vid` border-radius | `16px` | `radius.md` | match |
| `.paths` gap | `16px` | `space.s4` | match |
| `.tl` margin | `32px` | `space.s8` | match |
| `.tl` border-left | `rgba(246,239,230,.16)` | `website.color.timelineLine` | own |
| `.tl li` grid-template-columns | `84px` | `website.timeline.timeWidth` | own |
| `.tl li` grid-template-columns (phone) | `64px` | `website.timeline.compactTimeWidth` | own |
| `.tl li` gap | `12px` | `space.s3` | match |
| `.tl li` font-size | `14px` | `typography.role.bodySmall.size` | match |
| `.tl li.on b` font-size | `18px` | `website.timeline.onTitleSize` | own |

<!-- kit-token-map:end -->
