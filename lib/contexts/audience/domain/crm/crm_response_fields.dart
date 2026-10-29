Map<Object?, Object?> crmRequiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Map<Object?, Object?>> crmMapList(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('Invalid $label.');
  return value
      .map((item) => crmRequiredMap(item, label))
      .toList(growable: false);
}

List<Map<Object?, Object?>> crmOptionalMapList(Object? value, String label) =>
    value == null ? const [] : crmMapList(value, label);

List<String> crmStringList(Object? value) {
  if (value is! List<Object?> || value.any((item) => item is! String)) {
    throw const FormatException('Expected a string list.');
  }
  return value.cast<String>();
}

String crmRequiredString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Response was missing $key.');
}

String? crmNullableString(Object? value) {
  if (value == null) return null;
  if (value is String) return value;
  throw const FormatException('Expected a nullable string.');
}

int crmRequiredInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num && value >= 0) return value.toInt();
  throw FormatException('Response was missing $key.');
}

bool crmRequiredBool(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is bool) return value;
  throw FormatException('Response was missing $key.');
}

DateTime? crmDateTimeFromMillis(Object? value) {
  if (value == null) return null;
  if (value is num && value >= 0) {
    return DateTime.fromMillisecondsSinceEpoch(value.toInt());
  }
  throw const FormatException('Expected epoch milliseconds.');
}

DateTime crmRequiredDateTimeFromMillis(Map<Object?, Object?> map, String key) {
  final value = crmDateTimeFromMillis(map[key]);
  if (value != null) return value;
  throw FormatException('Response was missing $key.');
}

double? crmNullableDouble(Object? value) {
  if (value == null) return null;
  if (value is num && value >= 0 && value <= 1) return value.toDouble();
  throw const FormatException('Expected a ratio between zero and one.');
}

T crmEnumByName<T extends Enum>(List<T> values, String name, String label) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  throw FormatException('Response had invalid $label.');
}

Object crmAudienceAnswerValue(Object? value) => switch (value) {
  String() || bool() => value!,
  _ => throw const FormatException('Expected a choice or boolean answer.'),
};
