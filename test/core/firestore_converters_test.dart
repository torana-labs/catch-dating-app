import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Firestore timestamp helpers', () {
    test('parse DateTime and Timestamp values', () {
      final date = DateTime.utc(2026, 7, 2, 12, 30);
      final timestamp = Timestamp.fromDate(date);

      expect(dateTimeFromFirestoreValue(date), date);
      expect(dateTimeFromFirestoreValue(timestamp).toUtc(), date);
      expect(nullableDateTimeFromFirestoreValue(null), isNull);
      expect(nullableDateTimeFromFirestoreValue(timestamp)?.toUtc(), date);
    });

    test('serialize nested callable JSON timestamp values', () {
      final date = DateTime.fromMillisecondsSinceEpoch(1500, isUtc: true);

      expect(firestoreCallableJsonValue(date), {
        '_seconds': 1,
        '_nanoseconds': 500000000,
      });
      expect(
        firestoreCallableJsonValue({
          'items': [
            {'createdAt': Timestamp.fromDate(date)},
          ],
        }),
        {
          'items': [
            {
              'createdAt': {'_seconds': 1, '_nanoseconds': 500000000},
            },
          ],
        },
      );
    });
  });
}
