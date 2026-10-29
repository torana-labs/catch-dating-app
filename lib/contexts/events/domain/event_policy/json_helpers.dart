part of '../event_policy.dart';

T _enumFromName<T extends Enum>(List<T> values, Object? value, T fallback) {
  if (value is! String) return fallback;
  return values.firstWhere(
    (entry) => entry.name == value,
    orElse: () => fallback,
  );
}

Map<String, dynamic>? _mapValue(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, value) => MapEntry(key.toString(), value));
  }
  return null;
}

List<Object?> _listValue(Object? value) {
  if (value is List<Object?>) return value;
  if (value is List) return value.cast<Object?>();
  return const [];
}

Map<String, int> _intMap(Object? value) {
  final map = _mapValue(value);
  if (map == null) return const {};
  return {
    for (final entry in map.entries)
      if (entry.value is num) entry.key: (entry.value as num).round(),
  };
}

int _intValue(Object? value, {required int fallback}) {
  if (value is int) return value;
  if (value is num) return value.round();
  return fallback;
}

String? _stringValue(Object? value) => value is String ? value : null;

bool _boolValue(Object? value) => value is bool && value;
