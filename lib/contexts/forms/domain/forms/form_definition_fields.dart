Map<Object?, Object?> formDefinitionRequiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Map<Object?, Object?>> formDefinitionMapList(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('Invalid $label.');
  return value
      .map((item) => formDefinitionRequiredMap(item, label))
      .toList(growable: false);
}

String formDefinitionRequiredString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Response was missing $key.');
}

String formDefinitionStringValue(Object? value) {
  if (value is String && value.isNotEmpty) return value;
  throw const FormatException('Expected a non-empty string.');
}

String? formDefinitionNullableString(Object? value) {
  if (value == null) return null;
  if (value is String) return value;
  throw const FormatException('Expected a nullable string.');
}

int formDefinitionRequiredInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num && value >= 0) return value.toInt();
  throw FormatException('Response was missing $key.');
}

int? formDefinitionNullableInt(Object? value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  throw const FormatException('Expected a nullable integer.');
}

num? formDefinitionNullableNum(Object? value) {
  if (value == null || value is num) return value as num?;
  throw const FormatException('Expected a nullable number.');
}

DateTime? formDefinitionNullableWireDateTime(Object? value) {
  if (value == null) return null;
  final map = formDefinitionDeepStringMap(value);
  final seconds = map['seconds'];
  final nanoseconds = map['nanoseconds'];
  if (seconds is num && nanoseconds is num) {
    return DateTime.fromMillisecondsSinceEpoch(
      seconds.toInt() * 1000 + nanoseconds.toInt() ~/ 1000000,
      isUtc: true,
    );
  }
  throw const FormatException('Expected a nullable form timestamp.');
}

Map<String, Object?>? formDefinitionWireDateTime(DateTime? value) {
  if (value == null) return null;
  final micros = value.toUtc().microsecondsSinceEpoch;
  return {
    'seconds': micros ~/ Duration.microsecondsPerSecond,
    'nanoseconds': (micros % Duration.microsecondsPerSecond) * 1000,
  };
}

DateTime formDefinitionDateTimeFromMillis(
  Map<Object?, Object?> map,
  String key,
) => DateTime.fromMillisecondsSinceEpoch(formDefinitionRequiredInt(map, key));

DateTime? formDefinitionNullableDateTimeFromMillis(Object? value) {
  if (value == null) return null;
  if (value is num && value >= 0) {
    return DateTime.fromMillisecondsSinceEpoch(value.toInt());
  }
  throw const FormatException('Expected nullable epoch milliseconds.');
}

T formDefinitionEnumByName<T extends Enum>(
  List<T> values,
  String name,
  String label,
) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  throw FormatException('Invalid $label.');
}

Map<String, Object?> formDefinitionDeepStringMap(Object? value) {
  if (value is! Map) return <String, Object?>{};
  return {
    for (final entry in value.entries)
      if (entry.key is String)
        entry.key as String: formDefinitionDeepJsonValue(entry.value),
  };
}

Object? formDefinitionDeepJsonValue(Object? value) {
  if (value is Map) return formDefinitionDeepStringMap(value);
  if (value is List) {
    return value.map(formDefinitionDeepJsonValue).toList(growable: true);
  }
  return value;
}

List<Map<String, Object?>> formDefinitionJsonList(Object? value) {
  if (value is! List) return <Map<String, Object?>>[];
  return value.map(formDefinitionDeepStringMap).toList(growable: true);
}

bool formDefinitionSetEquals<T>(Set<T> left, Set<T> right) =>
    left.length == right.length && left.containsAll(right);
