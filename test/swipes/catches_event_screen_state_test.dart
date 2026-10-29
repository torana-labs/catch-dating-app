import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/swipes/presentation/catches_event_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_empty_content.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  group('CatchesEventScreenState', () {
    test('maps queue loading and error states', () {
      expect(
        _state(queue: const CatchAsyncState<List<PublicProfile>>.loading()),
        isA<CatchesEventQueueLoading>(),
      );

      final error = StateError('queue failed');
      final errored = _state(
        queue: CatchAsyncState<List<PublicProfile>>.error(error),
      );
      expect(errored, isA<CatchesEventQueueError>());
      expect((errored as CatchesEventQueueError).error, error);
    });

    test('derives empty copy from event, user, participation, and clock', () {
      final now = DateTime(2026, 1, 1, 12);
      final endedAt = now.subtract(const Duration(hours: 2));
      final event = buildEvent(
        startTime: endedAt.subtract(const Duration(hours: 1)),
        endTime: endedAt,
      );
      final user = buildUser();

      final state = _state(
        event: CatchAsyncState<Event?>.data(event),
        currentUser: CatchAsyncState<UserProfile?>.data(user),
        currentUserParticipation: CatchAsyncState<EventParticipation?>.data(
          buildEventParticipation(
            event: event,
            uid: 'runner-1',
            status: EventParticipationStatus.attended,
          ),
        ),
        now: now,
      );

      expect(state, isA<CatchesEventEmpty>());
      expect(
        (state as CatchesEventEmpty).content.title,
        defaultSwipeEmptyContent(_l10n).title,
      );
    });

    test('keeps sign-in copy explicit when user data is unavailable', () {
      final state = _state(
        event: CatchAsyncState<Event?>.data(buildEvent()),
        currentUser: const CatchAsyncState<UserProfile?>.loading(),
      );

      expect(state, isA<CatchesEventEmpty>());
      expect((state as CatchesEventEmpty).content.title, 'Sign in required');
    });

    test('derives ready deck display data from queue and enrichment data', () {
      final event = buildEvent();
      final viewer = buildUser();
      final first = buildPublicProfile(uid: 'runner-2', name: 'Mira');
      final second = buildPublicProfile(uid: 'runner-3', name: 'Kabir');

      final state = _state(
        queue: CatchAsyncState<List<PublicProfile>>.data([first, second]),
        event: CatchAsyncState<Event?>.data(event),
        currentUser: CatchAsyncState<UserProfile?>.data(viewer),
      );

      expect(state, isA<CatchesEventReady>());
      final ready = state as CatchesEventReady;
      expect(ready.profile.uid, 'runner-2');
      expect(ready.remainingCount, 2);
      expect(ready.viewerProfile?.uid, 'runner-1');
      expect(ready.sharedRunTitle, event.title);
    });
  });
}

CatchesEventScreenState _state({
  CatchAsyncState<List<PublicProfile>> queue =
      const CatchAsyncState<List<PublicProfile>>.data([]),
  CatchAsyncState<Event?> event = const CatchAsyncState<Event?>.data(null),
  CatchAsyncState<UserProfile?> currentUser =
      const CatchAsyncState<UserProfile?>.data(null),
  CatchAsyncState<EventParticipation?>? currentUserParticipation,
  DateTime? now,
}) {
  return buildCatchesEventScreenState(
    l10n: _l10n,
    queue: queue,
    event: event,
    currentUser: currentUser,
    currentUserParticipation: currentUserParticipation,
    now: now,
  );
}
