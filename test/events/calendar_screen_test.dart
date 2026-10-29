import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CalendarScreen', () {
    testWidgets('shows loading while the auth session resolves', (
      tester,
    ) async {
      await _pumpCalendar(tester, uid: const AsyncLoading<String?>());

      expect(find.byType(CatchRouteScaffold), findsOneWidget);
      expect(find.byType(CatchSkeleton), findsWidgets);
      expect(find.text('No planned events yet'), findsNothing);
    });

    testWidgets('shows an auth error when the session fails to load', (
      tester,
    ) async {
      await _pumpCalendar(
        tester,
        uid: AsyncError<String?>(Exception('auth failed'), StackTrace.empty),
      );

      expect(find.text('Sign in problem'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text('No planned events yet'), findsNothing);
    });

    testWidgets('shows a signed-out empty calendar without querying events', (
      tester,
    ) async {
      await _pumpCalendar(tester, uid: const AsyncData<String?>(null));

      expect(find.byType(CatchSkeleton), findsNothing);
      expect(find.text('No planned events yet'), findsOneWidget);
      expect(
        find.text('Events you book or save will show up here by day and time.'),
        findsOneWidget,
      );
    });

    testWidgets(
      'shows a signed-in empty calendar after event streams resolve',
      (tester) async {
        await _pumpCalendar(tester);

        expect(find.byType(CatchSkeleton), findsNothing);
        expect(find.text('No planned events yet'), findsOneWidget);
      },
    );
  });
}

Future<void> _pumpCalendar(
  WidgetTester tester, {
  AsyncValue<String?> uid = const AsyncData<String?>('runner-1'),
}) async {
  final overrides = [
    uidProvider.overrideWithValue(uid),
    watchSignedUpEventsProvider(
      'runner-1',
    ).overrideWithValue(const AsyncData<List<Event>>([])),
    watchSavedEventDetailsForUserProvider(
      'runner-1',
    ).overrideWithValue(const AsyncData<List<Event>>([])),
  ];

  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(theme: AppTheme.light, home: const CalendarScreen()),
    ),
  );
  await tester.pump();
  await tester.pump();
}
