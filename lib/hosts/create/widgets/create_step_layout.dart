import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One phone step: the step top bar (Close on the first step, Back after,
/// "n of 4"), the body, and the bar dock with Next or Publish and Save
/// draft. [overlay] is a contained sheet over the step.
class CreateStepLayout extends StatelessWidget {
  const CreateStepLayout({
    super.key,
    required this.state,
    required this.handlers,
    required this.body,
    this.overlay,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final Widget body;
  final Widget? overlay;

  @override
  Widget build(BuildContext context) {
    final step = state.step;
    final first = step == CreateStep.basics;
    final busy = state.working || state.savingDraft;
    return CatchScreen(
      key: ValueKey<String>('create-step-${step.name}'),
      topBar: CatchTopBar(
        variant: CatchTopBarVariant.step,
        title: CreateCopy.stepTitle(step),
        back: CatchTopBarBack(
          label: first ? CreateCopy.close : CreateCopy.back,
          close: first,
          onPressed: state.working ? null : handlers.onBack,
        ),
        step: CatchTopBarStep(
          index: step.number,
          total: 4,
          label: CreateCopy.stepOf(step.number),
        ),
      ),
      body: CatchPageBody(child: body),
      dock: CatchDock(
        placement: CatchDockPlacement.bar,
        primary: CatchDockAction(
          label: step == CreateStep.plan ? CreateCopy.publish : CreateCopy.next,
          loading: state.working,
          onPressed: busy ? null : handlers.onNext,
        ),
        secondary: CatchDockAction(
          label: CreateCopy.saveDraft,
          loading: state.savingDraft,
          onPressed: busy ? null : handlers.onSaveDraft,
        ),
      ),
      overlay: overlay,
    );
  }
}
