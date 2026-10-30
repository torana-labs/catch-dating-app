import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_dock.dart';
import 'package:catch_dating_app/kernel/organizer_supply_capabilities.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_viewer_state_fixtures.dart';
import 'events_test_helpers.dart';

void main() {
  testWidgets('unresolved current facts never fall back to local approval', (
    tester,
  ) async {
    final pending = Completer<EventViewerState>();
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: EventDetailDock(
          event: buildEvent(),
          userProfile: buildUser(),
          clubId: 'club-1',
          participation: null,
          isOrganizerMember: true,
        ),
      ),
      overrides: [
        eventPaidBookingSupportProvider('INR').overrideWithValue(true),
        eventViewerStateProvider(
          'event-1',
          'runner-1',
        ).overrideWith((ref) => pending.future),
      ],
    );
    expect(
      tester.widget<EventBookingDock>(find.byType(EventBookingDock)).isLoading,
      isTrue,
    );
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNull,
    );
    pending.complete(
      viewerFixture(
        reason: 'membershipRequired',
        membership: 'revoked',
        review: 'approved',
      ),
    );
    await pumpUntilFound(tester, find.text('Members only'));
    expect(find.text('Members only'), findsOneWidget);
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNull,
    );
  });

  testWidgets('failed viewer reads expose retry rather than booking', (
    tester,
  ) async {
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: EventDetailDock(
          event: buildEvent(),
          userProfile: buildUser(),
          clubId: 'club-1',
          participation: null,
        ),
      ),
      overrides: [
        eventPaidBookingSupportProvider('INR').overrideWithValue(true),
        eventViewerStateProvider('event-1', 'runner-1').overrideWith(
          (ref) async => throw StateError('Synthetic unavailable read'),
        ),
      ],
    );
    await tester.pump();
    expect(find.text('Retry booking availability'), findsOneWidget);
    expect(find.text('Join event — 20 spots left'), findsNothing);
  });

  testWidgets('an old profile cannot consume another account viewer state', (
    tester,
  ) async {
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: EventDetailDock(
          event: buildEvent(),
          userProfile: buildUser(),
          clubId: 'club-1',
          participation: null,
        ),
      ),
      signedInUid: 'runner-2',
      overrides: [
        eventPaidBookingSupportProvider('INR').overrideWithValue(true),
        eventViewerStateProvider(
          'event-1',
          'runner-2',
        ).overrideWith((ref) async => viewerFixture()),
      ],
    );
    await tester.pump();
    expect(find.text('Join event — 20 spots left'), findsNothing);
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNull,
    );
  });

  testWidgets('refreshing facts cannot reuse an earlier approval', (
    tester,
  ) async {
    final pending = Completer<EventViewerState>();
    final provider = eventViewerStateProvider('event-1', 'runner-1');
    var reads = 0;
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: EventDetailDock(
          event: buildEvent(),
          userProfile: buildUser(),
          clubId: 'club-1',
          participation: null,
        ),
      ),
      overrides: [
        eventPaidBookingSupportProvider('INR').overrideWithValue(true),
        provider.overrideWith((ref) async {
          reads++;
          return reads == 1
              ? viewerFixture(review: 'approved', membership: 'active')
              : pending.future;
        }),
      ],
    );
    await pumpUntilFound(tester, find.text('Join approved event'));
    expect(find.text('Join approved event'), findsOneWidget);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(EventDetailDock)),
    );
    container.invalidate(provider);
    await tester.pump();
    expect(
      tester.widget<EventBookingDock>(find.byType(EventBookingDock)).isLoading,
      isTrue,
    );
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNull,
    );
    pending.complete(
      viewerFixture(reason: 'membershipRequired', membership: 'revoked'),
    );
    await pumpUntilFound(tester, find.text('Members only'));
    expect(find.text('Members only'), findsOneWidget);
  });

  testWidgets('a late response from the previous account stays closed', (
    tester,
  ) async {
    final auth = StreamController<String?>();
    final profile = ValueNotifier<UserProfile>(buildUser());
    final first = Completer<EventViewerState>();
    final second = Completer<EventViewerState>();
    addTearDown(() => unawaited(auth.close()));
    addTearDown(profile.dispose);
    auth.add('runner-1');
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: ValueListenableBuilder<UserProfile>(
          valueListenable: profile,
          builder: (context, user, child) => EventDetailDock(
            event: buildEvent(),
            userProfile: user,
            clubId: 'club-1',
            participation: null,
          ),
        ),
      ),
      signedInUid: null,
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventPaidBookingSupportProvider('INR').overrideWithValue(true),
        eventViewerStateProvider(
          'event-1',
          'runner-1',
        ).overrideWith((ref) => first.future),
        eventViewerStateProvider(
          'event-1',
          'runner-2',
        ).overrideWith((ref) => second.future),
      ],
    );
    auth.add('runner-2');
    await tester.pump();
    first.complete(viewerFixture(review: 'approved', membership: 'active'));
    await tester.pump();
    expect(find.text('Join approved event'), findsNothing);
    profile.value = buildUser(uid: 'runner-2');
    second.complete(
      viewerFixture(reason: 'membershipRequired', membership: 'revoked'),
    );
    await pumpUntilFound(tester, find.text('Members only'));
    expect(find.text('Members only'), findsOneWidget);
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
      isNull,
    );
  });

  testWidgets('completed cancellation refreshes current authority', (
    tester,
  ) async {
    final repository = FakeEventRepository();
    final event = buildEvent();
    var reads = 0;
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: EventDetailDock(
          event: event,
          userProfile: buildUser(),
          clubId: 'club-1',
          participation: buildEventParticipation(event: event, uid: 'runner-1'),
        ),
      ),
      overrides: [
        eventRepositoryProvider.overrideWithValue(repository),
        eventPaidBookingSupportProvider('INR').overrideWithValue(true),
        eventViewerStateProvider('event-1', 'runner-1').overrideWith((
          ref,
        ) async {
          reads++;
          return reads == 1
              ? viewerFixture(admission: 'nativeParticipation')
              : viewerFixture(
                  reason: 'membershipRequired',
                  membership: 'revoked',
                );
        }),
      ],
    );
    await pumpUntilFound(tester, find.text('Cancel booking'));
    await tester.tap(find.text('Cancel booking'));
    await pumpUntilFound(tester, find.text('Members only'));
    expect(repository.cancelledEventId, event.id);
    expect(reads, 2);
    expect(find.text('Cancel booking'), findsNothing);
    expect(find.text('Members only'), findsOneWidget);
  });

  testWidgets('unclaimed supply does not start a private viewer read', (
    tester,
  ) async {
    var reads = 0;
    await pumpEventsTestApp(
      tester,
      Scaffold(
        bottomNavigationBar: EventDetailDock(
          event: buildEvent(),
          userProfile: buildUser(),
          clubId: 'club-1',
          participation: null,
          organizerCapabilities:
              const OrganizerSupplyCapabilities.unclaimedReadOnly(),
        ),
      ),
      overrides: [
        eventViewerStateProvider('event-1', 'runner-1').overrideWith((
          ref,
        ) async {
          reads++;
          return viewerFixture();
        }),
      ],
    );
    expect(reads, 0);
    expect(find.byType(EventBookingDock), findsNothing);
  });

  test(
    'a foreign local account key fails before reading the repository',
    () async {
      final repository = _ViewerRepository();
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-2')),
          eventRepositoryProvider.overrideWithValue(repository),
        ],
        retry: (count, error) => null,
      );
      addTearDown(container.dispose);
      final auth = container.listen(uidProvider, (_, _) {});
      addTearDown(auth.close);
      await container.read(uidProvider.future);
      final viewer = eventViewerStateProvider('event-1', 'runner-1');
      final subscription = container.listen(viewer, (_, _) {});
      addTearDown(subscription.close);
      await expectLater(container.read(viewer.future), throwsStateError);
      expect(repository.reads, 0);
    },
  );
}

class _ViewerRepository extends FakeEventRepository {
  int reads = 0;
  @override
  Future<EventViewerState> fetchViewerState({
    required String eventId,
    String? inviteCode,
    String? publicPaymentId,
  }) async {
    reads++;
    return viewerFixture(eventId: eventId);
  }
}
