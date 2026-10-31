import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/event_focus_list.dart';
import 'package:catch_dating_app/events/shared/event_check_in_qr_scanner.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/events/event_viewer_state_fixtures.dart';
import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';

void main() {
  ensureAppShellTestBinding();

  testWidgets('dashboard next-event card opens event detail', (tester) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final run = event_helpers.buildEvent(
      id: 'run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().add(const Duration(hours: 3)),
      meetingPoint: 'Carter Road Amphitheatre',
      bookedCount: 1,
    );

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        signedUpEvents: [run],
        eventViewerStates: [
          viewerFixture(
            eventId: run.id,
            organizerId: run.organizerId,
            admission: 'nativeParticipation',
          ),
        ],
      ),
    );

    await tester.tap(find.byKey(EventFocusList.actionKey('viewEvent')));
    await pumpAppShellFrames(tester);

    expect(find.text('Carter Road Amphitheatre'), findsWidgets);
    expect(find.text('Cancel booking'), findsOneWidget);
  });

  testWidgets('dashboard self check-in records attendance', (tester) async {
    final user = buildSocialReadyUser(name: 'Suvrat Garg');
    final organizer = organizer_helpers.buildOrganizer();
    final run = event_helpers.buildEvent(
      id: 'check-in-run-1',
      organizerId: organizer.id,
      startTime: DateTime.now().add(const Duration(minutes: 5)),
      endTime: DateTime.now().add(const Duration(hours: 1)),
      meetingPoint: 'Carter Road Amphitheatre',
      bookedCount: 1,
    );
    final eventRepository = event_helpers.FakeEventRepository();

    await pumpCatchAppShell(
      tester,
      overrides: appShellTestOverrides(
        uid: user.uid,
        user: user,
        organizers: [organizer],
        joinedOrganizerIds: {organizer.id},
        signedUpEvents: [run],
        eventRepository: eventRepository,
      ),
    );

    expect(find.text('Check-in open'), findsOneWidget);
    await tester.tap(find.byKey(EventFocusList.actionKey('checkIn')));
    await tester.pump();
    final scanner = tester.widget<EventCheckInQrScanner>(
      find.byType(EventCheckInQrScanner),
    );
    scanner.onResult(
      const EventCheckInQrScan(
        EventCheckInQrScanResult.matchedVenueSession,
        venueSessionToken: 'signed-venue-session',
      ),
    );
    await flushAppShellCallbacks(tester);
    await pumpAppShellFrames(tester);

    expect(eventRepository.selfCheckedInEventId, run.id);
    expect(
      eventRepository.selfCheckedInVenueSessionToken,
      'signed-venue-session',
    );
    expect(find.text('CHECKED IN'), findsOneWidget);
    expect(find.text('Checked in.'), findsOneWidget);
  });
}
