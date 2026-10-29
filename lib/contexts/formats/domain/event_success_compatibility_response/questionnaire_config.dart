part of '../event_success_compatibility_response.dart';

final class EventSuccessQuestionnaireConfig {
  const EventSuccessQuestionnaireConfig({
    this.templateId = EventSuccessQuestionnairePackLibrary.balancedId,
    this.customTitle,
    this.customQuestions = const [],
  });

  const EventSuccessQuestionnaireConfig.defaultTemplate()
    : this(templateId: EventSuccessQuestionnairePackLibrary.balancedId);

  const EventSuccessQuestionnaireConfig.customTemplate()
    : this(
        templateId: EventSuccessQuestionnairePackLibrary.customId,
        customTitle: 'Custom question set',
        customQuestions:
            EventSuccessQuestionnairePackLibrary.customStarterQuestions,
      );

  factory EventSuccessQuestionnaireConfig.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const EventSuccessQuestionnaireConfig();
    final rawTemplateId = json['templateId'];
    final templateId =
        rawTemplateId is String && rawTemplateId.trim().isNotEmpty
        ? rawTemplateId.trim()
        : EventSuccessQuestionnairePackLibrary.balancedId;
    return EventSuccessQuestionnaireConfig(
      templateId: templateId,
      customTitle: json['customTitle'] as String?,
      customQuestions: (json['customQuestions'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(EventSuccessCompatibilityQuestion.fromJson)
          .take(8)
          .toList(growable: false),
    ).normalized();
  }

  final String templateId;
  final String? customTitle;
  final List<EventSuccessCompatibilityQuestion> customQuestions;

  bool get usesCustom =>
      templateId == EventSuccessQuestionnairePackLibrary.customId;

  EventSuccessQuestionnairePack get pack =>
      EventSuccessQuestionnairePackLibrary.resolve(this);

  List<EventSuccessCompatibilityQuestion> get questions => pack.questions;

  EventSuccessQuestionnaireConfig normalized() {
    if (!usesCustom) {
      return EventSuccessQuestionnaireConfig(
        templateId: EventSuccessQuestionnairePackLibrary.byIdOrDefault(
          templateId,
        ).id,
      );
    }
    final questions = customQuestions
        .map((question) => question.normalized())
        .where((question) => question.options.length >= 2)
        .take(8)
        .toList(growable: false);
    return EventSuccessQuestionnaireConfig(
      templateId: EventSuccessQuestionnairePackLibrary.customId,
      customTitle: _normalizedText(customTitle, fallback: 'Custom'),
      customQuestions: questions.isEmpty
          ? EventSuccessQuestionnairePackLibrary.customStarterQuestions
          : questions,
    );
  }

  EventSuccessQuestionnaireConfig copyWith({
    String? templateId,
    Object? customTitle = unsetSentinel,
    List<EventSuccessCompatibilityQuestion>? customQuestions,
  }) {
    return EventSuccessQuestionnaireConfig(
      templateId: templateId ?? this.templateId,
      customTitle: identical(customTitle, unsetSentinel)
          ? this.customTitle
          : customTitle as String?,
      customQuestions: customQuestions ?? this.customQuestions,
    );
  }

  Map<String, Object?> toJson() {
    final persisted = normalized();
    return {
      'templateId': persisted.templateId,
      if (persisted.usesCustom) ...{
        'customTitle': persisted.customTitle,
        'customQuestions': persisted.customQuestions
            .map((question) => question.toJson())
            .toList(),
      },
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is EventSuccessQuestionnaireConfig &&
            other.templateId == templateId &&
            other.customTitle == customTitle &&
            _sameQuestions(other.customQuestions, customQuestions);
  }

  @override
  int get hashCode =>
      Object.hash(templateId, customTitle, Object.hashAll(customQuestions));
}
