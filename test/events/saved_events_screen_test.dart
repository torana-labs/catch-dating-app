import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/events/presentation/saved_events_screen.dart';
import 'package:catch_dating_app/events/presentation/saved_events_state.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart' as app_router;
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../organizers/organizers_test_helpers.dart' as organizer_test;
import 'events_test_helpers.dart';

void main() {
  group('SavedEventsListState', () {
    test('orders upcoming saved events before past saved events', () {
      final now = DateTime(2026, 7, 1, 12);
      final laterUpcoming = buildEvent(
        id: 'later-upcoming',
        startTime: now.add(const Duration(days: 3)),
      );
      final nextUpcoming = buildEvent(
        id: 'next-upcoming',
        startTime: now.add(const Duration(hours: 6)),
      );
      final recentPast = buildEvent(
        id: 'recent-past',
        startTime: now.subtract(const Duration(hours: 4)),
      );
      final olderPast = buildEvent(
        id: 'older-past',
        startTime: now.subtract(const Duration(days: 4)),
      );

      final state = SavedEventsListState.from([
        olderPast,
        laterUpcoming,
        recentPast,
        nextUpcoming,
      ], now: now);

      expect(state.orderedEvents.map((event) => event.id), [
        'next-upcoming',
        'later-upcoming',
        'recent-past',
        'older-past',
      ]);
      expect(state.today, DateUtils.dateOnly(now));
      expect(state.organizerIds, [
        nextUpcoming.organizerId,
        laterUpcoming.organizerId,
        recentPast.organizerId,
        olderPast.organizerId,
      ]);
      expect(state.badgeLabelFor(nextUpcoming), 'SAVED');
      expect(state.badgeLabelFor(recentPast), 'PAST');
      expect(state.statusFor(nextUpcoming), EventTileStatus.saved);
      expect(state.statusFor(recentPast), EventTileStatus.past);
    });
  });

  group('SavedEventsScreen', () {
    testWidgets('shows loading while the auth session resolves', (
      tester,
    ) async {
      await _pumpSavedEvents(
        tester,
        uid: const AsyncLoading<String?>(),
        savedEvents: const [],
        child: const SavedEventsScreen(),
      );

      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.text('No saved events yet'), findsNothing);
    });

    testWidgets('shows an auth error when the session fails to load', (
      tester,
    ) async {
      await _pumpSavedEvents(
        tester,
        uid: AsyncError<String?>(Exception('auth failed'), StackTrace.empty),
        savedEvents: const [],
        child: const SavedEventsScreen(),
      );

      expect(find.text('Sign in problem'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text('No saved events yet'), findsNothing);
    });

    testWidgets('shows an empty state when there are no saved events', (
      tester,
    ) async {
      await _pumpSavedEvents(
        tester,
        savedEvents: const [],
        child: const SavedEventsScreen(),
      );

      expect(find.text('No saved events yet'), findsOneWidget);
      expect(
        find.text('Save events you want to revisit before booking.'),
        findsOneWidget,
      );
    });

    testWidgets('orders upcoming saved events before past saved events', (
      tester,
    ) async {
      final now = DateTime.now();
      final future = buildEvent(
        id: 'future-event',
        startTime: now.add(const Duration(days: 1)),
        meetingPoint: 'Future Park',
      );
      final past = buildEvent(
        id: 'past-event',
        startTime: now.subtract(const Duration(days: 1)),
        meetingPoint: 'Past Park',
      );

      await _pumpSavedEvents(
        tester,
        savedEvents: [past, future],
        child: SavedEventsScreen(referenceNow: now),
      );
      await tester.pump();

      expect(find.text('Saved events'), findsOneWidget);
      expect(find.text('Events you saved'), findsNothing);
      expect(find.text('STRIDE SOCIAL'), findsAtLeastNWidgets(1));
      expect(find.textContaining('SAVED', findRichText: true), findsOneWidget);
      expect(find.textContaining('PAST', findRichText: true), findsOneWidget);
      expect(
        tester.getTopLeft(find.textContaining('Future Park')).dy,
        lessThan(tester.getTopLeft(find.textContaining('Past Park')).dy),
      );
    });

    testWidgets('opens saved event detail from the list', (tester) async {
      final event = buildEvent(
        startTime: DateTime.now().add(const Duration(days: 1)),
        meetingPoint: 'Future Park',
      );
      final router = GoRouter(
        initialLocation: app_router.Routes.savedEventsScreen.path,
        routes: [
          GoRoute(
            path: app_router.Routes.savedEventsScreen.path,
            builder: (_, _) => const SavedEventsScreen(),
          ),
          GoRoute(
            path: app_router.Routes.savedEventDetailScreen.path,
            name: app_router.Routes.savedEventDetailScreen.name,
            builder: (context, state) => Scaffold(
              body: Text(
                'Event detail ${state.pathParameters['organizerId']}/${state.pathParameters['eventId']}',
              ),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);

      await _pumpSavedEvents(
        tester,
        savedEvents: [event],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      );

      await tester.tap(find.textContaining('Future Park'));
      await tester.pump();
      await tester.pump();

      expect(find.text('Event detail club-1/event-1'), findsOneWidget);
    });
  });
}

Future<void> _pumpSavedEvents(
  WidgetTester tester, {
  AsyncValue<String?> uid = const AsyncData<String?>('runner-1'),
  required List<Event> savedEvents,
  required Widget child,
}) async {
  final wrapped = child is MaterialApp || child is WidgetsApp
      ? child
      : MaterialApp(theme: AppTheme.light, home: child);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWithValue(uid),
        organizersRepositoryProvider.overrideWith(
          (ref) =>
              organizer_test.FakeOrganizersRepository()
                ..organizersById['club-1'] = buildOrganizer(),
        ),
        watchSavedEventDetailsForUserProvider(
          'runner-1',
        ).overrideWithValue(AsyncData<List<Event>>(savedEvents)),
        organizerNameLookupProvider(
          OrganizerNameLookupQuery(
            savedEvents.map((event) => event.organizerId),
          ),
        ).overrideWithValue(
          AsyncData({
            for (final event in savedEvents) event.organizerId: 'Stride Social',
          }),
        ),
      ],
      child: wrapped,
    ),
  );
  await tester.pump();
  await tester.pump();
}
