/// Component-level layout breakpoints, in logical pixels.
///
/// Compared against the component's **local** box width through
/// `CatchViewport.atWidth` — not the window size — so an individual
/// widget can reflow based on the space it is actually given.
///
/// Deliberately distinct from `CatchWindowSize` in `package:catch_tokens/catch_tokens.dart`, which
/// classifies the whole window into Material 3 size classes (compact / medium /
/// expanded). Use [CatchWindowSize] for app-shell decisions (bottom bar vs nav
/// rail); use these for in-widget reflow. Migrated verbatim from `CatchLayout`.
abstract final class ComponentBreakpoints {
  /// Host invite-link heading stacks its creation action below this width.
  static const double hostInviteLinksHeaderStackBreakpoint = 360.0;

  /// Host invite-link rows stack their action controls below this width.
  static const double hostInviteLinkRowStackBreakpoint = 340.0;

  /// Host event summary rows move values under labels below this width.
  static const double hostEventSummaryRowStackBreakpoint = 340.0;

  /// Host customer Filters and Sort controls use shorter trigger copy below
  /// this width so both actions remain in one row on phone layouts.
  static const double hostCustomerDirectoryControlsCompactBreakpoint = 370.0;

  /// Catches hub gains horizontal padding once its column is this wide.
  static const double catchesWidePaddingBreakpoint = 700;

  /// Explore event-type grid switches 1 → 2 columns at this rail width.
  static const double eventTypeGridTwoColumnBreakpoint = 360.0;

  /// Live-reveal host countdown uses its compact layout below this width.
  static const double eventSuccessRevealHostCompactBreakpoint = 520.0;

  /// Dashboard quick-actions row fits all tiles in one row above this width.
  static const double quickActionsWideBreakpoint = 320.0;

  /// Structure-config editor goes 1 → 2 columns at this width.
  static const double eventSuccessConfigTwoColumnBreakpoint = 560.0;

  /// Spatial Host controls add drag-and-drop at a tablet-sized local width;
  /// tap selection remains the universal interaction.
  static const double eventSuccessSpatialDragBreakpoint = 720.0;

  /// The selected Room placement card keeps identity and its move action on
  /// one row whenever both retain a usable tap and copy width.
  static const double eventSuccessSelectedPlacementInlineBreakpoint = 300.0;

  /// Host waitlist movement callout stacks its text and action below this local
  /// width so the action label never crowds the summary.
  static const double hostWaitlistBulkOfferStackBreakpoint = 340.0;

  /// Host roster boards use person rows instead of the three-column table
  /// below this local width.
  static const double hostRosterTableCompactBreakpoint = 600.0;

  /// Create Event gains a persistent step/status rail only when the remaining
  /// form lane can still preserve the compact form contract.
  static const double hostCreateEventStepRailBreakpoint = 840.0;

  /// Create Event adds a source-backed consequence pane only after the rail,
  /// capped form lane, gutters, and pane can coexist without compression.
  static const double hostCreateEventConsequencePaneBreakpoint = 1180.0;

  /// The live Host Event workspace places time-sensitive supporting controls
  /// beside the command stage only when both lanes retain operational width.
  static const double hostEventLiveSupportingPaneBreakpoint = 900.0;
}
