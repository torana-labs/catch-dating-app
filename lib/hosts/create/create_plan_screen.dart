import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_step_layout.dart';
import 'package:flutter/widgets.dart';

/// Step four on a phone: Plan the night, with Publish, and the step sheet
/// over it while the host edits a step.
class CreatePlanScreen extends StatelessWidget {
  const CreatePlanScreen({
    super.key,
    required this.state,
    required this.handlers,
    this.stepSheet,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final Widget? stepSheet;

  static Widget bodyFor(
    CreateFlowState state,
    CreateHandlers handlers, {
    bool showTitle = false,
  }) => CreatePlanBody(
    state: state,
    showTitle: showTitle,
    onTemplate: handlers.onTemplate,
    onBlank: handlers.onBlank,
    onEdit: handlers.onEditStep,
    onAdd: handlers.onAddStep,
  );

  @override
  Widget build(BuildContext context) => CreateStepLayout(
    state: state,
    handlers: handlers,
    body: bodyFor(state, handlers),
    overlay: stepSheet,
  );
}
