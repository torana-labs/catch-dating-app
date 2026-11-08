import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/hosts/create/create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_participants_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_roster_section.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';
import 'host_control_room_test_helpers.dart';

part 'host_create_event_lifecycle_tests.dart';
part 'host_manage_from_create_event_tests.dart';

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
          fetchOrganizerProvider(
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

    _registerHostManageFromCreateEventTests();
  });
}

Future<void> _pumpTestAnimation(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

Future<void> _pumpHostActionFrame(WidgetTester tester) async {
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 300));
}

Finder _dialogAction(String label) {
  return find.descendant(
    of: find.byType(Dialog),
    matching: find.widgetWithText(CatchButton, label),
  );
}
