import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_ticket_code_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the ticket responses decode strictly', () {
    final ticket = eventTicketFromCallableData({
      'eventId': 'event-1',
      'attendeeId': 'att-1',
      'ticketCode': 'code',
    });
    expect(ticket.eventId, 'event-1');
    expect(ticket.ticketCode, 'code');
    expect(
      () => eventTicketFromCallableData({
        'eventId': 'event-1',
        'attendeeId': 'att-1',
        'ticketCode': 'code',
        'extra': true,
      }),
      throwsFormatException,
    );

    final resolved = EventTicketResolution.fromCallableData({
      'eventId': 'event-1',
      'attendeeId': 'att-1',
      'displayName': 'Asha Rao',
      'status': 'checkedIn',
      'attendanceRevision': 3,
      'partySize': 2,
    });
    expect(resolved.status, EventAttendeeStatus.checkedIn);
    expect(resolved.isCheckedIn, isTrue);
    expect(resolved.partySize, 2);
    expect(
      () => EventTicketResolution.fromCallableData({
        'eventId': 'event-1',
        'attendeeId': 'att-1',
        'displayName': 'Asha Rao',
        'status': 'cancelled',
        'attendanceRevision': 3,
        'partySize': 2,
      }),
      throwsFormatException,
    );
  });

  testWidgets('a door row says how many places a guest holds', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) => Column(
            children: [
              Text(
                hostDoorGuestMeta(
                  context,
                  const HostDoorGuest(
                    attendeeId: 'dp',
                    name: 'Dev Patel',
                    status: HostDoorGuestStatus.arriving,
                    partySize: 3,
                    paidMinor: 99800,
                    paidCurrency: 'INR',
                  ),
                ),
              ),
              Text(
                hostDoorGuestMeta(
                  context,
                  const HostDoorGuest(
                    attendeeId: 'rk',
                    name: 'Rhea Kapoor',
                    status: HostDoorGuestStatus.arriving,
                    paidMinor: 50000,
                    paidCurrency: 'INR',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('3 places · paid ₹998'), findsOneWidget);
    expect(find.text('paid ₹500'), findsOneWidget);
  });
}
