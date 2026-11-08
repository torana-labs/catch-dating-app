import 'package:catch_dating_app/hosts/create/create_basics_body.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_step_layout.dart';
import 'package:flutter/widgets.dart';

/// Step one on a phone: What are you hosting?
class CreateBasicsScreen extends StatelessWidget {
  const CreateBasicsScreen({
    super.key,
    required this.state,
    required this.handlers,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;

  /// The step's body, also the desktop editor's form.
  static Widget bodyFor(
    CreateFlowState state,
    CreateHandlers handlers, {
    bool showTitle = false,
  }) => CreateBasicsBody(
    state: state,
    showTitle: showTitle,
    onName: handlers.onName,
    onFormat: handlers.onFormat,
    onDescription: handlers.onDescription,
    onDistance: handlers.onDistance,
    onPace: handlers.onPace,
    onAddPhoto: handlers.onAddPhoto,
  );

  @override
  Widget build(BuildContext context) => CreateStepLayout(
    state: state,
    handlers: handlers,
    body: bodyFor(state, handlers),
  );
}
