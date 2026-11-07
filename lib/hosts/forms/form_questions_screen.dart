import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_body.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A form's questions: one tile each with Required or Optional and its
/// choices, Add a question, Save questions and Discard.
///
/// Every edit goes through the form editor controller, which keeps the
/// draft and saves it; Save questions saves now, Discard undoes this
/// visit's edits, and Preview opens the form as people see it.
class HostFormQuestionsScreen extends ConsumerStatefulWidget {
  const HostFormQuestionsScreen({
    super.key,
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  @override
  ConsumerState<HostFormQuestionsScreen> createState() =>
      _HostFormQuestionsScreenState();
}

class _HostFormQuestionsScreenState
    extends ConsumerState<HostFormQuestionsScreen> {
  String? _open;

  HostFormEditorController get _editor => ref.read(
    hostFormEditorControllerProvider(
      widget.organizerId,
      widget.formId,
    ).notifier,
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = actor.isSettledData ? actor.value : null;
    final value = catchAsyncStateFromAsyncValue(
      ref.watch(
        hostFormEditorControllerProvider(widget.organizerId, widget.formId),
      ),
    );
    final editor = value.isSettledData && _editor.editorBoundTo(uid)
        ? value.value
        : null;
    final state = editor == null
        ? const HostFormQuestionsState.loading()
        : HostFormQuestionsState(
            status: HostFormQuestionsStatus.content,
            questions: HostFormQuestionsState.slots(editor.editor.definition),
            openQuestionId: _open,
            save: switch (editor.saveState) {
              HostFormSaveState.saved => HostFormQuestionsSave.saved,
              HostFormSaveState.dirty => HostFormQuestionsSave.unsaved,
              HostFormSaveState.saving => HostFormQuestionsSave.saving,
              HostFormSaveState.conflict ||
              HostFormSaveState.failed => HostFormQuestionsSave.failed,
            },
            blocked: editor.hasBlockingValidationErrors,
            busy: editor.operationInProgress,
          );
    final body = value.hasError && editor == null
        ? CatchLocalizedErrorState(
            value.error!,
            context: AppErrorContext.forms,
            onRetry: _editor.reload,
          )
        : HostFormQuestionsBody(
            state: state,
            onOpen: (slot) => setState(
              () => _open = _open == slot.question.questionId
                  ? null
                  : slot.question.questionId,
            ),
            onRequiredChanged: (slot, required) => _editor.updateQuestion(
              slot.sectionIndex,
              slot.questionIndex,
              required: required,
            ),
            onLabelChanged: (slot, label) => _editor.updateQuestion(
              slot.sectionIndex,
              slot.questionIndex,
              label: label,
            ),
            onOptionChanged: (slot, index, label) => _editor.updateOption(
              slot.sectionIndex,
              slot.questionIndex,
              index,
              label: label,
            ),
            onAddOption: (slot) =>
                _editor.addOption(slot.sectionIndex, slot.questionIndex),
            onRemove: (slot) {
              setState(() => _open = null);
              _editor.removeQuestion(slot.sectionIndex, slot.questionIndex);
            },
            onAdd: (kind) => _add(kind, editor),
            onRetrySave: _save,
          );
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostFormsQuestionsTitle,
          kicker: editor?.editor.definition.title,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          action: CatchTopBarAction(
            label: l10n.hostFormsPreview,
            onPressed: editor == null
                ? null
                : () => context.pushNamed(
                    Routes.hostFormPreviewScreen.name,
                    pathParameters: {'formId': widget.formId},
                    queryParameters: {'organizerId': widget.organizerId},
                  ),
          ),
        ),
        body: body,
        dock: editor == null
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostFormsQuestionsSave,
                  loading: state.save == HostFormQuestionsSave.saving,
                  onPressed: state.busy ? null : _save,
                ),
                secondary: CatchDockAction(
                  label: l10n.hostFormsQuestionsDiscard,
                  onPressed: editor.canUndo && !state.busy ? _discard : null,
                ),
              ),
      ),
    );
  }

  void _add(HostFormQuestionKind kind, HostFormEditorState? editor) {
    final sections = editor?.editor.definition.sections;
    if (sections == null || sections.isEmpty) return;
    final sectionIndex = sections.length - 1;
    _editor.addQuestion(sectionIndex, kind);
    final added = ref
        .read(
          hostFormEditorControllerProvider(widget.organizerId, widget.formId),
        )
        .asData
        ?.value
        .editor
        .definition
        .sections[sectionIndex]
        .questions
        .lastOrNull;
    setState(() => _open = added?.questionId);
  }

  Future<void> _save() async {
    final saved = await _editor.saveNow();
    if (!mounted) return;
    if (saved) {
      showCatchNotice(context, context.l10n.hostFormsQuestionsSaved);
    } else {
      showCatchNoticeError(
        context,
        StateError(context.l10n.hostFormsQuestionsSaveFailed),
        errorContext: AppErrorContext.forms,
      );
    }
  }

  void _discard() {
    final provider = hostFormEditorControllerProvider(
      widget.organizerId,
      widget.formId,
    );
    // The undo history holds only this editor's edits, at most fifty; undo
    // every one.
    for (
      var step = 0;
      step < _undoLimit && (ref.read(provider).asData?.value.canUndo ?? false);
      step++
    ) {
      _editor.undo();
    }
    setState(() => _open = null);
  }

  /// The editor keeps this many undo steps.
  static const _undoLimit = 50;
}
