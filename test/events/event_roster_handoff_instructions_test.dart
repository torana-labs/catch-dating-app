import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses provider-aware roster forwarding instructions', () {
    final instructions = EventRosterHandoffInstructions.fromCallableData({
      'eventId': 'event-1',
      'expiresAtMillis': 1787594400000,
      'emailStatus': 'available',
      'emailAlias': 'roster+token@inbound.${Brand.webDomain}',
      'whatsappStatus': 'providerSetupRequired',
      'whatsappNumber': null,
      'whatsappMessage': null,
    });

    expect(instructions.eventId, 'event-1');
    expect(instructions.hasAvailableChannel, isTrue);
    expect(instructions.emailStatus, EventRosterHandoffChannelStatus.available);
    expect(instructions.whatsappNumber, isNull);
  });

  test('keeps unavailable provider setup explicit', () {
    final instructions = EventRosterHandoffInstructions.fromCallableData({
      'eventId': 'event-1',
      'expiresAtMillis': 1787594400000,
      'emailStatus': 'providerSetupRequired',
      'emailAlias': null,
      'whatsappStatus': 'providerSetupRequired',
      'whatsappNumber': null,
      'whatsappMessage': null,
    });

    expect(instructions.hasAvailableChannel, isFalse);
  });
}
