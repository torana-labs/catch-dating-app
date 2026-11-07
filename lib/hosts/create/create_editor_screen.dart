import 'package:catch_dating_app/hosts/create/create_basics_screen.dart';
import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_screen.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_screen.dart';
import 'package:catch_dating_app/hosts/create/create_when_screen.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_editor_panes.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The four steps on an expanded window: the tool top bar with the
/// organizer, New event, Close, Save draft and the next step, over the
/// editor pane layout with the step list, the current step's form and the
/// live preview.
class CreateEditorScreen extends StatelessWidget {
  const CreateEditorScreen({
    super.key,
    required this.state,
    required this.handlers,
    required this.today,
    required this.stillToSet,
    this.overlay,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final DateTime today;
  final List<String> stillToSet;
  final Widget? overlay;

  @override
  Widget build(BuildContext context) {
    final step = state.step;
    final busy = state.working || state.savingDraft;
    final form = switch (step) {
      CreateStep.basics => CreateBasicsScreen.bodyFor(
        state,
        handlers,
        showTitle: true,
      ),
      CreateStep.when => CreateWhenScreen.bodyFor(
        state,
        handlers,
        today: today,
        showTitle: true,
      ),
      CreateStep.tickets => CreateTicketsScreen.bodyFor(
        state,
        handlers,
        showTitle: true,
      ),
      CreateStep.plan || CreateStep.share => CreatePlanScreen.bodyFor(
        state,
        handlers,
        showTitle: true,
      ),
    };
    final nextLabel = step == CreateStep.plan
        ? CreateCopy.publish
        : CreateCopy.nextTo(CreateStep.values[step.index + 1]);
    return CatchScreen(
      key: const ValueKey<String>('create-editor'),
      topBar: CatchTopBar(
        variant: CatchTopBarVariant.tool,
        kicker: state.organizer.name,
        title: CreateCopy.newEvent,
        back: CatchTopBarBack(
          label: CreateCopy.close,
          close: true,
          onPressed: state.working ? null : handlers.onBack,
        ),
        actions: [
          CatchButton(
            key: const ValueKey<String>('create-editor-save-draft'),
            label: CreateCopy.saveDraft,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.md,
            status: state.savingDraft
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: busy ? null : handlers.onSaveDraft,
          ),
          CatchButton(
            key: const ValueKey<String>('create-editor-next'),
            label: nextLabel,
            size: CatchButtonSize.md,
            status: state.working
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: busy ? null : handlers.onNext,
          ),
        ],
      ),
      body: CatchPageBody(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.editor,
          children: [
            form,
            CreatePreviewPane(state: state, stillToSet: stillToSet),
            CreateStepRail(state: state, onStep: handlers.onStep),
          ],
        ),
      ),
      overlay: overlay,
    );
  }
}
