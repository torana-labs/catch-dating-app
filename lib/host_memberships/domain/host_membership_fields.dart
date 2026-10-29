/// Strict readers for paid host membership documents and callable responses.
///
/// Server contracts own these shapes; a malformed value is a [FormatException]
/// rather than a silently defaulted membership fact.
Map<Object?, Object?> membershipMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

String membershipString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Missing $key.');
}

String? membershipNullableString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value == null || value is String) return value as String?;
  throw FormatException('Invalid $key.');
}

int membershipInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num && value >= 0 && value.toInt() == value) {
    return value.toInt();
  }
  throw FormatException('Missing $key.');
}

int? membershipNullableInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value == null) return null;
  if (value is num && value >= 0 && value.toInt() == value) {
    return value.toInt();
  }
  throw FormatException('Invalid $key.');
}

bool membershipBool(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is bool) return value;
  throw FormatException('Missing $key.');
}

DateTime? membershipDateTime(Map<Object?, Object?> map, String key) {
  final millis = membershipNullableInt(map, key);
  return millis == null ? null : DateTime.fromMillisecondsSinceEpoch(millis);
}

T membershipEnum<T extends Enum>(
  List<T> values,
  String wire,
  String Function(T value) wireOf,
) => values.firstWhere(
  (value) => wireOf(value) == wire,
  orElse: () => throw FormatException('Unknown value $wire.'),
);
