import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

typedef FirestoreFromJson<T> = T Function(Map<String, dynamic> json);
typedef FirestoreToJson<T> = Map<String, dynamic> Function(T value);

class TimestampConverter implements JsonConverter<DateTime, Object?> {
  const TimestampConverter();

  @override
  DateTime fromJson(Object? value) => dateTimeFromFirestoreValue(value);

  @override
  Timestamp toJson(DateTime dt) => Timestamp.fromDate(dt);
}

class NullableTimestampConverter implements JsonConverter<DateTime?, Object?> {
  const NullableTimestampConverter();

  @override
  DateTime? fromJson(Object? value) {
    if (value == null) return null;
    final parsed = nullableDateTimeFromFirestoreValue(value);
    if (parsed != null) return parsed;
    throw FormatException('Expected Firestore Timestamp or null, got $value.');
  }

  @override
  Timestamp? toJson(DateTime? dt) => dt != null ? Timestamp.fromDate(dt) : null;
}

DateTime dateTimeFromFirestoreValue(Object? value, {String? field}) {
  final parsed = nullableDateTimeFromFirestoreValue(value);
  if (parsed != null) return parsed;
  final suffix = field == null ? '' : ' for "$field"';
  throw FormatException('Expected Firestore Timestamp$suffix, got $value.');
}

DateTime? nullableDateTimeFromFirestoreValue(Object? value) {
  if (value == null) return null;
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  return null;
}

Object firestoreTimestampFromDateTime(DateTime value) =>
    Timestamp.fromDate(value);

Object? firestoreCallableJsonValue(Object? value) {
  if (value is Timestamp) {
    return {'_seconds': value.seconds, '_nanoseconds': value.nanoseconds};
  }
  if (value is DateTime) {
    return firestoreCallableJsonValue(Timestamp.fromDate(value));
  }
  if (value is Iterable) {
    return value.map(firestoreCallableJsonValue).toList();
  }
  if (value is Map) {
    return value.map(
      (key, child) => MapEntry(key, firestoreCallableJsonValue(child)),
    );
  }
  return value;
}

extension DocumentIdCollectionConverter
    on CollectionReference<Map<String, dynamic>> {
  CollectionReference<T> withDocumentIdConverter<T>({
    required String idField,
    required FirestoreFromJson<T> fromJson,
    required FirestoreToJson<T> toJson,
  }) {
    return withConverter<T>(
      fromFirestore: (doc, _) {
        final data = doc.data();
        if (data == null) {
          throw StateError(
            'Missing Firestore data for ${doc.reference.path}; cannot decode $T.',
          );
        }
        return fromJson({...data, idField: doc.id});
      },
      toFirestore: (value, _) => toJson(value),
    );
  }
}
