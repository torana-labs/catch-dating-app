bool formOperationSetEquals<T>(Set<T> left, Set<T> right) =>
    left.length == right.length && left.containsAll(right);

Map<Object?, Object?> formOperationRequiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Map<Object?, Object?>> formOperationMapList(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('Invalid $label.');
  return value
      .map((item) => formOperationRequiredMap(item, label))
      .toList(growable: false);
}

List<String> formOperationStringList(Object? value) {
  if (value is! List<Object?> || value.any((item) => item is! String)) {
    throw const FormatException('Invalid string list.');
  }
  return value.cast<String>();
}

String formOperationRequiredString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Missing $key.');
}

String? formOperationNullableString(Object? value) =>
    value == null ? null : value as String;

int formOperationRequiredInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is int) return value;
  throw FormatException('Missing $key.');
}

int? formOperationNullableInt(Object? value) =>
    value == null ? null : value as int;

num formOperationRequiredNum(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num) return value;
  throw FormatException('Missing $key.');
}

num? formOperationNullableNum(Object? value) =>
    value == null ? null : value as num;

bool formOperationRequiredBool(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is bool) return value;
  throw FormatException('Missing $key.');
}

DateTime formOperationDateTime(Map<Object?, Object?> map, String key) =>
    DateTime.fromMillisecondsSinceEpoch(formOperationRequiredInt(map, key));

DateTime? formOperationNullableDateTime(Object? value) =>
    value == null ? null : DateTime.fromMillisecondsSinceEpoch(value as int);

T formOperationEnumByName<T extends Enum>(
  Iterable<T> values,
  String name, [
  String? label,
]) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  throw FormatException('Invalid ${label ?? 'enum'}: $name.');
}
