import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_step_form.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_editor_rail.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The four steps on an expanded window: the tool top bar with the
/// organizer, New event, Close, Save draft and the next step, over the
/// editor pane layout with the step list, the current step's form and the
/// live preview.
///
/// With [edit] handlers it edits a saved event: the bar says Edit event
/// and has Save changes in place of Save draft and the next step, and the
/// step list moves between the steps' forms.
class CreateEditorScreen extends StatelessWidget {
  const CreateEditorScreen({
    super.key,
    required this.state,
    required this.handlers,
    required this.today,
    required this.stillToSet,
    this.overlay,
    this.edit,
    this.header,
  });

  final CreateFlowState state;
  final CreateHandlers handlers;
  final DateTime today;
  final List<String> stillToSet;
  final Widget? overlay;

  /// Set when the editor changes a saved event.
  final CreateEditHandlers? edit;

  /// Above the form: an edit's scope notice and save error.
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final step = state.step;
    final busy = state.working || state.savingDraft;
    final edit = this.edit;
    final header = this.header;
    final stepForm = CreateStepForm(
      state: state,
      handlers: handlers,
      step: step,
      today: today,
      edit: edit,
      showTitle: true,
    );
    final form = header == null
        ? stepForm
        : CatchStack(gap: CatchStackGap.g24, children: [header, stepForm]);
    if (edit != null) {
      return CatchScreen(
        key: const ValueKey<String>('edit-event-editor'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          kicker: state.organizer.name,
          title: context.l10n.hostsEditHostedEventScreenTitleEditEvent,
          back: CatchTopBarBack(
            label: context.l10n.hostCreateClose,
            close: true,
            onPressed: state.working ? null : handlers.onBack,
          ),
          actions: [
            CatchButton(
              key: const ValueKey<String>('edit-event-save'),
              label: context.l10n.hostsEventEditSaveChanges,
              size: CatchButtonSize.md,
              status: state.working
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: state.canChange ? edit.onSave : null,
            ),
          ],
        ),
        body: CatchPageBody(
          child: CatchPaneLayout(
            pattern: CatchPaneLayoutMode.editor,
            children: [
              form,
              CreateEditorPreview(state: state, stillToSet: stillToSet),
              CreateStepRail(state: state, onStep: handlers.onStep),
            ],
          ),
        ),
        overlay: overlay,
      );
    }
    final nextLabel = step == CreateStep.plan
        ? context.l10n.hostCreatePublish
        : context.l10n.hostCreateNextTo(
            step: CreateStep.values[step.index + 1].name,
          );
    return CatchScreen(
      key: const ValueKey<String>('create-editor'),
      topBar: CatchTopBar(
        variant: CatchTopBarVariant.tool,
        kicker: state.organizer.name,
        title: context.l10n.hostCreateNewEvent,
        back: CatchTopBarBack(
          label: context.l10n.hostCreateClose,
          close: true,
          onPressed: state.working ? null : handlers.onBack,
        ),
        actions: [
          CatchButton(
            key: const ValueKey<String>('create-editor-save-draft'),
            label: context.l10n.hostCreateSaveDraft,
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
            CreateEditorPreview(state: state, stillToSet: stillToSet),
            CreateStepRail(state: state, onStep: handlers.onStep),
          ],
        ),
      ),
      overlay: overlay,
    );
  }
}
