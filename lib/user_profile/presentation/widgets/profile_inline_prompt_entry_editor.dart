import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/inline_editor_save.dart';
import 'package:catch_tokens/catch_tokens.dart' show CatchFieldTokens;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One contained prompt card: a staged question selector followed by a
/// separate multiline answer that saves implicitly on blur.
class ProfileInlinePromptEntryEditor extends ConsumerStatefulWidget {
  const ProfileInlinePromptEntryEditor({
    super.key,
    required this.icon,
    required this.label,
    required this.currentAnswer,
    required this.currentPrompts,
    required this.promptIndex,
    required this.availablePromptIds,
    required this.fieldName,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
    this.currentPromptId,
    this.isAddAffordance = false,
  });

  final IconData icon;
  final String label;
  final String currentAnswer;
  final String? currentPromptId;
  final List<ProfilePromptAnswer> currentPrompts;
  final int promptIndex;
  final List<String> availablePromptIds;
  final String fieldName;
  final bool isExpanded;
  final bool isAddAffordance;
  final VoidCallback onTap;
  final InlineSaveCallback onSaved;
  final VoidCallback onCancel;

  @override
  ConsumerState<ProfileInlinePromptEntryEditor> createState() =>
      _ProfileInlinePromptEntryEditorState();
}

class _ProfileInlinePromptEntryEditorState
    extends ConsumerState<ProfileInlinePromptEntryEditor>
    with InlineSaveState<ProfileInlinePromptEntryEditor> {
  late final TextEditingController _controller;
  late String _selectedPromptId = _initialPromptId();
  String? _committedPromptId;
  String? _validationError;
  String? _deferredAnswer;
  bool _answerHasFocus = false;
  bool _draftingNewPrompt = false;
  bool _saveErrorBelongsToQuestion = false;
  Future<void> _saveTail = Future<void>.value();
  CatchFieldStatus _questionStatus = CatchFieldStatus.idle;
  CatchFieldStatus _answerStatus = CatchFieldStatus.idle;
  Timer? _questionSavedTimer;
  Timer? _answerSavedTimer;

  @override
  void initState() {
    super.initState();
    _committedPromptId = widget.currentPromptId;
    _draftingNewPrompt = widget.isAddAffordance && widget.isExpanded;
    _controller = TextEditingController(text: widget.currentAnswer);
    _controller.addListener(_handleAnswerChanged);
  }

  @override
  void didUpdateWidget(covariant ProfileInlinePromptEntryEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.isAddAffordance) {
      _draftingNewPrompt = false;
    } else if (widget.isExpanded) {
      _draftingNewPrompt = true;
    }
    if (!_answerHasFocus &&
        (oldWidget.fieldName != widget.fieldName ||
            oldWidget.currentAnswer != widget.currentAnswer) &&
        _controller.text != widget.currentAnswer) {
      _controller.text = widget.currentAnswer;
    }
    if (oldWidget.fieldName != widget.fieldName ||
        oldWidget.currentPromptId != widget.currentPromptId ||
        !listEquals(oldWidget.availablePromptIds, widget.availablePromptIds)) {
      _selectedPromptId = _initialPromptId();
    }
    if (oldWidget.fieldName != widget.fieldName ||
        oldWidget.currentPromptId != widget.currentPromptId) {
      _committedPromptId = widget.currentPromptId;
      _deferredAnswer = null;
    }
  }

  @override
  void dispose() {
    _questionSavedTimer?.cancel();
    _answerSavedTimer?.cancel();
    _controller.removeListener(_handleAnswerChanged);
    _controller.dispose();
    super.dispose();
  }

  String _initialPromptId() {
    final currentPromptId = widget.currentPromptId;
    if (currentPromptId != null &&
        widget.availablePromptIds.contains(currentPromptId)) {
      return currentPromptId;
    }
    if (widget.availablePromptIds.isNotEmpty) {
      return widget.availablePromptIds.first;
    }
    return profilePromptCatalog.first.id;
  }

  void _handleAnswerChanged() {
    if (_validationError == null &&
        _answerStatus == CatchFieldStatus.idle &&
        saveError == null) {
      return;
    }
    _answerSavedTimer?.cancel();
    setState(() {
      _validationError = null;
      _answerStatus = CatchFieldStatus.idle;
      clearSaveError();
    });
  }

  void _cancelQuestion() {
    _questionSavedTimer?.cancel();
    setState(() {
      final committedPromptId = _committedPromptId;
      _selectedPromptId =
          committedPromptId != null &&
              widget.availablePromptIds.contains(committedPromptId)
          ? committedPromptId
          : _initialPromptId();
      _deferredAnswer = null;
      _draftingNewPrompt = false;
      _questionStatus = CatchFieldStatus.idle;
      clearSaveError();
    });
    widget.onCancel();
  }

  void _handleAnswerFocusChanged(bool focused) {
    _answerHasFocus = focused;
    if (!focused) unawaited(_saveAnswer());
  }

  Future<void> _saveQuestion() async {
    final selectedPromptId = _selectedPromptId;
    if (selectedPromptId == _committedPromptId) {
      widget.onSaved();
      return;
    }

    _questionSavedTimer?.cancel();
    setState(() => _questionStatus = CatchFieldStatus.saving);
    final saved = await _enqueuePromptSave(
      question: true,
      save: () => saveFieldsFromLatest((latest) {
        final current = normalizeProfilePromptAnswers(latest.profilePrompts);
        // A question save changes only the question. The answer comes from the
        // latest persisted prompt, never from the live answer controller.
        final persistedAnswer = widget.promptIndex < current.length
            ? current[widget.promptIndex].answer
            : '';
        final updated = replaceProfilePromptAnswerAtIndex(
          current: current,
          index: widget.promptIndex,
          definition: profilePromptDefinition(selectedPromptId),
          answer: persistedAnswer,
        );
        if (listEquals(updated, current)) {
          return UpdateUserProfilePatch.raw(const {});
        }
        return UpdateUserProfilePatch(profilePrompts: updated);
      }),
    );
    if (!mounted) return;
    if (!saved) {
      setState(() => _questionStatus = CatchFieldStatus.idle);
      return;
    }

    _committedPromptId = selectedPromptId;
    _showSaved(question: true);

    // A new prompt cannot exist in the persisted schema without an answer.
    // If answer blur happened as Done was pressed, retain that answer until
    // the explicit question commit has succeeded, then save it separately.
    final deferredAnswer = _deferredAnswer;
    _deferredAnswer = null;
    if (deferredAnswer != null) {
      final answerSaved = await _saveAnswerValue(deferredAnswer);
      if (!mounted || !answerSaved) return;
    }
    widget.onSaved();
  }

  Future<void> _saveAnswer() async {
    final normalizedAnswer = normalizeProfilePromptAnswer(_controller.text);
    if (normalizedAnswer != _controller.text) {
      _controller.value = TextEditingValue(
        text: normalizedAnswer,
        selection: TextSelection.collapsed(offset: normalizedAnswer.length),
      );
    }
    final validationError = validateOptionalProfilePromptAnswer(
      normalizedAnswer,
    );
    if (validationError != null) {
      setState(() => _validationError = validationError);
      return;
    }

    if (_committedPromptId == widget.currentPromptId &&
        normalizedAnswer ==
            normalizeProfilePromptAnswer(widget.currentAnswer)) {
      return;
    }

    // An add card has no persisted question until the question's explicit
    // Done action succeeds. Keep the blurred answer pending rather than
    // letting it implicitly commit the merely staged question.
    if (_committedPromptId == null) {
      _deferredAnswer = normalizedAnswer.isEmpty ? null : normalizedAnswer;
      return;
    }

    await _saveAnswerValue(normalizedAnswer);
  }

  Future<bool> _saveAnswerValue(String normalizedAnswer) async {
    _answerSavedTimer?.cancel();
    setState(() => _answerStatus = CatchFieldStatus.saving);
    final saved = await _enqueuePromptSave(
      question: false,
      save: () => saveFieldsFromLatest((latest) {
        final current = normalizeProfilePromptAnswers(latest.profilePrompts);
        // The latest persisted question is authoritative. This keeps answer
        // blur from committing a staged selection and also lets a queued
        // answer follow a successful question save without reverting it.
        final promptId = widget.promptIndex < current.length
            ? current[widget.promptIndex].promptId
            : _committedPromptId;
        if (promptId == null) {
          return UpdateUserProfilePatch.raw(const {});
        }
        final updated = replaceProfilePromptAnswerAtIndex(
          current: current,
          index: widget.promptIndex,
          definition: profilePromptDefinition(promptId),
          answer: normalizedAnswer,
        );
        if (listEquals(updated, current)) {
          return UpdateUserProfilePatch.raw(const {});
        }
        return UpdateUserProfilePatch(profilePrompts: updated);
      }),
    );
    if (!mounted) return false;
    if (!saved) {
      setState(() => _answerStatus = CatchFieldStatus.idle);
      return false;
    }
    _showSaved(question: false);
    return true;
  }

  Future<bool> _enqueuePromptSave({
    required bool question,
    required Future<bool> Function() save,
  }) {
    final queued = _saveTail.then((_) async {
      if (!mounted) return false;
      _saveErrorBelongsToQuestion = question;
      return save();
    });
    _saveTail = queued.then<void>((_) {});
    return queued;
  }

  void _showSaved({required bool question}) {
    final timer = Timer(CatchFieldTokens.savedStatusHold, () {
      if (!mounted) return;
      setState(() {
        if (question) {
          _questionStatus = CatchFieldStatus.idle;
        } else {
          _answerStatus = CatchFieldStatus.idle;
        }
      });
    });
    setState(() {
      if (question) {
        _questionSavedTimer?.cancel();
        _questionSavedTimer = timer;
        _questionStatus = CatchFieldStatus.saved;
      } else {
        _answerSavedTimer?.cancel();
        _answerSavedTimer = timer;
        _answerStatus = CatchFieldStatus.saved;
      }
    });
  }

  String? _saveError({required bool question}) {
    final error = saveError;
    if (error == null || _saveErrorBelongsToQuestion != question) return null;
    return appErrorMessage(
      error,
      l10n: context.l10n,
      context: AppErrorContext.profile,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isAddAffordance && !_draftingNewPrompt) {
      return CatchFieldLanes.single(
        child: CatchField.add(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey('profile-prompt-add-${widget.promptIndex}'),
          icon: CatchIcons.create,
          title:
              context.l10n.userProfileInlineEditorPromptLabelAddAnotherPrompt,
          onTap: () {
            setState(() => _draftingNewPrompt = true);
            widget.onTap();
          },
        ),
      );
    }

    final selectedDefinition = profilePromptDefinition(_selectedPromptId);
    final questionSaving = _questionStatus == CatchFieldStatus.saving;
    final answerSaving = _answerStatus == CatchFieldStatus.saving;
    return CatchSection.containedFieldRows(
      key: ValueKey('profile-prompt-card-${widget.promptIndex}'),
      states: {
        if (_validationError != null || saveError != null) WidgetState.error,
      },
      children: [
        CatchField<String>.choices(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey('profile-prompt-question-${widget.promptIndex}'),
          icon: widget.icon,
          title: context.l10n.userProfileInlineEditorPromptLabelPromptNumber(
            number: widget.promptIndex + 1,
          ),
          contract: CatchContractConstraints.profilePromptAnswerPromptId,
          contractValueBuilder: (value) => value,
          body: selectedDefinition.title,
          values: widget.availablePromptIds,
          itemLabelBuilder: (promptId) =>
              profilePromptDefinition(promptId).title,
          selected: {_selectedPromptId},
          onSelectionChanged: (selection) {
            if (selection.isEmpty || questionSaving) return;
            _questionSavedTimer?.cancel();
            setState(() {
              _selectedPromptId = selection.single;
              _questionStatus = CatchFieldStatus.idle;
              clearSaveError();
            });
          },
          disclosureMode: widget.isExpanded
              ? CatchFieldMode.controlledExpanded
              : CatchFieldMode.controlledCollapsed,
          onOpenChanged: (expanded) {
            if (expanded == widget.isExpanded || questionSaving) {
              return;
            }
            widget.onTap();
          },
          onCancel: _cancelQuestion,
          onSubmit: _saveQuestion,
          status: questionSaving ? CatchFieldStatus.saving : _questionStatus,
          error: _saveError(question: true),
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey('profile-prompt-answer-${widget.promptIndex}'),
          title: context.l10n.userProfileInlineEditorPromptLabelAnswer,
          contract: CatchContractConstraints.profilePromptAnswerAnswer,
          controller: _controller,
          inputHint: selectedDefinition.placeholder,
          keyboardType: TextInputType.multiline,
          textInputAction: TextInputAction.newline,
          textCapitalization: TextCapitalization.sentences,
          maxLines: null,
          minLines: 1,
          maxLength: maximumProfilePromptAnswerLength,
          inputFormatters: const [_PromptStackedBlankLinesFormatter()],
          inputMode: questionSaving || answerSaving
              ? CatchTextInputMode.inactiveWithoutSelection
              : CatchTextInputMode.editable,
          status: answerSaving ? CatchFieldStatus.saving : _answerStatus,
          error: _validationError ?? _saveError(question: false),
          onFocusChanged: _handleAnswerFocusChanged,
        ),
      ],
    );
  }
}

class _PromptStackedBlankLinesFormatter extends TextInputFormatter {
  const _PromptStackedBlankLinesFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final collapsed = collapseStackedPromptBlankLines(newValue.text);
    if (collapsed == newValue.text) return newValue;

    final selectionEnd = newValue.selection.end;
    final normalizedOffset = selectionEnd < 0
        ? collapsed.length
        : collapseStackedPromptBlankLines(
            newValue.text.substring(0, selectionEnd),
          ).length;
    final offset = normalizedOffset.clamp(0, collapsed.length);
    return TextEditingValue(
      text: collapsed,
      selection: TextSelection.collapsed(offset: offset),
    );
  }
}
