// Implementation fragments of one cataloged owner, not extra UI components.
// Match source, library, owner, method and return type. Moving a helper or
// adding a sibling cannot inherit this exception. Resolved Catch UI lints
// independently enforce construction ownership and the closed Field protocol.
const ui = "packages/catch_ui/lib/src/";
const field = `${ui}components/catch_field.dart`;
const section = `${ui}components/catch_section.dart`;
const declarations = [];
function declare(file, library, owner, names, returns) {
  for (const name of names) for (const returnType of returns) {
    declarations.push({file, library, owner, name, returnType});
  }
}
for (const owner of ["CatchFieldLayout", "CatchRecordLayout", "CatchPersonLayout", "CatchConversationLayout"]) {
  declare(`${ui}components/catch_field_layout.dart`, field, owner,
    ["_leading", "_body"], ["Widget", "Widget?"]);
}
for (const owner of ["CatchFieldSecondaryAction", "_CatchFieldMenuAction",
  "_CatchFieldCommandAction", "_CatchFieldButtonAction", "_CatchFieldActionGroup",
  "_CatchFieldSelectionAction"]) {
  declare(`${ui}components/catch_field_secondary_action.dart`, field, owner,
    ["_build"], ["Widget"]);
}
declare(`${ui}components/catch_field_adapters.dart`, field, null,
  ["_catchFieldChoices", "_catchFieldOptionCards", "_catchFieldStepper", "_catchFieldSelect"], ["CatchField<T>"]);
declare(`${ui}components/catch_field_render.dart`, field, null, ["_renderField"], ["Widget"]);
declare(`${ui}components/catch_section_render.dart`, section, null, ["_renderSection"], ["Widget"]);
declare(`${ui}components/catch_row_section.dart`, `${ui}components/catch_row_section.dart`,
  "_CatchRowSectionState", ["_header", "_row"], ["Widget", "Widget?"]);
// These fragments are private to an existing cataloged owner. The Section
// factory fixes the action recipe; Banner fixes body feedback; TopBar state
// owns its measured frame, search lifecycle and selector reflow. They expose
// no independently callable component or feature-level rendering API.
declare(`${ui}components/catch_action_module.dart`, section, null,
  ["_buildActionModule", "_buildSectionModule"], ["Widget"]);
declare(`${ui}components/catch_collection_section.dart`, section, null,
  ["_buildCollectionModule"], ["Widget"]);
declare(`${ui}components/catch_banner.dart`, `${ui}components/catch_banner.dart`,
  "CatchBanner", ["_buildBodyFeedback"], ["Widget"]);
declare(`${ui}components/catch_top_bar.dart`, `${ui}components/catch_top_bar.dart`,
  "_CatchTopBarState", ["_buildBar", "_searchField", "_selectorControls"], ["Widget"]);
// Typed factories return the canonical component itself, preventing an outer
// GestureDetector, inset, or alternate interaction shell around their result.
declare("lib/hosts/presentation/customers/host_customer_timeline_section.dart",
  "lib/hosts/presentation/customers/host_customer_timeline_section.dart", null,
  ["hostCustomerTimelineField"], ["CatchField"]);
declare("lib/programs/presentation/program_events_row.dart",
  "lib/programs/presentation/program_events_row.dart", null,
  ["programEventsField"], ["CatchField"]);
declare("lib/host_memberships/presentation/host_membership_profile_section.dart",
  "lib/host_memberships/presentation/host_membership_profile_section.dart", null,
  ["hostMembershipProfileField"], ["CatchField"]);
declare("lib/routing/host_inbox_route.dart", "lib/routing/go_router.dart", null,
  ["hostInboxScreenForUri"], ["HostInboxScreen"]);

// The owner-approved route-shell-construction-ownership family retains each
// screen's async boundary and its state-specific CatchRouteBody. These exact
// typed factories configure the canonical shell; they are not new widgets.
for (const [file, owner] of [
  ["lib/hosts/presentation/host_event_operator_screen.dart", "HostEventOperatorScreen"],
  ["lib/programs/presentation/program_arrivals_screen.dart", "ProgramArrivalsScreen"],
  ["lib/programs/presentation/program_dispatch_screen.dart", "_ProgramDispatchScreenState"],
  ["lib/programs/presentation/program_hotel_desk_screen.dart", "_ProgramHotelDeskScreenState"],
  ["lib/programs/presentation/program_trips_screen.dart", "_ProgramTripsScreenState"],
  ["lib/programs/presentation/program_work_screen.dart", null],
]) {
  declare(file, file, owner, ["_routeScaffold"], ["CatchRouteScaffold"]);
}

export function isOwnedCompositionRenderer(entry) {
  return declarations.some((expected) => Object.entries(expected)
    .every(([key, value]) => entry[key] === value));
}
