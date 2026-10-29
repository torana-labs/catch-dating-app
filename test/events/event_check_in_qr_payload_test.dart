import 'package:catch_dating_app/contexts/bookings/domain/event_check_in_qr_payload.dart';
import 'package:catch_dating_app/events/shared/event_check_in_qr_scanner.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('event check-in QR payload round trips event id', () {
    const payload = EventCheckInQrPayload(eventId: 'event-1');

    final parsed = EventCheckInQrPayload.tryParse(payload.encode());

    expect(parsed?.eventId, 'event-1');
  });

  test('event check-in QR payload rejects unrelated codes', () {
    expect(EventCheckInQrPayload.tryParse('not json'), isNull);
    expect(EventCheckInQrPayload.tryParse('{"kind":"other","v":1}'), isNull);
  });

  test(
    'event check-in QR scan classifier keeps scanner plugin details hidden',
    () {
      const payload = EventCheckInQrPayload(eventId: 'event-1');

      expect(
        classifyEventCheckInQrCode(payload.encode(), eventId: 'event-1'),
        EventCheckInQrScanResult.printableJoinOnly,
      );
      expect(
        classifyEventCheckInQrCode(payload.encode(), eventId: 'event-2'),
        EventCheckInQrScanResult.wrongEvent,
      );
      expect(
        classifyEventCheckInQrCode('not json', eventId: 'event-1'),
        EventCheckInQrScanResult.invalid,
      );
      expect(
        classifyEventCheckInQrCode(null, eventId: 'event-1'),
        EventCheckInQrScanResult.ignored,
      );
    },
  );

  test('only a live venue-session QR yields attendance authority', () {
    const token =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const livePayload = EventVenueSessionQrPayload(
      eventId: 'event-1',
      venueSessionToken: token,
    );

    final scan = parseEventCheckInQrCode(
      livePayload.encode(
        runtimeJoinUri: Uri.parse('https://catch.example/join/runtime-id'),
      ),
      eventId: 'event-1',
    );

    expect(scan.result, EventCheckInQrScanResult.matchedVenueSession);
    expect(scan.venueSessionToken, token);
  });
}
