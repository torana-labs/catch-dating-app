import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_venue_session.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_participants_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../events/events_test_helpers.dart';

void main() {
  testWidgets('Host QR carries a live session while share remains static', (
    tester,
  ) async {
    const runtimeId = 'runtime_123456789012345678901234';
    const token =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    final event = buildEvent().copyWith(
      runtimeAccess: const EventRuntimeAccess(
        enabled: true,
        publicRuntimeId: runtimeId,
        walkInPolicy: EventRuntimeWalkInPolicy.deny,
        termsVersion: 'event-runtime-v1',
      ),
    );
    await pumpEventsTestApp(
      tester,
      HostEventCheckInQrSection(event: event),
      overrides: [
        eventVenueSessionProvider(event.id).overrideWith(
          (ref) => Stream.value(
            const EventVenueSession(
              eventId: 'event-1',
              venueSessionToken: token,
              expiresAtMillis: 2000,
              refreshAfterMillis: 1000,
            ),
          ),
        ),
      ],
      signedInUid: 'host-1',
    );
    await tester.pump();

    final qrData = hostEventVenueQrData(event: event, venueSessionToken: token);
    expect(qrData, contains('#eventId=event-1&venueSession='));
    expect(qrData, contains(token));
    expect(qrData, isNot(event.runtimeJoinUri().toString()));
    expect(
      find.byKey(const ValueKey('host_event_live_qr_2000')),
      findsOneWidget,
    );
    expect(find.byType(QrImageView), findsOneWidget);
    expect(find.text('Share attendee link'), findsOneWidget);
  });
}
