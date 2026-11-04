// The design system's components (design source, system v15) and the registry
// records that carry each one, as the redesign programme's component matrix
// assigns them. tool/design/import_ds_props.mjs writes each record's `system`
// block from this table and check_component_contracts.mjs holds the records to
// it. `symbol` is the name ds/src/index.ts exports the component under, `readme`
// the design-source folder of its guideline, and `parts` the exports it documents
// with no registry symbol of their own. The first record owns the guideline.

export const systemComponents = Object.freeze({
  Root: {symbol: "CatchRoot", records: ["catch.root"]},
  Surface: {symbol: "CatchSurface", records: ["catch.surface"], readme: "Surface"},
  Text: {symbol: "CatchText", records: ["catch.text", "catch.typography"], readme: "Text"},
  Icon: {symbol: "CatchIcon", records: ["catch.icon"], readme: "Icon"},
  Stack: {symbol: "CatchStack", records: ["catch.stack"], readme: "Stack"},
  Button: {symbol: "CatchButton", records: ["catch.button"], readme: "Button"},
  IconButton: {symbol: "CatchIconAction", records: ["catch.icon_button"], readme: "IconButton"},
  Chip: {symbol: "CatchChip", records: ["catch.chip", "catch.chip.field"], readme: "Chip"},
  Badge: {symbol: "CatchBadge", records: ["catch.badge"], readme: "Badge"},
  Avatar: {symbol: "CatchAvatar", records: ["catch.person_avatar"], readme: "Avatar", parts: ["AvatarStack"]},
  Marker: {symbol: "CatchMarker", records: ["catch.marker"], readme: "Marker"},
  Field: {symbol: "CatchField", records: ["catch.field", "catch.search_field"], readme: "Field"},
  Switch: {symbol: "CatchToggleInput", records: ["catch.toggle"], readme: "Switch"},
  Check: {symbol: "CatchCheckboxInput", records: ["catch.checkbox"], readme: "Check"},
  ChoiceCard: {symbol: "CatchChoiceTile", records: ["catch.option_card"], readme: "ChoiceCard"},
  Segmented: {symbol: "CatchPageTabBar", records: ["catch.tab_rail"], readme: "Segmented"},
  Stepper: {symbol: "CatchStepper", records: ["catch.number_stepper"], readme: "Stepper"},
  Slider: {symbol: "CatchRangeInput", records: ["catch.range_slider"], readme: "Slider"},
  Rating: {symbol: "CatchRating", records: ["catch.rating"], readme: "Rating"},
  Calendar: {symbol: "CatchCalendar", records: ["catch.calendar"], readme: "Calendar"},
  Meter: {symbol: "CatchMeter", records: ["catch.meter"], readme: "Meter"},
  BarChart: {symbol: "CatchBarChart", records: ["catch.mini_bar_chart"], readme: "BarChart"},
  Image: {symbol: "CatchImage", records: ["catch.network_image", "catch.graded_image", "catch.detail_media"], readme: "Image"},
  Skeleton: {symbol: "CatchSkeleton", records: ["catch.skeleton"], readme: "Skeleton"},
  Spinner: {symbol: "CatchLoadingIndicator", records: ["catch.loading_indicator"], sharedReadme: "Skeleton"},
  Stat: {symbol: "CatchStat", records: ["catch.analytics_metric", "catch.metric_strip"], readme: "Stat"},
  MetaRow: {symbol: "CatchMetaRow", records: ["catch.meta_row"], readme: "MetaRow"},
  Notice: {symbol: "CatchNotice", records: ["catch.notice", "catch.banner"], readme: "Notice"},
  EmptyState: {symbol: "CatchEmptyState", records: ["catch.empty_state", "catch.error_state"], readme: "EmptyState"},
  ListRow: {symbol: "CatchIndexRow", records: ["catch.index_row"], readme: "ListRow", parts: ["DateTile"]},
  Section: {symbol: "CatchSection", records: ["catch.section", "catch.section_stack"], readme: "Section", parts: ["SectionHeader"]},
  Rail: {symbol: "CatchRail", records: ["catch.rail"], readme: "Rail"},
  Table: {symbol: "CatchTable", records: ["catch.table"], readme: "Table"},
  Accordion: {symbol: "CatchAccordion", records: ["catch.accordion"], readme: "Accordion"},
  TopBar: {symbol: "CatchTopBar", records: ["catch.top_bar", "catch.step_header"], readme: "TopBar"},
  PaneHeader: {symbol: "CatchWorkspaceHeader", records: ["catch.workspace_header"]},
  Navigation: {symbol: "CatchTabBar", records: ["catch.tab_bar"], readme: "Navigation"},
  Dock: {symbol: "CatchDock", records: ["catch.bottom_action"], readme: "Dock"},
  AppShell: {symbol: "CatchViewport", records: ["catch.viewport", "catch.app_shell", "catch.screen"], readme: "AppShell"},
  ScreenBody: {symbol: "CatchPageBody", records: ["catch.screen_body"], readme: "ScreenBody"},
  PaneLayout: {symbol: "CatchPaneLayout", records: ["catch.pane_layout"], readme: "PaneLayout"},
  EventCard: {symbol: "CatchEventCard", records: ["catch.event_card", "catch.cover_story"], readme: "EventCard"},
  OrganiserCard: {symbol: "CatchPoster", records: ["catch.organizer_poster", "catch.club_cover"], readme: "OrganiserCard"},
  Ticket: {symbol: "CatchTicket", records: ["catch.ticket"], readme: "Ticket"},
  Sheet: {symbol: "CatchSheet", records: ["catch.sheet"], readme: "Sheet"},
  Dialog: {symbol: "CatchDialog", records: ["catch.confirm_dialog"], readme: "Dialog"},
  Toast: {symbol: "CatchToast", records: ["catch.toast"], readme: "Toast"},
  Menu: {symbol: "CatchMenu", records: ["catch.menu"], readme: "Menu"},
  ChatMessage: {symbol: "CatchMessage", records: ["catch.timestamped_message"], readme: "Chat"},
  ChatComposer: {symbol: "ChatInput", records: ["catch.chat_composer"], sharedReadme: "Chat"},
  MapPreview: {symbol: "CatchMapPreview", records: ["catch.map_preview"], readme: "MapPreview"},
});

/** The committed copy of the design source's index.d.ts; CI has no design source. */
export const systemTypesPath = "design/components/system/index.d.ts";
export const guidelinesPath = "design/components/guidelines";

/** Exported PascalCase declarations in index.d.ts that are not system components. */
const internalDeclarations = new Set(["GroundProvider"]);

export function declaredSystemNames(typesSource) {
  const names = new Set();
  for (const match of typesSource.matchAll(/^export declare (?:function|const) ([A-Z][A-Za-z0-9]*)/gmu)) {
    if (!internalDeclarations.has(match[1])) names.add(match[1]);
  }
  return names;
}

/** Every system-name a record may carry: components and their parts. */
export function tableSystemNames(table = systemComponents) {
  const names = new Set();
  for (const [name, entry] of Object.entries(table)) {
    names.add(name);
    for (const part of entry.parts ?? []) names.add(part);
  }
  return names;
}

/**
 * The `system` block rules: a T1/T2 record the table assigns keeps its block, a
 * block names a component index.d.ts declares, and only the table assigns one.
 */
export function systemBlockProblems({components, declaredNames, table = systemComponents}) {
  const problems = [];
  const byId = new Map(components.map((component) => [component.id, component]));
  const assigned = new Map();
  for (const [name, entry] of Object.entries(table)) {
    for (const id of entry.records) {
      assigned.set(id, name);
      const component = byId.get(id);
      if (!component) {
        problems.push(`${id}: the system table assigns ${name} to a record that does not exist`);
        continue;
      }
      if (["T1", "T2"].includes(component.tier) && !component.system) {
        problems.push(`${id}: ${component.tier} record must keep its system block (${name})`);
      }
    }
  }
  for (const name of tableSystemNames(table)) {
    if (!declaredNames.has(name)) {
      problems.push(`system table names ${name}, which ${systemTypesPath} does not declare`);
    }
  }
  for (const name of declaredNames) {
    if (!tableSystemNames(table).has(name)) {
      problems.push(`${systemTypesPath} declares ${name}, which no registry record carries`);
    }
  }
  for (const component of components) {
    const system = component.system;
    if (!system) continue;
    for (const name of [system.name, ...(system.parts ?? []).map((part) => part.name)]) {
      if (!declaredNames.has(name)) {
        problems.push(`${component.id}: system.name ${name} is not declared in ${systemTypesPath}`);
      }
    }
    if (assigned.get(component.id) !== system.name) {
      problems.push(`${component.id}: system block ${system.name} is not what the system table assigns (${assigned.get(component.id) ?? "nothing"})`);
    }
  }
  return problems.sort();
}
