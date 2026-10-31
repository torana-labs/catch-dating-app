import 'package:catch_dating_app/app_bootstrap.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/errors/provider_retry_policy.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _network = NetworkException('unavailable', 'Check your connection.');

void main() {
  group('catchProviderRetry', () {
    test('retries a transient failure three times with backoff', () {
      expect(
        [
          for (var count = 0; count < 4; count++)
            catchProviderRetry(count, _network),
        ],
        const [
          Duration(milliseconds: 200),
          Duration(milliseconds: 400),
          Duration(milliseconds: 800),
          null,
        ],
      );
      expect(
        catchProviderRetry(
          0,
          FirebaseException(plugin: 'cloud_functions', code: 'unavailable'),
        ),
        const Duration(milliseconds: 200),
      );
    });

    test('never retries failures a second attempt cannot fix', () {
      for (final error in <Object>[
        const PermissionException('No access.'),
        const DocumentNotFoundException('event'),
        const SignInRequiredException('load events'),
        FirebaseException(plugin: 'cloud_firestore', code: 'permission-denied'),
        StateError('bug'),
      ]) {
        expect(catchProviderRetry(0, error), isNull, reason: '$error');
      }
    });
  });

  test('the app container surfaces a permission failure at once', () async {
    final denied = FutureProvider.autoDispose<int>(
      (ref) => throw const PermissionException('No access.'),
    );
    final flaky = FutureProvider.autoDispose<int>((ref) => throw _network);
    final container = createCatchAppContainer(
      overrides: [
        errorLoggerProvider.overrideWithValue(
          ErrorLogger(shouldReportErrors: false, consoleSink: (_) {}),
        ),
      ],
    );
    addTearDown(container.dispose);
    container
      ..listen(denied, (_, _) {})
      ..listen(flaky, (_, _) {});
    await container.pump();

    expect(container.read(denied).hasError, isTrue);
    expect(container.read(denied).isLoading, isFalse);
    expect(container.read(flaky).isLoading, isTrue);
    expect(container.read(flaky).retrying, isTrue);
  });
}
