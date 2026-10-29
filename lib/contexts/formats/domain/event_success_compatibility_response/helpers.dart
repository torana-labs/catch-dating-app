part of '../event_success_compatibility_response.dart';

String eventSuccessCompatibilityResponseId({
  required String eventId,
  required String uid,
}) => '${eventId}_$uid';

bool _sameQuestions(
  List<EventSuccessCompatibilityQuestion> a,
  List<EventSuccessCompatibilityQuestion> b,
) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    final left = a[i];
    final right = b[i];
    if (left.id != right.id ||
        left.prompt != right.prompt ||
        left.options.length != right.options.length) {
      return false;
    }
    for (var j = 0; j < left.options.length; j++) {
      if (left.options[j].id != right.options[j].id ||
          left.options[j].label != right.options[j].label) {
        return false;
      }
    }
  }
  return true;
}

List<EventSuccessCompatibilityOption> _fallbackOptionsFor(String questionId) {
  final safeId = _normalizedId(questionId, fallback: 'question');
  return [
    EventSuccessCompatibilityOption(
      id: '${safeId}_option_1',
      label: EventSuccessQuestionnairePackLibrary.fallbackOption1,
    ),
    EventSuccessCompatibilityOption(
      id: '${safeId}_option_2',
      label: EventSuccessQuestionnairePackLibrary.fallbackOption2,
    ),
  ];
}

String _normalizedText(Object? value, {required String fallback}) {
  if (value is! String) return fallback;
  final normalized = value.trim();
  return normalized.isEmpty ? fallback : normalized;
}

String _normalizedId(Object? value, {required String fallback}) {
  final raw = value is String ? value : fallback;
  return _slugFrom(raw, fallback);
}

String _slugFrom(String raw, String fallback) {
  final slug = raw
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');
  if (slug.isEmpty) return fallback;
  return slug.length > 80 ? slug.substring(0, 80) : slug;
}

DateTime _requiredTimestamp(Object? value, String field) {
  return dateTimeFromFirestoreValue(value, field: field);
}
