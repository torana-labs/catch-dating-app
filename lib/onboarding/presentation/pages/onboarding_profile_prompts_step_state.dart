import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:flutter/material.dart';

class OnboardingProfilePromptsState {
  const OnboardingProfilePromptsState({
    required this.selectedPromptIds,
    required this.answerTexts,
    required this.isCompleting,
    required this.completeErrorMessage,
  });

  factory OnboardingProfilePromptsState.fromSelections({
    required Iterable<String> selectedPromptIds,
    required Iterable<String> answerTexts,
    bool isCompleting = false,
    String? completeErrorMessage,
  }) {
    return OnboardingProfilePromptsState(
      selectedPromptIds: List<String>.unmodifiable(
        normalizeSelectedPromptIds(selectedPromptIds),
      ),
      answerTexts: List<String>.unmodifiable(
        _normalizedAnswerTexts(answerTexts),
      ),
      isCompleting: isCompleting,
      completeErrorMessage: completeErrorMessage,
    );
  }

  factory OnboardingProfilePromptsState.fromPromptAnswers({
    required Iterable<ProfilePromptAnswer> prompts,
    bool isCompleting = false,
    String? completeErrorMessage,
  }) {
    final normalized = normalizeProfilePromptAnswers(prompts);
    return OnboardingProfilePromptsState.fromSelections(
      selectedPromptIds: [for (final prompt in normalized) prompt.promptId],
      answerTexts: [for (final prompt in normalized) prompt.answer],
      isCompleting: isCompleting,
      completeErrorMessage: completeErrorMessage,
    );
  }

  final List<String> selectedPromptIds;
  final List<String> answerTexts;
  final bool isCompleting;
  final String? completeErrorMessage;

  bool get hasCompleteError => completeErrorMessage != null;

  List<ProfilePromptAnswer> get promptAnswers {
    return normalizeProfilePromptAnswers(
      Iterable<ProfilePromptAnswer>.generate(maxProfilePromptAnswers, (index) {
        final definition = definitionForSlot(index);
        return profilePromptAnswerFor(
          definition: definition,
          answer: answerTextForSlot(index),
        );
      }),
    );
  }

  int get answeredCount => promptAnswers.length;

  bool get canContinue => answeredCount == maxProfilePromptAnswers;

  bool get canSubmit => canContinue && !isCompleting;

  bool get requestControlsEnabled => !isCompleting;

  String get progressLabel =>
      '$answeredCount / $maxProfilePromptAnswers prompts answered';

  ProfilePromptDefinition definitionForSlot(int index) {
    return profilePromptDefinition(selectedPromptIdForSlot(index));
  }

  String selectedPromptIdForSlot(int index) {
    if (index < 0 || index >= selectedPromptIds.length) {
      return defaultPromptIdForSlot(index);
    }
    return selectedPromptIds[index];
  }

  String answerTextForSlot(int index) {
    if (index < 0 || index >= answerTexts.length) return '';
    return answerTexts[index];
  }

  int answerLengthForSlot(int index) => answerTextForSlot(index).length;

  List<String> availablePromptIds(int index) {
    final currentPromptId = selectedPromptIdForSlot(index);
    final usedPromptIds = {
      for (final entry in selectedPromptIds.indexed)
        if (entry.$1 != index) entry.$2,
    };
    return [
      if (!profilePromptCatalog.any(
        (definition) => definition.id == currentPromptId,
      ))
        currentPromptId,
      for (final definition in profilePromptCatalog)
        if (!usedPromptIds.contains(definition.id) ||
            definition.id == currentPromptId)
          definition.id,
    ];
  }

  OnboardingProfilePromptsSubmitIntent? submitIntent() {
    if (!canContinue) return null;
    return OnboardingProfilePromptsSubmitIntent(prompts: promptAnswers);
  }

  static List<String> defaultPromptIds() {
    return List<String>.generate(
      maxProfilePromptAnswers,
      defaultPromptIdForSlot,
    );
  }

  static List<String> normalizeSelectedPromptIds(Iterable<String> promptIds) {
    final selectedPromptIds = promptIds.take(maxProfilePromptAnswers).toList();
    while (selectedPromptIds.length < maxProfilePromptAnswers) {
      selectedPromptIds.add(defaultPromptIdForSlot(selectedPromptIds.length));
    }

    final usedPromptIds = <String>{};
    for (var index = 0; index < selectedPromptIds.length; index += 1) {
      final selected = selectedPromptIds[index];
      if (usedPromptIds.add(selected)) continue;
      selectedPromptIds[index] = defaultPromptIdForSlot(index, usedPromptIds);
      usedPromptIds.add(selectedPromptIds[index]);
    }
    return selectedPromptIds;
  }

  static String defaultPromptIdForSlot(
    int index, [
    Set<String>? usedPromptIds,
  ]) {
    final used = usedPromptIds ?? const <String>{};
    final defaultPromptId = index < defaultProfilePromptIds.length
        ? defaultProfilePromptIds[index]
        : null;
    if (defaultPromptId != null && !used.contains(defaultPromptId)) {
      return defaultPromptId;
    }
    return profilePromptCatalog
        .firstWhere(
          (definition) => !used.contains(definition.id),
          orElse: () => profilePromptCatalog.first,
        )
        .id;
  }

  static List<String> _normalizedAnswerTexts(Iterable<String> answers) {
    final answerTexts = answers.take(maxProfilePromptAnswers).toList();
    while (answerTexts.length < maxProfilePromptAnswers) {
      answerTexts.add('');
    }
    return answerTexts;
  }
}

class OnboardingProfilePromptsSubmitIntent {
  const OnboardingProfilePromptsSubmitIntent({required this.prompts});

  final List<ProfilePromptAnswer> prompts;
}

class OnboardingProfilePromptsTextControllers {
  const OnboardingProfilePromptsTextControllers({required this.answers});

  final List<TextEditingController> answers;
}

class OnboardingProfilePromptsCallbacks {
  const OnboardingProfilePromptsCallbacks({
    required this.onPromptChanged,
    required this.onContinue,
  });

  final void Function(int index, String promptId) onPromptChanged;
  final VoidCallback onContinue;
}
