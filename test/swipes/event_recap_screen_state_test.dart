import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  group('EventRecapScreenState', () {
    test('maps loading, error, and missing event branches', () {
      expect(
        _state(
          viewModel: const CatchAsyncState<EventRecapViewModel?>.loading(),
        ),
        isA<EventRecapLoading>(),
      );

      final error = StateError('recap failed');
      final errored = _state(
        eventId: 'recap-event',
        viewModel: CatchAsyncState<EventRecapViewModel?>.error(error),
      );
      expect(errored, isA<EventRecapError>());
      expect((errored as EventRecapError).error, error);
      expect(errored.retryIntent.eventId, 'recap-event');

      expect(_state(), isA<EventRecapMissingEvent>());
    });

    test('derives hero copy, attendee rows, and open deck intent', () {
      final now = DateTime(2026, 5, 6, 12);
      final event = buildEvent(
        id: 'recap-event',
        startTime: now.subtract(const Duration(hours: 3)),
        endTime: now.subtract(const Duration(hours: 2)),
      );
      final profile = buildPublicProfile(uid: 'runner-2', name: 'Mira');

      final state = _state(
        viewModel: CatchAsyncState<EventRecapViewModel?>.data(
          EventRecapViewModel(
            event: event,
            attendeeIds: const ['runner-2', 'runner-3'],
            checkedInCount: 3,
          ),
        ),
        rosterProfiles: CatchAsyncState.data({'runner-2': profile}),
        selectedVibeIds: {'runner-3'},
        now: now,
      );

      expect(state, isA<EventRecapReady>());
      final ready = state as EventRecapReady;
      expect(ready.hero.kicker, 'WEDNESDAY MORNING RUN · COMPLETE');
      expect(ready.hero.distanceLabel, '5km');
      expect(ready.hero.activityCheckedInLabel, '5km · Easy · 3 checked in');
      expect(ready.hero.windowLabel, startsWith('Catches open until'));
      expect(ready.hasAttendees, isTrue);
      expect(ready.openDeckActionEnabled, isTrue);
      expect(ready.openDeckIntent.eventId, 'recap-event');
      expect(ready.openDeckIntent.selectedVibeIds, {'runner-3'});

      expect(ready.attendeeRows, hasLength(2));
      expect(ready.attendeeRows.first.attendeeId, 'runner-2');
      expect(ready.attendeeRows.first.displayName, 'Mira');
      expect(ready.attendeeRows.first.tooltip, 'Remember Mira');
      expect(ready.attendeeRows.first.selected, isFalse);
      expect(ready.attendeeRows.last.attendeeId, 'runner-3');
      expect(ready.attendeeRows.last.displayName, 'Guest');
      expect(ready.attendeeRows.last.tooltip, 'Remove guest');
      expect(ready.attendeeRows.last.selected, isTrue);
    });

    test('derives closed window copy and empty roster state', () {
      final now = DateTime(2026, 5, 6, 12);
      final event = buildEvent(
        id: 'closed-event',
        startTime: now.subtract(const Duration(hours: 28)),
        endTime: now.subtract(const Duration(hours: 27)),
      );

      final state = _state(
        viewModel: CatchAsyncState<EventRecapViewModel?>.data(
          EventRecapViewModel(
            event: event,
            attendeeIds: const [],
            checkedInCount: 1,
          ),
        ),
        now: now,
      );

      expect(state, isA<EventRecapReady>());
      final ready = state as EventRecapReady;
      expect(ready.hasAttendees, isFalse);
      expect(ready.attendeeRows, isEmpty);
      expect(ready.hero.windowLabel, 'Catch window closed');
      expect(ready.openDeckIntent.selectedVibeIds, isEmpty);
    });

    test('preserves profile lookup loading and error states', () {
      final event = buildEvent(id: 'recap-event');
      final viewModel = CatchAsyncState<EventRecapViewModel?>.data(
        EventRecapViewModel(
          event: event,
          attendeeIds: const ['runner-2'],
          checkedInCount: 2,
        ),
      );

      final loading =
          _state(
                viewModel: viewModel,
                rosterProfiles: const CatchAsyncState.loading(),
              )
              as EventRecapReady;
      expect(
        loading.profileLookupStatus,
        EventRecapProfileLookupStatus.loading,
      );
      expect(loading.attendeeRows, isEmpty);
      expect(loading.hasAttendees, isTrue);

      final error = StateError('profiles failed');
      final failed =
          _state(
                viewModel: viewModel,
                rosterProfiles: CatchAsyncState.error(error),
              )
              as EventRecapReady;
      expect(failed.profileLookupStatus, EventRecapProfileLookupStatus.error);
      expect(failed.profileLookupError, error);
      expect(failed.attendeeRows, isEmpty);
    });
  });
}

EventRecapScreenState _state({
  String eventId = 'event-1',
  CatchAsyncState<EventRecapViewModel?> viewModel =
      const CatchAsyncState<EventRecapViewModel?>.data(null),
  CatchAsyncState<Map<String, PublicProfile>> rosterProfiles =
      const CatchAsyncState.data(<String, PublicProfile>{}),
  Set<String> selectedVibeIds = const <String>{},
  DateTime? now,
}) {
  return buildEventRecapScreenState(
    l10n: _l10n,
    eventId: eventId,
    viewModel: viewModel,
    rosterProfiles: rosterProfiles,
    selectedVibeIds: selectedVibeIds,
    now: now,
  );
}
