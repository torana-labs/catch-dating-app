import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../events/events_test_helpers.dart';

void main() {
  group('CreateEventScreen', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    testWidgets('route blocks users outside the club host team', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        HostCreateEventRouteScreen(
          organizerId: 'club-1',
          initialOrganizer: buildOrganizer(),
        ),
      );
      await tester.pump();
      expect(find.text('Host access required'), findsOneWidget);
      expect(
        find.text(
          "Only this organizer's host team can create events for this organizer.",
        ),
        findsOneWidget,
      );
      expect(find.text('Event basics'), findsNothing);
    });

    testWidgets('route hydrates the create flow from initial club extra', (
      tester,
    ) async {
      final initialOrganizer = buildOrganizer(
        id: 'club-extra',
        name: 'Extra Hydration Club',
      );

      await pumpEventsTestApp(
        tester,
        HostCreateEventRouteScreen(
          organizerId: initialOrganizer.id,
          initialOrganizer: initialOrganizer,
        ),
        overrides: [
          watchOrganizerProvider(
            initialOrganizer.id,
          ).overrideWithValue(const AsyncLoading<Organizer?>()),
        ],
        signedInUid: 'host-1',
      );
      await _pumpTestAnimation(tester);

      expect(find.byType(CreateScreen), findsOneWidget);
      expect(find.text('Loading club'), findsNothing);
      expect(find.text('Host access required'), findsNothing);
    });

    testWidgets('route rejects an initial club that disagrees with its path', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        HostCreateEventRouteScreen(
          organizerId: 'path-club',
          initialOrganizer: buildOrganizer(id: 'extra-club'),
        ),
        signedInUid: 'host-1',
      );
      await tester.pump();

      expect(find.text('Event setup unavailable'), findsOneWidget);
      expect(
        find.text('That organizer does not match this event route.'),
        findsOneWidget,
      );
      expect(find.text('Event basics'), findsNothing);
    });
  });
}

Future<void> _pumpTestAnimation(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}
