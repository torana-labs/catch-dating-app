import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_event_cards_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// Marking the activity read can fail after the person has left the screen.
// The failure must still be logged: the screen's WidgetRef is gone by then,
// so the logger is read before the write starts.

void main() {
  testWidgets('a mark-read failure that lands after the screen closes is '
      'logged', (tester) async {
    final write = Completer<void>();
    final repository = _Repository(write.future);
    final logger = _RecordingLogger();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData<String?>('runner-1')),
        activityNotificationRepositoryProvider.overrideWithValue(repository),
        watchSignedUpEventCardsProvider(
          'runner-1',
        ).overrideWithValue(const AsyncData(<GuestEventCard>[])),
        errorLoggerProvider.overrideWithValue(logger),
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: const ActivityScreen(),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await pumpFeatureUi(tester);

    await tester.tap(find.text('Mark all read'));
    await tester.pump();
    expect(repository.calls, 1);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const SizedBox()),
    );
    write.completeError(StateError('offline'));
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(logger.errors, hasLength(1));
    // Let the mutation's own timers run out before the test ends.
    await pumpFeatureUiFor(tester, const Duration(minutes: 1));
  });
}

class _Repository extends Fake implements ActivityNotificationRepository {
  _Repository(this.write);

  final Future<void> write;
  var calls = 0;

  @override
  Stream<List<ActivityNotification>> watchActivity({
    required String uid,
    int limit = 50,
  }) => Stream.value([
    ActivityNotification(
      id: 'unread',
      uid: uid,
      type: ActivityNotificationType.match,
      title: 'You picked each other',
      body: 'You and Runner Two matched. Say hi!',
      createdAt: DateTime(2026, 5, 16, 10),
      matchId: 'match-1',
    ),
  ]);

  @override
  Future<void> markAllRead({
    required String uid,
    required Iterable<ActivityNotification> notifications,
  }) {
    calls++;
    return write;
  }
}

class _RecordingLogger extends ErrorLogger {
  _RecordingLogger() : super.silent();

  final errors = <Object?>[];

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) => errors.add(error);
}
