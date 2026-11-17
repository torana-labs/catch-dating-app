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
const K = (selector, property, token, extra) => decl("kit", selector, property, token, extra);
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
  P(".pg .panel", "border-radius", "radius.mat", {...match, ...onPhone}),
  P(".pg .panel", "padding", "space.s10", {...match, ...onPhone, pick: {part: 0}}),
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

  // Spacing.
  P(".pg .grid3", "gap", "space.s4", match),
  P(".pg .grid3", "margin-top", "space.s10", match),
  P(".pg .split", "gap", "space.s16", match),
  P(".pg .open", "padding", "space.s28", {...match, pick: {regex: "^(\\d+px)"}}),
  P(".pg .btns", "gap", "space.micro10", match),
  P(".pg .btns", "margin-top", "space.s7", match),
];
