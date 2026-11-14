import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

FirebaseException _denied() =>
    FirebaseException(plugin: 'cloud_firestore', code: 'permission-denied');

void main() {
  group('watchWithPermissionFallback', () {
    test('switches to the fallback once when rules deny the primary', () async {
      var fallbacks = 0;
      final stream = watchWithPermissionFallback<String>(
        primary: () => Stream<String>.error(_denied()),
        fallback: () {
          fallbacks++;
          return Stream<String>.fromIterable(['public']);
        },
      );
      await expectLater(stream, emitsInOrder(['public', emitsDone]));
      expect(fallbacks, 1);
    });

    test('keeps the primary when it is allowed', () async {
      final stream = watchWithPermissionFallback<String>(
        primary: () => Stream<String>.fromIterable(['full']),
        fallback: () => fail('fallback must not run'),
      );
      await expectLater(stream, emitsInOrder(['full', emitsDone]));
    });

    test('forwards other errors without falling back', () async {
      final stream = watchWithPermissionFallback<String>(
        primary: () => Stream<String>.error(
          FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'),
        ),
        fallback: () => fail('fallback must not run'),
      );
      await expectLater(
        stream,
        emitsError(
          isA<FirebaseException>().having((e) => e.code, 'code', 'unavailable'),
        ),
      );
    });

    test('a denied fallback is reported, not retried', () async {
      final stream = watchWithPermissionFallback<String>(
        primary: () => Stream<String>.error(_denied()),
        fallback: () => Stream<String>.error(_denied()),
      );
      await expectLater(stream, emitsError(isA<FirebaseException>()));
    });

    test('cancelling stops the active source', () async {
      final source = StreamController<String>();
      addTearDown(source.close);
      final subscription = watchWithPermissionFallback<String>(
        primary: () => source.stream,
        fallback: () => fail('fallback must not run'),
      ).listen((_) {});
      await subscription.cancel();
      expect(source.hasListener, isFalse);
    });
  });

  group('fetchWithPermissionFallback', () {
    test('reads the fallback when rules deny', () async {
      expect(
        await fetchWithPermissionFallback<String>(
          primary: () async => throw _denied(),
          fallback: () async => 'public',
        ),
        'public',
      );
    });

    test('rethrows other errors', () async {
      await expectLater(
        fetchWithPermissionFallback<String>(
          primary: () async => throw FirebaseException(
            plugin: 'cloud_firestore',
            code: 'aborted',
          ),
          fallback: () async => 'public',
        ),
        throwsA(isA<FirebaseException>()),
      );
    });
  });
}
