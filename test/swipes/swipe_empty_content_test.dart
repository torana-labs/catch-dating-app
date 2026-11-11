import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_empty_content.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  group('buildSwipeEmptyContent', () {
    test('explains why an event is unavailable when missing', () {
      final content = buildSwipeEmptyContent(
        l10n: _l10n,
        event: null,
        currentUser: buildUser(),
        currentUserParticipation: null,
      );

      expect(content.title, 'Picks aren’t available');
    });

    test('explains that Catches opens after the event ends', () {
      final event = buildEvent();
      final content = buildSwipeEmptyContent(
        l10n: _l10n,
        event: event,
        currentUser: buildUser(),
        currentUserParticipation: buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
        ),
      );

      expect(content.title, 'Event in progress');
      expect(
        content.message,
        'After the event, you have 24 hours to pick people you’d like to see again.',
      );
    });

    test('explains when the user did not attend the event', () {
      final endedAt = DateTime.now().subtract(const Duration(hours: 3));
      final event = buildEvent(
        startTime: endedAt.subtract(const Duration(hours: 1)),
        endTime: endedAt,
        checkedInCount: 1,
      );
      final content = buildSwipeEmptyContent(
        l10n: _l10n,
        event: event,
        currentUser: buildUser(),
        currentUserParticipation: buildEventParticipation(
          event: event,
          uid: 'runner-1',
        ),
      );

      expect(content.title, 'Picks aren’t available');
      expect(
        content.message,
        'You can pick people from events you checked in to.',
      );
    });

    test('explains when the catch window has closed', () {
      final endedAt = DateTime.now().subtract(const Duration(hours: 26));
      final event = buildEvent(
        startTime: endedAt.subtract(const Duration(hours: 1)),
        endTime: endedAt,
      );
      final content = buildSwipeEmptyContent(
        l10n: _l10n,
        event: event,
        currentUser: buildUser(),
        currentUserParticipation: buildEventParticipation(
          event: event,
          uid: 'runner-1',
          status: EventParticipationStatus.attended,
        ),
      );

      expect(content.title, 'Picks have closed');
    });

    test(
      'falls back to the default empty message when the window is active',
      () {
        final endedAt = DateTime.now().subtract(const Duration(hours: 2));
        final event = buildEvent(
          startTime: endedAt.subtract(const Duration(hours: 1)),
          endTime: endedAt,
        );
        final content = buildSwipeEmptyContent(
          l10n: _l10n,
          event: event,
          currentUser: buildUser(),
          currentUserParticipation: buildEventParticipation(
            event: event,
            uid: 'runner-1',
            status: EventParticipationStatus.attended,
          ),
        );

        expect(content.title, defaultSwipeEmptyContent(_l10n).title);
        expect(content.message, defaultSwipeEmptyContent(_l10n).message);
      },
    );
  });
}
