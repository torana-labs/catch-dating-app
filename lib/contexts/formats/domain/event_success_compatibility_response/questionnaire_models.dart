part of '../event_success_compatibility_response.dart';

final class EventSuccessCompatibilityQuestion {
  const EventSuccessCompatibilityQuestion({
    required this.id,
    required this.prompt,
    required this.options,
  });

  factory EventSuccessCompatibilityQuestion.fromJson(
    Map<String, dynamic> json,
  ) {
    return EventSuccessCompatibilityQuestion(
      id: _normalizedId(json['id'], fallback: 'question'),
      prompt: _normalizedText(
        json['prompt'],
        fallback: EventSuccessQuestionnairePackLibrary.fallbackQuestion,
      ),
      options: (json['options'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(EventSuccessCompatibilityOption.fromJson)
          .where((option) => option.label.trim().isNotEmpty)
          .take(5)
          .toList(growable: false),
    ).normalized();
  }

  final String id;
  final String prompt;
  final List<EventSuccessCompatibilityOption> options;

  EventSuccessCompatibilityQuestion normalized() {
    final normalizedPrompt = prompt.trim();
    final normalizedOptions = options
        .where((option) => option.label.trim().isNotEmpty)
        .take(5)
        .toList(growable: false);
    return EventSuccessCompatibilityQuestion(
      id: _normalizedId(id, fallback: _slugFrom(normalizedPrompt, 'question')),
      prompt: normalizedPrompt.isEmpty
          ? EventSuccessQuestionnairePackLibrary.fallbackQuestion
          : normalizedPrompt,
      options: normalizedOptions.length < 2
          ? _fallbackOptionsFor(id)
          : normalizedOptions,
    );
  }

  EventSuccessCompatibilityQuestion copyWith({
    String? id,
    String? prompt,
    List<EventSuccessCompatibilityOption>? options,
  }) {
    return EventSuccessCompatibilityQuestion(
      id: id ?? this.id,
      prompt: prompt ?? this.prompt,
      options: options ?? this.options,
    );
  }

  Map<String, Object?> toJson() {
    final persisted = normalized();
    return {
      'id': persisted.id,
      'prompt': persisted.prompt,
      'options': persisted.options.map((option) => option.toJson()).toList(),
    };
  }
}

final class EventSuccessCompatibilityOption {
  const EventSuccessCompatibilityOption({
    required this.id,
    required this.label,
  });

  factory EventSuccessCompatibilityOption.fromJson(Map<String, dynamic> json) {
    final label = _normalizedText(
      json['label'],
      fallback: EventSuccessQuestionnairePackLibrary.fallbackOption,
    );
    return EventSuccessCompatibilityOption(
      id: _normalizedId(json['id'], fallback: _slugFrom(label, 'option')),
      label: label,
    );
  }

  final String id;
  final String label;

  EventSuccessCompatibilityOption copyWith({String? id, String? label}) {
    return EventSuccessCompatibilityOption(
      id: _normalizedId(
        id ?? this.id,
        fallback: _slugFrom(label ?? this.label, 'option'),
      ),
      label: label ?? this.label,
    );
  }

  Map<String, Object?> toJson() {
    final normalizedLabel = _normalizedText(label, fallback: 'Option');
    return {
      'id': _normalizedId(id, fallback: _slugFrom(normalizedLabel, 'option')),
      'label': normalizedLabel,
    };
  }
}

final class EventSuccessQuestionnairePack {
  const EventSuccessQuestionnairePack({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.questions,
    this.custom = false,
  });

  final String id;
  final String title;
  final String subtitle;
  final List<EventSuccessCompatibilityQuestion> questions;
  final bool custom;
}
