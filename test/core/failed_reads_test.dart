import 'package:catch_dating_app/platform/riverpod_ui/failed_reads.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

var _sessionBuilds = 0;
var _keyedAttempts = 0;

final _session = StreamProvider<String>((ref) {
  _sessionBuilds += 1;
  return Stream.value('uid-a');
});

final _keyedRead = StreamProvider.autoDispose.family<int, String>((ref, key) {
  _keyedAttempts += 1;
  return _keyedAttempts == 1
      ? Stream.error(StateError('unavailable'))
      : Stream.value(7);
});

// Shaped like the app's view models: it keys a read from data it loaded and
// passes that read's error through as a value.
final _composition = Provider.autoDispose<AsyncValue<int>>((ref) {
  final uid = ref.watch(_session);
  if (!uid.hasValue) return const AsyncLoading();
  return ref.watch(_keyedRead('key-from-${uid.requireValue}'));
});

void main() {
  setUp(() {
    _sessionBuilds = 0;
    _keyedAttempts = 0;
  });

  test('records the keyed read that failed, and only that read', () async {
    final container = ProviderContainer(
      observers: const [FailedReadRecorder()],
      retry: (_, _) => null,
    );
    addTearDown(container.dispose);
    final subscription = container.listen(_composition, (_, _) {});
    addTearDown(subscription.close);

    Future<void> settle() async {
      await flushTestEventQueue();
      await container.pump();
    }

    await settle();
    final error = subscription.read().error!;
    expect(readsThatFailedWith(error), [_keyedRead('key-from-uid-a')]);

    container.invalidate(_composition);
    await settle();
    expect(
      subscription.read().hasError,
      isTrue,
      reason: 'rebuilding the composition re-reads the cached failure',
    );

    readsThatFailedWith(error).forEach(container.invalidate);
    await settle();
    expect(subscription.read().value, 7);
    expect(_keyedAttempts, 2);
    expect(_sessionBuilds, 1);
  });

  test('a failure Expando cannot key has no recorded read', () {
    expect(readsThatFailedWith('permission-denied'), isEmpty);
    expect(readsThatFailedWith(404), isEmpty);
  });

  testWidgets('a screen Retry re-runs the failed read and recovers', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        observers: const [FailedReadRecorder()],
        retry: (_, _) => null,
        child: MaterialApp(
          home: Consumer(
            builder: (context, ref, _) => switch (ref.watch(_composition)) {
              AsyncData(:final value) => Text('Loaded $value'),
              AsyncError(:final error) => TextButton(
                onPressed: () =>
                    ref.retryFailedReads(error, composition: _composition),
                child: const Text('Retry'),
              ),
              _ => const Text('Loading'),
            },
          ),
        ),
      ),
    );
    await pumpUntilFound(tester, find.text('Retry'));

    await tester.tap(find.text('Retry'));
    await pumpUntilFound(tester, find.text('Loaded 7'));

    expect(find.text('Loaded 7'), findsOneWidget);
    expect(_sessionBuilds, 1);
  });
}
