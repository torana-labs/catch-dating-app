import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_when_body.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_step_layout.dart';
import 'package:flutter/widgets.dart';

/// Step two on a phone: When and where, with the calendar sheet over it
/// while the host picks a date further out.
class CreateWhenScreen extends StatelessWidget {
  const CreateWhenScreen({
    super.key,
    required this.state,
    required this.handlers,
    required this.today,
    this.calendarSheet,
    this.enableNetworkTiles = true,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final DateTime today;

  /// The open calendar sheet, or null.
  final Widget? calendarSheet;

  /// False draws the map's no-network fallback (previews and captures).
  final bool enableNetworkTiles;

  static Widget bodyFor(
    CreateFlowState state,
    CreateHandlers handlers, {
    required DateTime today,
    bool showTitle = false,
    bool enableNetworkTiles = true,
  }) => CreateWhenBody(
    state: state,
    today: today,
    showTitle: showTitle,
    enableNetworkTiles: enableNetworkTiles,
    onDate: handlers.onDate,
    onPickDate: handlers.onPickDate,
    onStart: handlers.onStart,
    onEnd: handlers.onEnd,
    onPlace: handlers.onPlace,
    onDirections: handlers.onDirections,
  );

  @override
  Widget build(BuildContext context) => CreateStepLayout(
    state: state,
    handlers: handlers,
    body: bodyFor(
      state,
      handlers,
      today: today,
      enableNetworkTiles: enableNetworkTiles,
    ),
    overlay: calendarSheet,
  );
}
