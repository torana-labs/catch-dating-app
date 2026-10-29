/// Strict, SDK-free readers shared by the assistance wire adapters.
Map<Object?, Object?> assistanceObject(Object? value, [Set<String>? keys]) {
  if (value is Map<Object?, Object?> &&
      value.keys.every((key) => key is String) &&
      (keys == null ||
          (value.length == keys.length && keys.every(value.containsKey)))) {
    return value;
  }
  throw const FormatException('Invalid assistance object.');
}

String assistanceText(Object? value, [int maxLength = 2000]) {
  if (value is String && value.isNotEmpty && value.length <= maxLength) {
    return value;
  }
  throw const FormatException('Invalid assistance text.');
}

String assistanceId(Object? value) {
  final text = assistanceText(value, 160);
  if (RegExp(r'^[A-Za-z0-9][A-Za-z0-9._:-]*$').hasMatch(text)) return text;
  throw const FormatException('Invalid assistance identity.');
}

String assistanceHash(Object? value) {
  if (value is String && RegExp(r'^[a-f0-9]{64}$').hasMatch(value)) {
    return value;
  }
  throw const FormatException('Invalid assistance source hash.');
}

String assistanceAlternativeId(Object? value) {
  if (value is String &&
      RegExp(r'^alternative:[a-f0-9]{64}$').hasMatch(value)) {
    return value;
  }
  throw const FormatException('Invalid route alternative identity.');
}

int assistanceInteger(Object? value) {
  if (value is num &&
      value.isFinite &&
      value >= 0 &&
      value <= 9007199254740991 &&
      value == value.truncateToDouble()) {
    return value.toInt();
  }
  throw const FormatException('Invalid assistance revision or time.');
}

int? assistanceNullableInteger(Object? value) =>
    value == null ? null : assistanceInteger(value);

bool assistanceBoolean(Object? value) {
  if (value is bool) return value;
  throw const FormatException('Invalid assistance flag.');
}

T assistanceEnum<T extends Enum>(List<T> values, Object? value) {
  for (final candidate in values) {
    if (candidate.name == value) return candidate;
  }
  throw const FormatException('Unknown assistance state.');
}
