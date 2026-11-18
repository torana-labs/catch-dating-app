// The canvas-to-token map for the website playbook kit. The design canvas
// ("Catch directions", Website · conversion playbook) is the source of truth
// for these values: import_kit_tokens.mjs reads the kit stylesheets and writes
// each value into design/tokens/catch.tokens.json, and its --check fails when
// the two disagree.
//
// colors: every hex the kit stylesheets use, keyed by the hex, with one
//   selector that shows its role. A kit hex with no row fails the check, and
//   so does a row whose hex the kit no longer uses.
// declarations: one kit declaration (file, selector, property, optionally the
//   phone container block) and the token it sets. `pick.part` takes one
//   whitespace-separated part of a shorthand; `pick.regex` takes its first
//   capture group.
//
// mode "own" (the default): the kit owns the token, so the importer writes
//   the kit's value into it. mode "match": the token is a shared scale step
//   (spacing, a type role the apps also use); the importer only checks that
//   it equals the kit, and a mismatch means the kit moved off the scale and
//   the row needs remapping.
// roles: alias tokens that must point at the token, such as ground.ink.fill.
// description: the $description of a token the importer creates; required
//   when the token does not exist yet.

export const kitFiles = {
  panels: "design/source_packs/website-playbook/kit/playbook-panels.css",
  kit: "design/source_packs/website-playbook/kit/playbook-kit.css",
  // The homepage board's own stylesheet: the sections only the homepage draws
  // (entry tiles, format cards, the hero's notify card and plan chip, the
  // bento app band, the refer panel). It lends declarations only; its one-off
  // inks are not kit colours, so it is left out of the hex coverage check.
  home: "design/source_packs/website-playbook/oneoff/PlaybookHome.dc.html",
  // The host landing's and the pricing page's own stylesheets: the route and
  // stage cards, the night timeline, the fee band's foot line and the cap bar.
  // Like the homepage board, they lend declarations only.
  hosts: "design/source_packs/website-playbook/oneoff/PlaybookHosts.dc.html",
  pricing: "design/source_packs/website-playbook/oneoff/PlaybookPricing.dc.html",
};

/** The kit's phone arrangement: `@container pg (max-width: 600px)`. */
export const phone = "pg (max-width: 600px)";

const color = (hex, token, sample, extra = {}) => ({hex, token, sample, ...extra});

export const colorMap = [
  color("#141114", "palette.ink", ".pg"),
  color("#FFFFFF", "palette.white", ".pg"),
  color("#5A5450", "palette.inkSecondary", ".pg .lead"),
  color("#F6F0E8", "palette.paper", ".pg .tint"),
  color("#F07A55", "palette.coral", ".pg .m-coral, .pg .bigwm", {roles: ["ground.coral.fill"]}),
  color("#F08AA0", "palette.pink", ".pg .m-pink", {roles: ["ground.pink.fill"]}),
  color("#F5C451", "palette.yellow", ".pg .m-yellow", {roles: ["ground.yellow.fill"]}),
  color("#5CCB9F", "palette.mint", ".pg .m-mint", {roles: ["ground.mint.fill"]}),
  color("#8C9BF2", "palette.indigo", ".pg .m-indigo", {roles: ["ground.indigo.fill"]}),
  color("#E58AC8", "palette.magenta", ".pg .m-magenta", {roles: ["ground.magenta.fill"]}),
  color("#1B171B", "palette.inkGround", ".pg .ink, .pg .foot, .pg .offer", {
    roles: ["ground.ink.fill"],
    description: "The ink ground: dark panels, the offer strip and the footer card. Canvas-owned (Website · conversion playbook).",
  }),
  color("#F6EFE6", "palette.nightInk", ".pg .ink, .pg .foot", {roles: ["ground.ink.ink"]}),
  color("#BDB3A7", "palette.nightSecondary", ".pg .foot a", {roles: ["ground.ink.inkSecondary"]}),
  color("#8A8079", "palette.nightTertiary", ".pg .legal, .pg .fine", {
    description: "Tertiary text on the ink ground: the footer's legal line and footnotes, and fine print. Canvas-owned.",
  }),
  color("#123D2C", "palette.mintInk", ".pg .m-mint .lead", {roles: ["ground.mint.inkSecondary"]}),
  color("#4A3A0B", "palette.yellowInk", ".pg .kbanner, .pg .ktag.warn", {roles: ["ground.yellow.inkSecondary"]}),
  color("#4C5BC4", "palette.indigoDeep", ".pg .ktabs button:focus-visible"),
  color("#1F7A57", "palette.mintDeep", ".pg .wa"),
  color("#1E2550", "palette.indigoInk", ".pg .ktag.info"),
  color("#2B2427", "website.color.inkBody", ".pg .bar nav, .pg .kp", {
    description: "Header page links and long-form prose on white and paper.",
  }),
  color("#4D4549", "website.color.inkList", ".pg .kgroup ul, .pg .cmp td", {
    description: "List and table body text on white.",
  }),
  color("#6B6266", "website.color.inkMuted", ".pg .crumb, .pg .consent", {
    description: "Breadcrumbs, consent lines and sources on white.",
  }),
  color("#A39A93", "website.color.inkFaint", ".pg .cmp td.na", {
    description: "Not-applicable comparison cells.",
  }),
  color("#B5ACA5", "website.color.separator", ".pg .crumb span", {
    description: "Breadcrumb separators.",
  }),
  color("#D6CEC7", "website.color.controlLine", ".pg .in, .pg .chipsel button", {
    description: "Outline of fields, chips, steppers and choice buttons on white.",
  }),
  color("#CFC6BE", "website.color.protoLine", ".pg .proto", {
    description: "The canvas prototype switch's rule. Canvas only.",
  }),
  color("#E3DAD1", "website.color.lineOnPaper", ".pg .ktoc a, .pg .kstory .stat", {
    description: "Hairlines on paper.",
  }),
  color("#E6DFD9", "website.color.lineFaq", ".pg .q, .pg .ans", {
    description: "Question rules in the FAQ.",
  }),
  color("#EEE7E1", "website.color.lineRow", ".pg .krow, .pg .cmp th", {
    description: "Row hairlines and quiet tags on white.",
  }),
  color("#F1EBE5", "website.color.lineCell", ".pg .cmp td", {
    description: "Table cell hairlines.",
  }),
  color("#EFE7DE", "website.color.placeholderStripe", ".pg .kperson .ph2", {
    description: "The darker stripe of a photo placeholder.",
  }),
  color("#F3EEE9", "website.color.protoStripe", ".pg .proto", {
    description: "The darker stripe of the canvas prototype switch. Canvas only.",
  }),
  color("#FBF8F5", "website.color.protoStripeLight", ".pg .proto", {
    description: "The lighter stripe of the canvas prototype switch. Canvas only.",
  }),
  color("#F7CF6B", "website.color.bannerStripe", ".pg .kbanner", {
    description: "The lighter stripe of the yellow notice banner.",
  }),
  color("#FCE3B5", "website.color.tagWarn", ".pg .ktag.warn, .pg .klabel", {
    description: "Warning tags and labels inside product mocks.",
  }),
  color("#D6F2E6", "website.color.tagGood", ".pg .ktag.good", {
    description: "Success tags inside product mocks.",
  }),
  color("#E3E6FC", "website.color.tagInfo", ".pg .ktag.info", {
    description: "Information tags inside product mocks.",
  }),
  color("#EAF7F1", "website.color.compareUs", ".pg .cmp td.us", {
    description: "Catch's column in comparison tables.",
  }),
  color("#0F3D2B", "website.color.compareUsInk", ".pg .cmp td.us", {
    description: "Text in Catch's column of comparison tables.",
  }),
  color("#121013", "website.color.deviceBezel", ".pg .phone, .pg .tablet", {
    description: "Phone and tablet frames.",
  }),
  color("#25D366", "website.color.whatsapp", ".pg .mbar .b.wab", {
    description: "WhatsApp's brand green, on the phone action bar's chat button.",
  }),
  color("#ECE5DD", "website.color.chatGround", ".pg .kchat", {
    description: "A chat mock's ground.",
  }),
  color("#D9FDD3", "website.color.chatOwn", ".pg .kchat p.me", {
    description: "The sender's own bubble in a chat mock.",
  }),
];

const decl = (file, selector, property, token, extra = {}) => ({file, selector, property, token, ...extra});
const P = (selector, property, token, extra) => decl("panels", selector, property, token, extra);
const H = (selector, property, token, extra) => decl("home", selector, property, token, extra);
const K = (selector, property, token, extra) => decl("kit", selector, property, token, extra);
const S = (selector, property, token, extra) => decl("hosts", selector, property, token, extra);
const R = (selector, property, token, extra) => decl("pricing", selector, property, token, extra);
const match = {mode: "match"};
const onPhone = {container: phone};

export const declarationMap = [
  // Typefaces: the first family of each stack.
  P(".pg", "font-family", "font.family.function", {pick: {regex: "^([^,]+)"}}),
  P(".pg .d", "font-family", "font.family.voice", {...match, pick: {regex: "^([^,]+)"}}),

  // Type scale.
  P(".pg .d", "font-weight", "typography.role.displayHero.weight", match),
  P(".pg .d", "line-height", "typography.role.displayHero.lineHeight"),
  P(".pg .d", "letter-spacing", "typography.role.displayHero.tracking"),
  P(".pg .d-hero", "font-size", "typography.role.displayHero.size"),
  P(".pg .d-hero", "font-size", "website.type.hero.compactSize", {
    ...onPhone, description: "The hero headline on phones.",
  }),
  P(".pg .d-sec", "font-size", "website.type.section.size", {
    description: "A section headline on wide pages.",
  }),
  P(".pg .d-sec", "font-size", "website.type.section.compactSize", {
    ...onPhone, description: "A section headline on phones.",
  }),
  P(".pg .d-sm", "font-size", "typography.role.displaySection.size", match),
  P(".pg .d-sm", "line-height", "typography.role.displaySection.lineHeight", match),
  P(".pg .d-sm", "font-size", "website.type.small.compactSize", {
    ...onPhone, description: "A small display headline on phones.",
  }),
  P(".pg .d-xs", "font-size", "website.type.xs.size", {
    description: "The smallest display headline, such as a card title.",
  }),
  P(".pg .d-xs", "line-height", "typography.role.displayXs.lineHeight", match),
  P(".pg .d-xs", "letter-spacing", "website.type.xs.tracking", {
    description: "The smallest display headline's tracking.",
  }),
  P(".pg .lead", "font-size", "typography.role.bodyLead.size"),
  P(".pg .lead", "line-height", "typography.role.bodyLead.lineHeight", match),
  P(".pg .lead", "font-size", "website.type.lead.compactSize", {
    ...onPhone, description: "A lead paragraph on phones.",
  }),
  P(".pg .body", "font-size", "typography.role.body.size", match),
  P(".pg .body", "line-height", "website.type.body.lineHeight", {
    description: "Website body copy's leading. App body copy keeps typography.role.body.lineHeight.",
  }),
  P(".pg .k", "font", "typography.role.labelKicker.size", {...match, pick: {regex: "(\\d+px)/"}}),
  P(".pg .k", "font", "website.type.kicker.lineHeight", {
    pick: {regex: "/(\\d+px) "}, description: "A section kicker's leading on the website. App kickers keep typography.role.labelKicker.lineHeight.",
  }),
  P(".pg .k", "letter-spacing", "website.type.kicker.tracking", {
    description: "A section kicker's tracking on the website. App kickers keep typography.role.labelKicker.tracking.",
  }),
  P(".pg .wm", "font-size", "website.wordmark.bar.size", {
    description: "The wordmark in the site header.",
  }),
  P(".pg .wm", "font-weight", "website.wordmark.weight", {
    description: "The wordmark's weight in the header and the footer.",
  }),
  P(".pg .wm", "letter-spacing", "website.wordmark.bar.tracking", {
    description: "The header wordmark's tracking.",
  }),
  P(".pg .bigwm", "font-weight", "website.wordmark.weight", match),
  P(".pg .bigwm", "font-size", "website.wordmark.footer.sizeMin", {
    pick: {regex: "clamp\\(([^,]+),"}, description: "The footer wordmark's smallest size.",
  }),
  P(".pg .bigwm", "font-size", "website.wordmark.footer.sizeFluid", {
    pick: {regex: "clamp\\([^,]+,([^,]+),"}, description: "The footer wordmark's size as a share of the page width.",
  }),
  P(".pg .bigwm", "font-size", "website.wordmark.footer.sizeMax", {
    pick: {regex: ",([^,]+)\\)$"}, description: "The footer wordmark's largest size.",
  }),
  P(".pg .bigwm", "font-size", "website.wordmark.footer.compactSizeFluid", {
    ...onPhone, description: "The footer wordmark's size on phones, as a share of the page width.",
  }),
  P(".pg .bigwm", "letter-spacing", "website.wordmark.footer.tracking", {
    description: "The footer wordmark's tracking.",
  }),
  P(".pg .bigwm", "line-height", "website.wordmark.footer.lineHeight", {
    description: "The footer wordmark's leading.",
  }),
  P(".pg .bigwm", "margin", "website.wordmark.footer.gap", {
    pick: {part: 0}, description: "Space above the footer wordmark.",
  }),
  P(".pg .bigwm", "margin-top", "space.s10", {...match, ...onPhone}),

  // Header.
  P(".pg .bar", "height", "website.header.height"),
  P(".pg .bar", "height", "website.header.compactHeight", {
    ...onPhone, description: "The site header's height on phones.",
  }),
  P(".pg .bar", "gap", "website.header.gap", {description: "Space between the site header's parts."}),
  P(".pg .bar", "gap", "website.header.compactGap", {
    ...onPhone, description: "Space between the site header's parts on phones.",
  }),
  P(".pg .bar", "padding", "website.content.max", {pick: {regex: "100% - (\\d+px)"}}),
  P(".pg .bar", "padding", "website.content.gutter", {
    pick: {regex: "max\\((\\d+px)"}, description: "The page's side gutter on wide pages, where the content is narrower than the window.",
  }),
  P(".pg .bar", "padding", "website.content.compactGutter", {
    ...onPhone, pick: {part: 1}, description: "The page's side gutter on phones.",
  }),
  P(".pg .bar nav", "gap", "website.header.navGap", {description: "Space between the header's page links."}),
  P(".pg .bar nav", "font-size", "website.header.navSize", {description: "The header's page links."}),
  P(".pg .bar nav", "font-weight", "website.header.navWeight", {description: "The header's page links."}),
  P(".pg .bar nav svg", "width", "website.header.chevronSize", {description: "A header dropdown's chevron."}),
  P(".pg .wa", "font-size", "typography.role.labelAction.size", match),
  P(".pg .wa", "gap", "space.s2", match),
  P(".pg .wa svg", "width", "website.header.contactIconSize", {description: "The header's WhatsApp mark."}),
  P(".pg .bar .signin", "font-size", "typography.role.labelAction.size", match),
  P(".pg .bar .menu", "width", "size.controlMd", match),
  P(".pg .bar .menu", "border-radius", "radius.pill", match),
  P(".pg .crumb", "font-size", "typography.role.bodyMeta.size", match),

  // Buttons.
  P(".pg .b", "border-radius", "radius.pill", {...match, roles: ["radius.button"]}),
  P(".pg .b", "height", "size.controlLg", match),
  P(".pg .b", "padding", "website.button.lg.padding", {
    pick: {part: 1}, description: "A large button's side padding.",
  }),
  P(".pg .b", "font", "typography.role.labelButton.size", {...match, pick: {regex: "(\\d+px)/"}}),
  P(".pg .b", "border", "stroke.control", {...match, pick: {part: 0}}),
  P(".pg .b.sm", "height", "website.button.sm.height", {description: "A small button's height, such as the header's action."}),
  P(".pg .b.sm", "padding", "space.s4", {...match, pick: {part: 1}}),
  P(".pg .b.sm", "font-size", "typography.role.labelAction.size", match),
  P(".pg .bar .b.sm", "height", "website.button.sm.compactHeight", {
    ...onPhone, description: "The header action's height on phones.",
  }),
  P(".pg .bar .b.sm", "padding", "space.micro14", {...match, ...onPhone, pick: {part: 1}}),
  P(".pg .bar .b.sm", "font-size", "website.button.sm.compactSize", {
    ...onPhone, description: "The header action's label on phones.",
  }),
  P(".pg .b.ow", "border-color", "website.color.onInkControlLine", {
    description: "The outline of a secondary button on the ink ground.",
  }),

  // Footer.
  P(".pg .foot", "margin", "space.s4", {...match, pick: {part: 0}}),
  P(".pg .foot", "margin", "website.content.gutter", {...match, pick: {part: 1}}),
  P(".pg .foot", "border-radius", "radius.panel"),
  P(".pg .foot", "padding", "space.s16", {...match, pick: {part: 0}}),
  P(".pg .foot", "padding", "website.panel.padInline", {...match, pick: {regex: "max\\((\\d+px)"}}),
  P(".pg .foot", "padding", "space.s10", {...match, pick: {part: 2}}),
  P(".pg .foot", "margin", "space.s2", {...match, ...onPhone, pick: {part: 0}}),
  P(".pg .foot", "border-radius", "radius.mat", {...match, ...onPhone}),
  P(".pg .foot", "padding", "space.s9", {...match, ...onPhone, pick: {part: 0}}),
  P(".pg .foot", "padding", "space.s5", {...match, ...onPhone, pick: {part: 1}}),
  P(".pg .foot", "padding", "website.footer.compactPadBottom", {
    ...onPhone, pick: {part: 2}, description: "Space under the footer card's legal line on phones.",
  }),
  P(".pg .foot .top", "padding-bottom", "space.s9", match),
  P(".pg .foot .top", "margin-bottom", "space.s10", match),
  P(".pg .foot .top", "gap", "space.s4", match),
  P(".pg .foot .top", "border-bottom", "theme.dark.color.line", {...match, pick: {regex: "(rgba\\([^)]*\\))"}}),
  P(".pg .foot .top h3", "font-size", "website.footer.titleSize", {description: "The footer's top band title."}),
  P(".pg .foot .cols", "gap", "space.s6", match),
  P(".pg .foot .cols", "row-gap", "space.s7", {...match, ...onPhone}),
  P(".pg .foot h4", "margin", "space.micro14", {...match, pick: {part: 2}}),
  P(".pg .foot h4", "font-size", "typography.role.body.size", match),
  P(".pg .foot a", "font-size", "typography.role.bodySmall.size", match),
  P(".pg .foot a", "line-height", "website.footer.linkLineHeight", {description: "The footer links' leading, which sets their row rhythm."}),
  P(".pg .legal", "margin-top", "space.s7", match),
  P(".pg .legal", "font-size", "typography.role.labelBadge.size", match),
  P(".pg .legal", "gap", "space.s4", match),
  P(".pg .fn", "margin", "space.s6", {...match, pick: {part: 0}}),
  P(".pg .fn", "font-size", "typography.role.labelBadge.size", match),
  P(".pg .fn", "line-height", "website.footer.noteLineHeight", {description: "The footer footnotes' leading."}),

  // Panels and radii.
  P(".pg .panel", "border-radius", "radius.panel", {
    description: "Website panels and the footer card on wide pages. Canvas-owned.",
  }),
  P(".pg .panel", "padding", "website.panel.padBlock", {
    pick: {part: 0}, description: "Space above and below a panel's content on wide pages.",
  }),
  P(".pg .panel", "padding", "website.panel.padInline", {
    pick: {regex: "max\\((\\d+px)"}, description: "A panel's smallest side padding on wide pages.",
  }),
  P(".pg .panel", "margin", "space.s4", {...match, pick: {part: 0}}),
  P(".pg .panel", "margin", "website.content.gutter", {...match, pick: {part: 1}}),
  P(".pg .panel", "border-radius", "radius.mat", {...match, ...onPhone}),
  P(".pg .panel", "margin", "space.s2", {...match, ...onPhone, pick: {part: 0}}),
  P(".pg .panel", "padding", "space.s10", {...match, ...onPhone, pick: {part: 0}}),
  P(".pg .panel", "padding", "space.s5", {...match, ...onPhone, pick: {part: 1}}),
  P(".pg .heroc .htext", "padding-bottom", "website.hero.textPadBottom", {
    description: "Space under a hero's copy, whose media runs to the panel's bottom edge.",
  }),
  P(".pg .heroc .htext", "padding-bottom", "space.s2", {...match, ...onPhone}),
  P(".pg .flush .htext", "padding-bottom", "website.panel.padBlock", match),
  P(".pg .flush .htext", "padding-bottom", "space.s2", {...match, ...onPhone}),
  P(".pg .mat", "border-radius", "radius.mat", {
    description: "Colour mats, mock cards and photos; panels and the footer card on phones. Canvas-owned.",
  }),
  P(".pg .tile", "border-radius", "radius.xl", match),
  P(".pg .tile", "padding", "space.s6", match),
  K(".pg .ktoc", "border-radius", "radius.lg", match),
  K(".pg .ktip", "border-radius", "radius.md", match),
  P(".pg .ph", "border-radius", "radius.xs", match),
  P(".pg .in", "border-radius", "website.radius.field", {
    description: "A website field's corners. App fields keep radius.sm.",
  }),
  K(".pg .date", "border-radius", "website.radius.square", {
    description: "A website date or icon square's corners. App squares keep radius.sm.",
  }),

  // Step cards (the split's numbered steps).
  P(".pg .steps", "gap", "space.micro6", match),
  P(".pg .steps li", "grid-template-columns", "website.steps.markerWidth", {
    pick: {regex: "^(\\d+px)"}, description: "The number column of a website step card.",
  }),
  P(".pg .steps li", "gap", "space.micro14", match),
  P(".pg .steps li", "padding", "space.micro14", {...match, pick: {part: 0}}),
  P(".pg .steps li", "padding", "space.micro18", {...match, pick: {part: 1}}),
  P(".pg .steps li", "border-radius", "radius.lg", match),
  P(".pg .steps li.on", "background", "website.color.stepOnLight", {
    description: "A step card's fill on white, paper or a colour panel.",
  }),
  P(".pg .ink .steps li.on", "background", "website.color.stepOnInk", {
    description: "A step card's fill on the ink panel.",
  }),
  P(".pg .steps .n", "font", "website.type.figure.weight", {
    pick: {regex: "^(\\d+) "}, description: "The weight of the display figures the website sets in Archivo: step numbers, stats and prices.",
  }),
  P(".pg .steps .n", "font", "typography.role.displaySection.size", {...match, pick: {regex: " (\\d+px)/"}}),
  P(".pg .steps h3", "font-size", "typography.role.titleBar.size", match),
  P(".pg .steps .body", "margin-top", "space.s1", match),
  P(".pg .steps .body", "font-size", "typography.role.bodySmall.size", match),

  // Fields.
  P(".pg .in", "height", "size.controlLg", match),
  P(".pg .in", "border", "stroke.control", {...match, pick: {part: 0}}),

  // Spacing.
  P(".pg .grid3", "gap", "space.s4", match),
  P(".pg .grid3", "margin-top", "space.s10", match),
  P(".pg .split", "gap", "space.s16", match),
  P(".pg .open", "padding", "space.s28", {...match, pick: {regex: "^(\\d+px)"}}),
  P(".pg .btns", "gap", "space.micro10", match),
  P(".pg .btns", "margin-top", "space.s7", match),

  // Plain sections (the kit's .open): 112px above and 24px below, 60 and 8 on phones.
  P(".pg .open", "padding", "space.s6", {...match, pick: {part: 2}}),
  P(".pg .open", "padding", "website.section.compactPadTop", {
    ...onPhone, pick: {part: 0}, description: "Space above a plain (unpanelled) section on phones.",
  }),
  P(".pg .open", "padding", "space.s2", {...match, ...onPhone, pick: {part: 2}}),

  // Fields: the label above the box.
  P(".pg .in", "padding", "space.micro14", {...match, pick: {part: 1}}),
  P(".pg .fld label", "font-size", "typography.role.bodyMeta.size", match),
  P(".pg .fld label", "font-weight", "typography.role.labelAction.weight", match),
  P(".pg .fld label", "margin-bottom", "space.micro6", match),

  // The phone (device) frame.
  P(".pg .phone", "border-radius", "website.radius.device", {
    description: "A phone frame's outer corners.",
  }),
  P(".pg .phone", "padding", "space.s2", match),
  P(".pg .phone", "box-shadow", "website.shadow.device", {
    description: "The shadow under a phone frame.",
  }),
  P(".pg .phone>img", "border-radius", "radius.panel", match),

  // The phone action bar (.mbar), shown on phones only.
  P(".pg .mbar", "bottom", "space.s2", {...match, ...onPhone}),
  P(".pg .mbar", "margin", "space.s2", {...match, ...onPhone}),
  P(".pg .mbar", "gap", "space.s2", {...match, ...onPhone}),
  P(".pg .mbar", "padding", "space.s2", {...match, ...onPhone}),
  P(".pg .mbar", "border-radius", "radius.pill", {...match, ...onPhone}),
  P(".pg .mbar", "box-shadow", "website.shadow.dock", {
    ...onPhone, description: "The shadow under the phone action bar.",
  }),
  P(".pg .mbar .b", "height", "size.touchMin", {...match, ...onPhone}),
  P(".pg .mbar .b.wab", "width", "size.touchMin", {...match, ...onPhone}),
  H(".mbar .b.sec", "border-color", "website.color.dockSecondaryLine", {
    ...onPhone, description: "The outline of the phone action bar's second button.",
  }),

  // Homepage hero: the phone, the notify card and the plan chip.
  H(".hmedia", "padding-top", "space.s6", match),
  H(".hmedia", "padding-top", "space.s2", {...match, ...onPhone}),
  H(".hmedia", "max-height", "website.hero.compactMediaMax", {
    ...onPhone, description: "The hero media's height on phones; the phone runs on under the panel's edge.",
  }),
  H(".hphone", "width", "website.hero.phoneWidth", {description: "The hero phone's width on wide pages."}),
  H(".hphone", "margin-bottom", "website.hero.phoneBleed", {
    description: "How far the hero phone runs past the panel's bottom edge on wide pages.",
  }),
  H(".hphone", "width", "website.hero.compactPhoneWidth", {...onPhone, description: "The hero phone's width on phones."}),
  H(".hphone", "margin-bottom", "website.hero.compactPhoneBleed", {
    ...onPhone, description: "How far the hero phone runs past the panel's bottom edge on phones.",
  }),
  H(".notify", "margin-top", "website.hero.notifyGap", {description: "Space above the hero's notify card."}),
  H(".notify", "border-radius", "website.radius.card", {description: "The corners of a small white card on a panel, such as the hero's notify card."}),
  H(".notify", "padding", "space.s4", match),
  H(".notify", "max-width", "website.hero.notifyMax", {description: "The hero notify card's widest."}),
  H(".notify h3", "font-size", "typography.role.body.size", match),
  H(".notify p", "margin", "space.micro2", {...match, pick: {part: 0}}),
  H(".notify p", "margin", "space.micro10", {...match, pick: {part: 2}}),
  H(".notify p", "font-size", "typography.role.bodyMeta.size", match),
  H(".notify .row", "gap", "space.s2", match),
  H(".notify .in", "height", "size.fieldMd", match),
  H(".consent", "font-size", "typography.role.labelBadge.size", match),
  H(".hchip", "padding", "space.s3", {...match, pick: {part: 0}}),
  H(".hchip", "padding", "space.s4", {...match, pick: {part: 1}}),
  H(".hchip", "gap", "space.s3", match),
  H(".hchip", "border-radius", "radius.lg", match),
  H(".hchip", "box-shadow", "website.shadow.chip", {description: "The shadow under a card floating over a hero's media."}),
  H(".hchip", "bottom", "space.s6", {...match, ...onPhone}),
  H(".hchip", "padding", "space.s2", {...match, ...onPhone, pick: {part: 0}}),
  H(".hchip", "padding", "space.s3", {...match, ...onPhone, pick: {part: 1}}),
  H(".hchip p", "font-size", "typography.role.bodyMeta.size", match),
  H(".hchip strong", "font-size", "typography.role.body.size", match),
  H(".hchip strong", "font-size", "typography.role.bodyMeta.size", {...match, ...onPhone}),
  H(".date", "width", "website.date.width", {description: "A date square's width."}),
  H(".date", "height", "website.date.height", {description: "A date square's height."}),
  H(".date", "font", "website.date.labelSize", {pick: {regex: " (\\d+px)/"}, description: "A date square's weekday."}),
  H(".date", "letter-spacing", "website.type.kicker.tracking", match),
  H(".date b", "font", "website.type.xs.size", {...match, pick: {regex: " (\\d+px)/"}}),
  H(".hchip .date", "width", "website.date.compactWidth", {...onPhone, description: "A date square's width in the hero chip on phones."}),
  H(".hchip .date", "height", "website.date.compactHeight", {...onPhone, description: "A date square's height in the hero chip on phones."}),

  // Homepage entry tiles ("Whoever you are").
  H(".entries", "gap", "space.s3", match),
  H(".entries", "margin-top", "space.s10", match),
  H(".entries", "gap", "space.micro10", {...match, ...onPhone}),
  H(".ent", "border-radius", "radius.xl", match),
  H(".ent", "padding", "space.s5", match),
  H(".ent", "min-height", "website.tile.minHeight", {description: "A colour tile's least height: the homepage's entry and app tiles."}),
  H(".ent", "gap", "space.s2", match),
  H(".ent", "min-height", "website.tile.compactMinHeight", {...onPhone, description: "An entry tile's least height on phones."}),
  H(".ent", "padding", "space.s4", {...match, ...onPhone}),
  H(".ent svg", "width", "website.tile.iconSize", {description: "An entry tile's icon."}),
  H(".ent h3", "font-size", "website.type.cardTitle.size", match),
  H(".ent h3", "line-height", "website.type.tileTitle.lineHeight", {description: "An entry tile's title leading."}),
  H(".ent p", "font-size", "typography.role.bodyMeta.size", match),
  H(".ent p", "line-height", "website.type.tileBody.lineHeight", {description: "An entry tile's line leading."}),
  H(".ent p", "color", "website.color.inkOnColour", {description: "Secondary text on a colour tile."}),

  // Section headers with an action across (.hd) and rails of cards.
  H(".hd", "gap", "space.s8", match),
  H(".hd", "gap", "space.s4", {...match, ...onPhone}),
  H(".rail", "gap", "space.s4", match),
  H(".rail", "margin-top", "space.s10", match),
  H(".r3", "gap", "space.s5", match),

  // Plan cards.
  H(".plan", "border-radius", "radius.xl", match),
  H(".plan", "padding", "space.micro14", match),
  H(".plan", "box-shadow", "website.shadow.cardRing", {description: "The hairline ring around a white card on paper."}),
  H(".plan .phx", "height", "website.plan.mediaHeight", {description: "A plan card's photo or poster."}),
  H(".plan .phx", "border-radius", "radius.md", match),
  H(".plan .row", "gap", "space.s3", match),
  H(".plan .row", "margin-top", "space.micro14", match),
  H(".plan h3", "font-size", "typography.role.titleBar.size", match),
  H(".plan h3", "line-height", "website.type.cardTitle.lineHeight", match),
  H(".plan p", "margin", "space.s1", {...match, pick: {part: 0}}),
  H(".plan p", "font-size", "typography.role.bodyMeta.size", match),
  H(".plan .meta", "margin-top", "space.micro14", match),
  H(".plan .meta", "padding-top", "space.s3", match),
  H(".plan .meta", "border-top", "website.color.lineRow", {...match, pick: {regex: "(#[0-9a-fA-F]{6})"}}),
  H(".plan .meta", "font-size", "typography.role.bodyMeta.size", match),
  H(".plan .badge", "left", "space.micro10", match),
  H(".plan .badge", "padding", "website.badge.padBlock", {pick: {part: 0}, description: "A pill tag's padding above and below."}),
  H(".plan .badge", "padding", "space.micro10", {...match, pick: {part: 1}}),
  H(".plan .badge", "font-size", "typography.role.labelBadge.size", match),

  // Format cards and chips ("Start with what you feel like doing").
  H(".card .mat", "padding", "space.micro10", match),
  H(".card .mat>div", "border-radius", "radius.lg", match),
  H(".card h3", "margin", "space.micro14", {...match, pick: {part: 0}}),
  H(".card h3", "font-size", "website.type.cardTitle.size", {description: "A website card's title, such as a format card or an entry tile."}),
  H(".card h3", "line-height", "website.type.cardTitle.lineHeight", {description: "A website card's title leading."}),
  H(".card .body", "font-size", "typography.role.bodySmall.size", match),
  H(".card .body", "margin-top", "space.s1", match),
  H(".card .more", "margin-top", "space.micro10", match),
  H(".card .more", "font-size", "typography.role.bodyMeta.size", match),
  H(".chips", "gap", "space.micro10", match),
  H(".chips", "margin-top", "space.s5", match),
  H(".chip2", "min-height", "size.touchMin", match),
  H(".chip2", "padding", "space.micro18", {...match, pick: {part: 1}}),
  H(".chip2", "box-shadow", "website.shadow.chipRing", {description: "The hairline ring around a white chip."}),
  H(".chip2", "font-size", "typography.role.body.size", match),
  H(".chip2", "gap", "space.s2", match),
  H(".chip2 i", "width", "website.chip.dotSize", {description: "A chip's colour dot."}),
  H(".chip2", "min-height", "size.controlMd", {...match, ...onPhone}),
  H(".chip2", "padding", "space.micro14", {...match, ...onPhone, pick: {part: 1}}),
  H(".chip2", "font-size", "typography.role.bodySmall.size", {...match, ...onPhone}),

  // The app band's bento grid.
  H(".bento", "gap", "space.s4", match),
  H(".bento .mid", "padding", "space.s6", match),
  H(".bento .mid", "border-radius", "radius.mat", match),
  H(".bento .mid h2", "font-size", "website.type.feature.size", match),
  H(".bento .mid", "padding", "space.s5", {...match, ...onPhone}),
  H(".bento .mid h2", "font-size", "website.type.feature.compactSize", {...match, ...onPhone}),
  H(".tile", "border-radius", "radius.xl", match),
  H(".tile", "padding", "space.s5", match),
  H(".tile", "min-height", "website.tile.minHeight", match),
  H(".tile", "gap", "space.s4", match),
  H(".tile", "min-height", "website.tile.bentoCompactMinHeight", {...onPhone, description: "An app tile's least height on phones."}),
  H(".tile", "padding", "space.s4", {...match, ...onPhone}),
  H(".tile .tag", "font-size", "typography.role.labelBadge.size", match),
  H(".tile .tag", "padding", "website.badge.padBlock", {...match, pick: {part: 0}}),
  H(".tile .tag", "background", "website.color.stepOnLight", match),
  H(".tile p", "font-size", "typography.role.body.size", match),
  H(".tile p", "line-height", "website.type.tile.lineHeight", {description: "An app tile's line leading."}),
  H(".tile .mini", "border-radius", "website.radius.field", match),
  H(".tile .mini", "padding", "space.micro10", {...match, pick: {part: 0}}),
  H(".tile .mini", "padding", "space.s3", {...match, pick: {part: 1}}),
  H(".tile .mini", "font-size", "typography.role.labelBadge.size", match),
  H(".tile .mini", "box-shadow", "website.shadow.mini", {description: "The shadow under a small white card inside a tile."}),
  H(".frm", "gap", "space.micro10", match),
  H(".frm", "margin-top", "space.micro18", match),
  H(".frm .row", "gap", "space.s2", match),

  // The refer panel.
  H(".ref", "gap", "space.s12", match),
  H(".ref", "gap", "space.s5", {...match, ...onPhone}),

  // The fee band and its calculator (the host landing's pricing band and /pricing/'s opening panel).
  P(".pg .price", "font-size", "website.type.price.size", {description: "The fee band's rate, the giant coral figure."}),
  P(".pg .price", "font-size", "website.type.price.compactSize", {...onPhone, description: "The fee band's rate on phones."}),
  P(".pg .price", "line-height", "website.type.price.lineHeight", {description: "The fee band's rate leading."}),
  P(".pg .price", "letter-spacing", "website.type.price.tracking", {description: "The fee band's rate tracking."}),
  P(".pg .price", "font-weight", "website.type.figure.weight", match),
  P(".pg .calc2 .sv", "font", "website.calculator.valueSize", {pick: {regex: " (\\d+px)/"}, description: "The fee calculator's sales figure."}),
  P(".pg .calc2 .sv", "font-size", "website.calculator.compactValueSize", {...onPhone, description: "The fee calculator's sales figure on phones."}),
  P(".pg .calc2 .sv", "letter-spacing", "website.type.xs.tracking", match),
  P(".pg .calc2 small", "font-size", "typography.role.bodyMeta.size", match),
  P(".pg .rmm", "font-size", "typography.role.labelBadge.size", match),
  P(".pg .rmm", "margin", "space.s4", {...match, pick: {part: 2}}),
  P(".pg .tiles2", "gap", "space.s3", match),
  P(".pg .tiles2>div", "border-radius", "website.radius.tile", {description: "A result tile in the fee calculator."}),
  P(".pg .tiles2>div", "padding", "space.s4", match),
  P(".pg .tiles2>div", "background", "website.color.fillOnInk", {description: "The translucent fill of a tile on the ink ground: calculator results and worked examples."}),
  P(".pg .tiles2 b", "font", "website.calculator.tileSize", {pick: {regex: " (\\d+px)/"}, description: "A fee calculator result figure."}),
  P(".pg .capped", "font-size", "typography.role.bodySmall.size", match),
  P(".pg .capped", "margin", "space.micro14", {...match, pick: {part: 0}}),
  P(".pg .fine", "font-size", "typography.role.labelBadge.size", match),
  P(".pg .ink .incl span", "background", "website.color.pillOnInk", {description: "A label pill on the ink ground, such as what the plan includes."}),
  P(".pg .incl", "gap", "space.s2", match),
  P(".pg .ex", "gap", "space.s3", match),
  P(".pg .ex>div", "border-radius", "radius.lg", match),
  P(".pg .ex>div", "padding", "space.s5", match),
  P(".pg .ex b", "font", "website.type.example.size", {pick: {regex: " (\\d+px)/"}, description: "A worked example's figure on white."}),
  S(".ex", "margin-top", "space.s12", match),
  S(".ex b", "font", "typography.role.displaySection.size", {...match, pick: {regex: " (\\d+px)/"}}),
  S(".orgline", "margin-top", "space.s7", match),
  S(".orgline", "padding-top", "space.s6", match),
  S(".orgline", "border-top", "website.color.lineOnInk", {pick: {regex: "(rgba\\([^)]*\\))"}, description: "The hairline over the fee band's foot line on the ink ground."}),
  R(".capbar", "height", "website.capBar.height", {description: "The cap chart's bar on /pricing/."}),
  R(".capbar", "border-radius", "radius.md", match),
  R(".capbar", "margin-top", "space.s7", match),
  R(".capbar span", "padding", "space.micro14", {...match, pick: {part: 1}}),

  // The host landing's route cards (.stg, where you are today; .path, however you like to start).
  S(".stg", "border-radius", "radius.xl", match),
  S(".stg", "padding", "space.s6", match),
  S(".stg", "gap", "space.micro10", match),
  S(".stg", "min-height", "website.routeCard.minHeight", {description: "A link route card's least height (the host landing's stage cards)."}),
  S(".stg h3", "font-size", "typography.role.displayXs.size", match),
  S(".stg p", "font-size", "typography.role.body.size", match),
  S(".stg .go", "font-size", "typography.role.bodySmall.size", match),
  S(".path", "min-height", "website.routeCard.tallMinHeight", {description: "A button route card's least height (the host landing's ways to start)."}),
  S(".path h3", "font-size", "website.routeCard.tallTitleSize", {description: "A button route card's title."}),
  S(".path h3", "line-height", "website.type.tileTitle.lineHeight", match),
  S(".path p", "font-size", "typography.role.bodySmall.size", match),
  S(".path .n", "font", "typography.role.body.size", {...match, pick: {regex: " (\\d+px)/"}}),
  S(".vid", "height", "website.routeCard.mediaHeight", {description: "The picture in a button route card."}),
  S(".vid", "border-radius", "radius.md", match),
  S(".paths", "gap", "space.s4", match),

  // The host landing's night timeline (.tl).
  S(".tl", "margin", "space.s8", {...match, pick: {part: 0}}),
  S(".tl", "border-left", "website.color.timelineLine", {pick: {regex: "(rgba\\([^)]*\\))"}, description: "The line the night timeline runs down, on the ink ground."}),
  S(".tl li", "grid-template-columns", "website.timeline.timeWidth", {pick: {part: 0}, description: "The night timeline's time column."}),
  S(".tl li", "grid-template-columns", "website.timeline.compactTimeWidth", {...onPhone, pick: {part: 0}, description: "The night timeline's time column on phones."}),
  S(".tl li", "gap", "space.s3", match),
  S(".tl li", "font-size", "typography.role.bodySmall.size", match),
  S(".tl li.on b", "font-size", "website.timeline.onTitleSize", {description: "The chosen moment's title in the night timeline."}),
];
