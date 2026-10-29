part of '../event_success_compatibility_response.dart';

abstract final class EventSuccessCompatibilityQuestionnaire {
  static final questions =
      EventSuccessQuestionnairePackLibrary.balanced.questions;

  static List<EventSuccessCompatibilityQuestion> questionsFor(
    EventSuccessQuestionnaireConfig config,
  ) => config.normalized().questions;

  static Set<String> get answerIds =>
      questions.expand((question) => question.options).map((option) {
        return option.id;
      }).toSet();

  static Set<String> answerIdsFor(EventSuccessQuestionnaireConfig config) =>
      questionsFor(config).expand((question) => question.options).map((option) {
        return option.id;
      }).toSet();

  static String? answerIdForQuestion(
    List<String> answerIds,
    String questionId,
  ) => answerIdForQuestionInConfig(
    answerIds,
    questionId,
    const EventSuccessQuestionnaireConfig(),
  );

  static String? answerIdForQuestionInConfig(
    List<String> answerIds,
    String questionId,
    EventSuccessQuestionnaireConfig config,
  ) {
    EventSuccessCompatibilityQuestion? question;
    for (final item in questionsFor(config)) {
      if (item.id == questionId) {
        question = item;
        break;
      }
    }
    if (question == null) return null;
    final optionIds = question.options.map((option) => option.id).toSet();
    for (final answerId in answerIds) {
      if (optionIds.contains(answerId)) return answerId;
    }
    return null;
  }

  static List<String> normalizedAnswerIds(
    Iterable<String> rawAnswerIds, {
    EventSuccessQuestionnaireConfig config =
        const EventSuccessQuestionnaireConfig(),
  }) {
    final allowedAnswerIds = answerIdsFor(config);
    final selectedByQuestion = <String, String>{};
    for (final answerId in rawAnswerIds) {
      if (!allowedAnswerIds.contains(answerId)) continue;
      final questionId = questionIdForAnswer(answerId, config: config);
      if (questionId == null) continue;
      selectedByQuestion[questionId] = answerId;
    }
    return [
      for (final question in questionsFor(config))
        if (selectedByQuestion[question.id] != null)
          selectedByQuestion[question.id]!,
    ];
  }

  static String? questionIdForAnswer(
    String answerId, {
    EventSuccessQuestionnaireConfig config =
        const EventSuccessQuestionnaireConfig(),
  }) {
    for (final question in questionsFor(config)) {
      for (final option in question.options) {
        if (option.id == answerId) return question.id;
      }
    }
    return null;
  }
}
