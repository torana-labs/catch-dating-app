import 'dart:async';

import 'package:catch_dating_app/auth/presentation/auth_session_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/platform/cache/cache_tags.dart';
import 'package:catch_dating_app/platform/cache/firestore_cache_wipe.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the wipe terminates, then clears persistence, then goes on', () async {
    final log = <String>[];
    var reloads = 0;
    final wipe = FirestoreCacheWipe(
      firestore: () => _RecordingFirestore(log),
      logger: ErrorLogger.silent(),
      reload: () => reloads++,
    );

    await wipe.afterSignOut();

    expect(log, ['terminate', 'clearPersistence']);
    expect(reloads, 0);
  });

  test('a read that restarts Firestore mid-wipe gets one retry', () async {
    final log = <String>[];
    final wipe = FirestoreCacheWipe(
      firestore: () => _RecordingFirestore(log, refuseClears: 1),
      logger: ErrorLogger.silent(),
    );

    await wipe.afterSignOut();

    expect(log, [
      'terminate',
      'clearPersistence refused',
      'terminate',
      'clearPersistence',
    ]);
  });

  test(
    'a failed wipe is reported, never thrown, and the web reloads',
    () async {
      final log = <String>[];
      final reports = <String>[];
      var reloads = 0;
      final wipe = FirestoreCacheWipe(
        firestore: () => _RecordingFirestore(log, refuseClears: 2),
        logger: ErrorLogger.silent(
          crashReporter: _RecordingCrashReporter(reports),
          shouldReportErrors: true,
        ),
        reloadPageAfterWipe: true,
        reload: () => reloads++,
      );

      await wipe.afterSignOut();

      expect(reports, [
        'Could not wipe the on-device Firestore cache at sign-out',
      ]);
      expect(reloads, 1);
    },
  );

  test('without a started Firestore there is nothing to wipe', () async {
    var reloads = 0;
    final wipe = FirestoreCacheWipe(
      firestore: () => null,
      logger: ErrorLogger.silent(),
      reloadPageAfterWipe: true,
      reload: () => reloads++,
    );

    await wipe.afterSignOut();

    expect(reloads, 0);
  });

  test('calls during a wipe share it', () async {
    final log = <String>[];
    final gate = Completer<void>();
    final wipe = FirestoreCacheWipe(
      firestore: () => _RecordingFirestore(log, terminateGate: gate.future),
      logger: ErrorLogger.silent(),
    );

    final first = wipe.afterSignOut();
    final second = wipe.afterSignOut();
    gate.complete();
    await Future.wait([first, second]);

    expect(log, ['terminate', 'clearPersistence']);
  });

  group('sign-out', () {
    late List<String> log;
    late ProviderContainer container;

    setUp(() {
      log = <String>[];
      container = ProviderContainer.test(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            _RecordingAuthRepository(log),
          ),
          firestoreCacheWipeProvider.overrideWithValue(
            FirestoreCacheWipe(
              firestore: () => _RecordingFirestore(log),
              logger: ErrorLogger.silent(),
            ),
          ),
        ],
      );
    });

    test('both apps sign out through one path that wipes after the account '
        'has signed out and replaces the tag registry', () async {
      final registry = container.read(cacheTagsProvider);

      await container.read(authSessionControllerProvider.notifier).signOut();

      expect(log, ['auth signOut', 'terminate', 'clearPersistence']);
      expect(container.read(cacheTagsProvider), isNot(same(registry)));
    });

    test('account deletion, which signs out elsewhere, wipes too', () async {
      container
          .read(authSessionControllerProvider.notifier)
          .clearLocalFlowState();
      await pumpEventQueue();

      expect(log, ['terminate', 'clearPersistence']);
    });
  });
}

final class _RecordingFirestore extends Fake implements FirebaseFirestore {
  _RecordingFirestore(this.log, {this.refuseClears = 0, this.terminateGate});

  final List<String> log;
  final Future<void>? terminateGate;
  int refuseClears;

  @override
  Future<void> terminate() async {
    await terminateGate;
    log.add('terminate');
  }

  @override
  Future<void> clearPersistence() async {
    if (refuseClears > 0) {
      refuseClears--;
      log.add('clearPersistence refused');
      throw FirebaseException(
        plugin: 'cloud_firestore',
        code: 'failed-precondition',
      );
    }
    log.add('clearPersistence');
  }
}

final class _RecordingAuthRepository extends Fake implements AuthRepository {
  _RecordingAuthRepository(this.log);

  final List<String> log;

  @override
  Future<void> signOut() async => log.add('auth signOut');
}

final class _RecordingCrashReporter implements CrashReporter {
  _RecordingCrashReporter(this.reasons);

  final List<String> reasons;

  @override
  Future<void> recordError(
    Object error,
    StackTrace stackTrace, {
    bool fatal = false,
    String? reason,
  }) async => reasons.add(reason ?? '$error');

  @override
  Future<void> recordFlutterError(
    FlutterErrorDetails details, {
    bool fatal = false,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setCustomKey(String key, Object value) async {}
}
