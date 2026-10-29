import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_logic.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_section.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_share.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_target_controller.dart';
part 'host_forms_controller.g.dart';
part 'host_forms_directory_state.dart';

typedef HostFormAccountDirectoryScope = ({
  String uid,
  int accountGeneration,
  HostFormListRequest request,
});

/// The actor is part of this generated family's identity. It forces a fresh
/// manager read before a newly signed-in account can see directory rows.
@riverpod
Future<HostFormsDirectoryState> hostFormsAccountDirectory(
  Ref ref,
  HostFormAccountDirectoryScope scope,
) {
  final fresh = ref.refresh(
    hostFormsDirectoryControllerProvider(scope.request).future,
  );
  // Keep the source family alive until its fresh read settles.
  ref.listen(hostFormsDirectoryControllerProvider(scope.request), (_, _) {});
  return fresh;
}

@riverpod
class HostFormsDirectoryController extends _$HostFormsDirectoryController {
  int _readGeneration = 0;

  bool _matchesAccount(HostFormListRequest request) =>
      request.accountUid == null ||
      ref.read(firebaseAuthProvider).currentUser?.uid == request.accountUid;

  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async {
    final generation = ++_readGeneration;
    if (!_matchesAccount(request)) {
      throw StateError('The Host account changed while loading forms.');
    }
    final page = await ref.read(hostFormsRepositoryProvider).listForms(request);
    if (!ref.mounted ||
        generation != _readGeneration ||
        !_matchesAccount(request)) {
      throw StateError('The Host account changed while loading forms.');
    }
    return HostFormsDirectoryState(
      forms: page.items,
      nextCursor: page.nextCursor,
    );
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore || !_matchesAccount(request)) {
      return;
    }
    final generation = _readGeneration;
    state = AsyncData(
      current.copyWith(loadingMore: true, clearLoadMoreError: true),
    );
    try {
      final page = await ref
          .read(hostFormsRepositoryProvider)
          .listForms(request.copyWith(cursor: current.nextCursor));
      if (!ref.mounted ||
          generation != _readGeneration ||
          !_matchesAccount(request)) {
        return;
      }
      final byId = <String, HostFormSummary>{
        for (final form in current.forms) form.formId: form,
        for (final form in page.items) form.formId: form,
      };
      state = AsyncData(
        HostFormsDirectoryState(
          forms: List.unmodifiable(byId.values),
          nextCursor: page.nextCursor,
        ),
      );
    } on Object catch (error) {
      if (!ref.mounted ||
          generation != _readGeneration ||
          !_matchesAccount(request)) {
        return;
      }
      state = AsyncData(
        current.copyWith(loadingMore: false, loadMoreError: error),
      );
    }
  }
}

enum HostFormSaveState { saved, dirty, saving, conflict, failed }

@immutable
class HostFormEditorState {
  const HostFormEditorState({
    required this.editor,
    this.saveState = HostFormSaveState.saved,
    this.operationInProgress = false,
    this.canUndo = false,
    this.canRedo = false,
    this.error,
  });

  final HostFormEditor editor;
  final HostFormSaveState saveState;
  final bool operationInProgress;
  final bool canUndo;
  final bool canRedo;
  final Object? error;

  bool get hasBlockingValidationErrors => editor.validationIssues.any(
    (issue) => issue.severity == HostFormValidationSeverity.error,
  );

  HostFormEditorState copyWith({
    HostFormEditor? editor,
    HostFormSaveState? saveState,
    bool? operationInProgress,
    bool? canUndo,
    bool? canRedo,
    Object? error,
    bool clearError = false,
  }) => HostFormEditorState(
    editor: editor ?? this.editor,
    saveState: saveState ?? this.saveState,
    operationInProgress: operationInProgress ?? this.operationInProgress,
    canUndo: canUndo ?? this.canUndo,
    canRedo: canRedo ?? this.canRedo,
    error: clearError ? null : error ?? this.error,
  );
}

@riverpod
class HostFormEditorController extends _$HostFormEditorController
    with _HostFormEditorTargetMixin {
  @override
  int _generation = 0;
  int _idCounter = 0;
  @override
  final List<HostFormDefinition> _undoStack = [];
  @override
  final List<HostFormDefinition> _redoStack = [];

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async {
    ref.onDispose(() => _saveTimer?.cancel());
    _saveTimer?.cancel();
    final buildSerial = ++_reloadSerial;
    _generation++;
    _targetMutationAccountId = null;
    _editorAccountId = null;
    _undoStack.clear();
    _redoStack.clear();
    // Watching the UID rebuilds the editor when the signed-in account changes.
    final accountId = _watchedAccountId();
    if (accountId == null) throw StateError('The Host account is not ready.');
    if (!await _awaitSaveIdle(buildSerial) ||
        _settledAccountId() != accountId) {
      throw StateError('The Host account changed while loading the form.');
    }
    final editor = await ref
        .read(hostFormsRepositoryProvider)
        .getEditor(organizerId: organizerId, formId: formId);
    if (!ref.mounted ||
        buildSerial != _reloadSerial ||
        _settledAccountId() != accountId) {
      throw StateError('The Host account changed while loading the form.');
    }
    _editorAccountId = accountId;
    return HostFormEditorState(editor: editor);
  }

  void updateMessagingConsent({
    bool? organizerWhatsapp,
    bool? catchWhatsapp,
    bool? organizerOperationsWhatsapp,
    bool? organizerMarketingWhatsapp,
    bool? catchMarketingWhatsapp,
  }) => _mutate(
    (definition) => definition.withMessagingConsent(
      organizerWhatsapp: organizerWhatsapp,
      catchWhatsapp: catchWhatsapp,
      organizerOperationsWhatsapp: organizerOperationsWhatsapp,
      organizerMarketingWhatsapp: organizerMarketingWhatsapp,
      catchMarketingWhatsapp: catchMarketingWhatsapp,
    ),
  );

  void updatePayment(HostFormPayment? payment) =>
      _mutate((definition) => definition.withPayment(payment));

  void updateEventProfileEnabled(bool enabled) =>
      _mutate((definition) => definition.withEventProfileEnabled(enabled));

  void updateMetadata({
    String? title,
    String? description,
    bool clearDescription = false,
    HostFormPurpose? purpose,
    HostFormIdentityPolicy? identityPolicy,
    String? completionTitle,
    String? completionMessage,
    bool clearCompletionMessage = false,
    HostFormCompletionAction? completionAction,
    String? completionActionLabel,
    bool clearCompletionActionLabel = false,
    String? completionActionUrl,
    bool clearCompletionActionUrl = false,
    HostFormAppearancePreset? appearancePreset,
    String? activityKind,
    bool clearActivityKind = false,
    DateTime? opensAt,
    bool setOpensAt = false,
    DateTime? closesAt,
    bool setClosesAt = false,
    int? responseLimit,
    bool setResponseLimit = false,
    String? closedMessage,
    bool clearClosedMessage = false,
    String? consentCopy,
    String? consentVersion,
    String? retentionCopy,
  }) => _mutate(
    (definition) => definition.copyWith(
      title: title,
      description: description,
      clearDescription: clearDescription,
      purpose: purpose,
      identityPolicy: identityPolicy,
      completionTitle: completionTitle,
      completionMessage: completionMessage,
      clearCompletionMessage: clearCompletionMessage,
      completionAction: completionAction,
      completionActionLabel: completionActionLabel,
      clearCompletionActionLabel: clearCompletionActionLabel,
      completionActionUrl: completionActionUrl,
      clearCompletionActionUrl: clearCompletionActionUrl,
      appearancePreset: appearancePreset,
      activityKind: activityKind,
      clearActivityKind: clearActivityKind,
      opensAt: opensAt,
      setOpensAt: setOpensAt,
      closesAt: closesAt,
      setClosesAt: setClosesAt,
      responseLimit: responseLimit,
      setResponseLimit: setResponseLimit,
      closedMessage: closedMessage,
      clearClosedMessage: clearClosedMessage,
      consentCopy: consentCopy,
      consentVersion: consentVersion,
      retentionCopy: retentionCopy,
    ),
  );

  void updateSection(
    int sectionIndex, {
    String? title,
    String? description,
    bool clearDescription = false,
    bool? pageBreak,
  }) => _mutate((definition) {
    final section = definition.sections[sectionIndex].copyWith(
      title: title,
      description: description,
      clearDescription: clearDescription,
      pageBreak: pageBreak,
    );
    return definition.replaceSection(sectionIndex, section);
  });

  void addSection() => _mutate(
    (definition) => definition.addSection(
      HostFormSection.create(sectionId: _newId('section')),
    ),
  );

  void removeSection(int sectionIndex) =>
      _mutate((definition) => definition.removeSection(sectionIndex));

  void moveSection(int sectionIndex, int delta) => _mutate((definition) {
    final target = (sectionIndex + delta)
        .clamp(0, definition.sections.length - 1)
        .toInt();
    if (target == sectionIndex) return definition;
    return definition.moveSection(sectionIndex, target);
  });

  void addQuestion(int sectionIndex, HostFormQuestionKind kind) =>
      _mutate((definition) {
        final section = definition.sections[sectionIndex].addQuestion(
          HostFormQuestion.create(questionId: _newId('question'), kind: kind),
        );
        return definition.replaceSection(sectionIndex, section);
      });

  void updateQuestion(
    int sectionIndex,
    int questionIndex, {
    String? label,
    String? helpText,
    bool clearHelpText = false,
    HostFormQuestionKind? kind,
    bool? required,
    String? canonicalFieldId,
    bool clearCanonicalField = false,
    HostFormPrivacyClass? privacyClass,
    HostFormPrefillPolicy? prefillPolicy,
    HostFormPresentation? hostPresentation,
    HostFormAnswerDestination? answerDestination,
    bool? eventProfileAudience,
    HostFormQuestionValidation? validation,
  }) => _mutate((definition) {
    final currentSection = definition.sections[sectionIndex];
    final question = currentSection.questions[questionIndex].copyWith(
      label: label,
      helpText: helpText,
      clearHelpText: clearHelpText,
      kind: kind,
      required: required,
      canonicalFieldId: canonicalFieldId,
      clearCanonicalField: clearCanonicalField,
      privacyClass: privacyClass,
      prefillPolicy: prefillPolicy,
      hostPresentation: hostPresentation,
      answerDestination: answerDestination,
      eventProfileAudience: eventProfileAudience,
      validation: validation,
    );
    final section = currentSection.replaceQuestion(questionIndex, question);
    final updated = definition.replaceSection(sectionIndex, section);
    return eventProfileAudience == true && !updated.eventProfileEnabled
        ? updated.withEventProfileEnabled(true)
        : updated;
  });

  void removeQuestion(int sectionIndex, int questionIndex) =>
      _mutate((definition) {
        final section = definition.sections[sectionIndex].removeQuestion(
          questionIndex,
        );
        return definition.replaceSection(sectionIndex, section);
      });

  void moveQuestion(int sectionIndex, int questionIndex, int delta) =>
      _mutate((definition) {
        final currentSection = definition.sections[sectionIndex];
        final target = (questionIndex + delta)
            .clamp(0, currentSection.questions.length - 1)
            .toInt();
        if (target == questionIndex) return definition;
        return definition.replaceSection(
          sectionIndex,
          currentSection.moveQuestion(questionIndex, target),
        );
      });

  void moveQuestionToSection({
    required String questionId,
    required int targetSectionIndex,
  }) => _mutate((definition) {
    final sourceSectionIndex = definition.sections.indexWhere(
      (section) => section.questions.any(
        (question) => question.questionId == questionId,
      ),
    );
    if (sourceSectionIndex < 0 ||
        sourceSectionIndex == targetSectionIndex ||
        targetSectionIndex < 0 ||
        targetSectionIndex >= definition.sections.length) {
      return definition;
    }
    final questionIndex = definition.sections[sourceSectionIndex].questions
        .indexWhere((question) => question.questionId == questionId);
    return definition.moveQuestionToSection(
      sourceSectionIndex: sourceSectionIndex,
      questionIndex: questionIndex,
      targetSectionIndex: targetSectionIndex,
    );
  });

  void updateOption(
    int sectionIndex,
    int questionIndex,
    int optionIndex, {
    String? label,
  }) => _mutate((definition) {
    final currentSection = definition.sections[sectionIndex];
    final currentQuestion = currentSection.questions[questionIndex];
    final option = currentQuestion.options[optionIndex].copyWith(label: label);
    final question = currentQuestion.replaceOption(optionIndex, option);
    return definition.replaceSection(
      sectionIndex,
      currentSection.replaceQuestion(questionIndex, question),
    );
  });

  void addOption(int sectionIndex, int questionIndex) => _mutate((definition) {
    final currentSection = definition.sections[sectionIndex];
    final currentQuestion = currentSection.questions[questionIndex];
    final ordinal = currentQuestion.options.length + 1;
    final question = currentQuestion.addOption(
      HostFormQuestionOption.create(
        optionId: _newId('option'),
        ordinal: ordinal,
      ),
    );
    return definition.replaceSection(
      sectionIndex,
      currentSection.replaceQuestion(questionIndex, question),
    );
  });

  void removeOption(int sectionIndex, int questionIndex, int optionIndex) =>
      _mutate((definition) {
        final currentSection = definition.sections[sectionIndex];
        final currentQuestion = currentSection.questions[questionIndex];
        if (currentQuestion.options.length <= 2) return definition;
        final question = currentQuestion.removeOption(optionIndex);
        return definition.replaceSection(
          sectionIndex,
          currentSection.replaceQuestion(questionIndex, question),
        );
      });

  void addLogicRule({
    required String questionId,
    required HostFormLogicOperator operator,
    required List<Object?> expectedValues,
    required HostFormLogicAction action,
    String? targetQuestionId,
    String? targetSectionId,
  }) => _mutate(
    (definition) => definition.addLogicRule(
      HostFormLogicRule.create(
        ruleId: _newId('rule'),
        questionId: questionId,
        operator: operator,
        expectedValues: expectedValues,
        action: action,
        targetQuestionId: targetQuestionId,
        targetSectionId: targetSectionId,
      ),
    ),
  );

  void removeLogicRule(int index) =>
      _mutate((definition) => definition.removeLogicRule(index));

  Future<bool> validate() async {
    final actor = _editorAccountId;
    if (!editorBoundTo(actor)) return false;
    final serial = _reloadSerial;
    final current = state.asData?.value;
    if (current == null) return false;
    state = AsyncData(
      current.copyWith(operationInProgress: true, clearError: true),
    );
    try {
      final result = await ref
          .read(hostFormsRepositoryProvider)
          .validateDraft(
            organizerId: organizerId,
            formId: formId,
            definition: current.editor.definition,
          );
      if (!ref.mounted || serial != _reloadSerial || !editorBoundTo(actor)) {
        return false;
      }
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          editor: latest.editor.copyWith(validationIssues: result.issues),
          operationInProgress: false,
          clearError: true,
        ),
      );
      return result.valid;
    } on Object catch (error) {
      if (!ref.mounted || serial != _reloadSerial || !editorBoundTo(actor)) {
        return false;
      }
      state = AsyncData(
        current.copyWith(operationInProgress: false, error: error),
      );
      return false;
    }
  }

  Future<bool> publish() async {
    final actor = _editorAccountId;
    if (!editorBoundTo(actor)) return false;
    if (!await saveNow()) return false;
    if (!ref.mounted || !editorBoundTo(actor)) return false;
    if (!await validate()) return false;
    if (!ref.mounted || !editorBoundTo(actor)) return false;
    final serial = _reloadSerial;
    final current = state.asData?.value;
    if (current == null) return false;
    state = AsyncData(
      current.copyWith(operationInProgress: true, clearError: true),
    );
    try {
      final summary = await ref
          .read(hostFormsRepositoryProvider)
          .publish(
            organizerId: organizerId,
            formId: formId,
            expectedRevision: current.editor.form.draftRevision,
          );
      if (!ref.mounted || serial != _reloadSerial || !editorBoundTo(actor)) {
        return false;
      }
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          editor: latest.editor.copyWith(form: summary),
          operationInProgress: false,
          clearError: true,
        ),
      );
      return true;
    } on Object catch (error) {
      if (!ref.mounted || serial != _reloadSerial || !editorBoundTo(actor)) {
        return false;
      }
      state = AsyncData(
        current.copyWith(operationInProgress: false, error: error),
      );
      return false;
    }
  }

  Future<bool> setLifecycle(HostFormLifecycleAction action) async {
    final actor = _editorAccountId;
    if (!editorBoundTo(actor)) return false;
    final serial = _reloadSerial;
    final current = state.asData?.value;
    if (current == null) return false;
    state = AsyncData(
      current.copyWith(operationInProgress: true, clearError: true),
    );
    try {
      final summary = await ref
          .read(hostFormsRepositoryProvider)
          .setLifecycle(
            organizerId: organizerId,
            formId: formId,
            expectedStatus: current.editor.form.status,
            action: action,
          );
      if (!ref.mounted || serial != _reloadSerial || !editorBoundTo(actor)) {
        return false;
      }
      final latest = state.asData?.value ?? current;
      state = AsyncData(
        latest.copyWith(
          editor: latest.editor.copyWith(form: summary),
          operationInProgress: false,
          clearError: true,
        ),
      );
      return true;
    } on Object catch (error) {
      if (!ref.mounted || serial != _reloadSerial || !editorBoundTo(actor)) {
        return false;
      }
      state = AsyncData(
        current.copyWith(operationInProgress: false, error: error),
      );
      return false;
    }
  }

  @override
  void _mutate(
    HostFormDefinition Function(HostFormDefinition definition) transform,
  ) {
    if (!editorBoundTo(_editorAccountId)) {
      unawaited(reload());
      return;
    }
    final current = state.asData?.value;
    if (current == null || current.operationInProgress) return;
    final definition = transform(current.editor.definition);
    if (identical(definition, current.editor.definition)) return;
    _undoStack.add(current.editor.definition);
    if (_undoStack.length > 50) _undoStack.removeAt(0);
    _redoStack.clear();
    _replaceLocalDefinition(current, definition);
  }

  void undo() {
    if (!editorBoundTo(_editorAccountId)) {
      unawaited(reload());
      return;
    }
    final current = state.asData?.value;
    if (current == null || current.operationInProgress || _undoStack.isEmpty) {
      return;
    }
    final definition = _undoStack.removeLast();
    _redoStack.add(current.editor.definition);
    _replaceLocalDefinition(current, definition);
  }

  void redo() {
    if (!editorBoundTo(_editorAccountId)) {
      unawaited(reload());
      return;
    }
    final current = state.asData?.value;
    if (current == null || current.operationInProgress || _redoStack.isEmpty) {
      return;
    }
    final definition = _redoStack.removeLast();
    _undoStack.add(current.editor.definition);
    _replaceLocalDefinition(current, definition);
  }

  void _replaceLocalDefinition(
    HostFormEditorState current,
    HostFormDefinition definition,
  ) {
    _generation += 1;
    state = AsyncData(
      current.copyWith(
        editor: current.editor.copyWith(definition: definition),
        saveState: HostFormSaveState.dirty,
        canUndo: _undoStack.isNotEmpty,
        canRedo: _redoStack.isNotEmpty,
        clearError: true,
      ),
    );
    _scheduleSave();
  }

  String _newId(String prefix) {
    _idCounter += 1;
    return '${prefix}_${DateTime.now().microsecondsSinceEpoch}_$_idCounter';
  }
}

@riverpod
Future<HostFormShareAssets> hostFormShareAssetsController(
  Ref ref, {
  required String organizerId,
  required String formId,
}) => ref
    .read(hostFormsRepositoryProvider)
    .getShareAssets(organizerId: organizerId, formId: formId);

@riverpod
HostFormsController hostFormsController(Ref ref) =>
    HostFormsController(ref.watch(hostFormsRepositoryProvider));

class HostFormsController {
  const HostFormsController(this._repository);

  final HostFormsRepository _repository;

  Future<HostFormEditor> create({
    required String organizerId,
    required String templateId,
    required String requestId,
    String? title,
  }) => _repository.createForm(
    organizerId: organizerId,
    templateId: templateId,
    requestId: requestId,
    title: title,
  );

  Future<HostFormEditor> duplicate({
    required HostFormSummary source,
    required String requestId,
  }) => _repository.duplicate(
    organizerId: source.organizerId,
    sourceFormId: source.formId,
    requestId: requestId,
  );

  Future<void> deleteDraft(HostFormSummary form) => _repository.deleteDraft(
    organizerId: form.organizerId,
    formId: form.formId,
    expectedRevision: form.draftRevision,
  );

  Future<void> setLifecycle({
    required HostFormSummary form,
    required HostFormLifecycleAction action,
  }) => _repository.setLifecycle(
    organizerId: form.organizerId,
    formId: form.formId,
    expectedStatus: form.status,
    action: action,
  );

  Future<HostFormShareLink> createShareLink({
    required String organizerId,
    required String formId,
    required String label,
    required String? source,
    required String requestId,
  }) => _repository.createShareLink(
    organizerId: organizerId,
    formId: formId,
    label: label,
    source: source,
    requestId: requestId,
  );

  Future<HostFormExportReceipt> requestExport({
    required String organizerId,
    required String formId,
    required String requestId,
    required HostFormExportFormat format,
    required Set<HostFormResponseStatus> statuses,
    String? versionId,
  }) => _repository.requestExport(
    organizerId: organizerId,
    formId: formId,
    requestId: requestId,
    format: format,
    statuses: statuses,
    versionId: versionId,
  );

  Future<HostFormConversionPreview> previewConversion({
    required String organizerId,
    required String responseId,
    required HostFormConversionKind kind,
    String? eventId,
  }) => _repository.previewConversion(
    organizerId: organizerId,
    responseId: responseId,
    kind: kind,
    eventId: eventId,
  );

  Future<HostFormConversionReceipt> convertResponse({
    required String organizerId,
    required String responseId,
    required HostFormConversionKind kind,
    required String requestId,
    String? eventId,
  }) => _repository.convertResponse(
    organizerId: organizerId,
    responseId: responseId,
    kind: kind,
    eventId: eventId,
    requestId: requestId,
  );
}
