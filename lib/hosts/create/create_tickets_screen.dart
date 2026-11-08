import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_body.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_step_layout.dart';
import 'package:flutter/widgets.dart';

/// Step three on a phone: Tickets.
class CreateTicketsScreen extends StatelessWidget {
  const CreateTicketsScreen({
    super.key,
    required this.state,
    required this.handlers,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;

  static Widget bodyFor(
    CreateFlowState state,
    CreateHandlers handlers, {
    bool showTitle = false,
  }) => CreateTicketsBody(
    state: state,
    showTitle: showTitle,
    onSellElsewhere: handlers.onSellElsewhere,
    onPrice: handlers.onPrice,
    onPlaces: handlers.onPlaces,
    onAdmission: handlers.onAdmission,
    onWaitlist: handlers.onWaitlist,
    onApproveEach: handlers.onApproveEach,
  );

  @override
  Widget build(BuildContext context) => CreateStepLayout(
    state: state,
    handlers: handlers,
    body: bodyFor(state, handlers),
  );
}
