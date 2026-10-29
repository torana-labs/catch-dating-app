import 'package:catch_dating_app/contexts/audience/data/host_provider_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('provider event choices preserve safe calendar and event data', () {
    final choices = HostProviderEventChoices.fromCallableData({
      'calendarName': 'Sunday Club',
      'events': [
        {
          'externalEventId': 'evt-1',
          'name': 'Sunday Social',
          'startAtMillis': DateTime.utc(2026, 8, 16, 12).millisecondsSinceEpoch,
        },
      ],
      'truncated': false,
    });

    expect(choices.calendarName, 'Sunday Club');
    expect(choices.events.single.externalEventId, 'evt-1');
    expect(choices.events.single.name, 'Sunday Social');
    expect(choices.events.single.startAt, DateTime.utc(2026, 8, 16, 12));
    expect(choices.truncated, isFalse);
  });

  test('provider setup resolves the event mapping to its connection', () {
    final setup = HostProviderSetup.fromCallableData({
      'organizerId': 'org-1',
      'eventId': 'event-1',
      'providers': [
        {
          'provider': 'luma',
          'displayName': 'Luma',
          'adapterClass': 'A',
          'availability': 'available',
          'importSupport': 'verified',
          'connectionMethod': 'apiKey',
          'capabilities': _capabilities(fileImport: true),
          'requirement': 'A calendar-scoped Luma API key and Luma Plus.',
        },
      ],
      'connections': [
        {
          'connectionId': 'connection-1',
          'provider': 'luma',
          'status': 'active',
          'externalAccountId': 'calendar-1',
          'externalAccountName': 'Sunday Club',
          'syncMode': 'manualPoll',
          'capabilities': _connectionCapabilities(),
          'revision': 2,
          'lastHealthSyncAtMillis': null,
          'lastSuccessfulSyncAtMillis': 1786526400000,
        },
      ],
      'mapping': {
        'mappingId': 'mapping-1',
        'connectionId': 'connection-1',
        'provider': 'luma',
        'externalEventId': 'evt-1',
        'status': 'active',
        'fieldAuthority': const <String, Object?>{},
        'revision': 1,
        'lastSyncAtMillis': 1786526400000,
        'lastSuccessfulSyncAtMillis': 1786526400000,
        'lastSyncStatus': 'completed',
        'lastSyncRunId': 'run-1',
      },
    });

    expect(setup.catalogFor(ExternalBookingProvider.luma)?.displayName, 'Luma');
    expect(setup.mappedConnection?.externalAccountName, 'Sunday Club');
    expect(setup.mapping?.externalEventId, 'evt-1');
  });
}

Map<String, bool> _capabilities({bool fileImport = false}) => {
  'fileImport': fileImport,
  'eventList': true,
  'rosterIdentity': true,
  'registrationStatus': true,
  'providerCheckIn': true,
  'orderAmount': false,
  'refundStatus': false,
  'referralCode': false,
  'webhooks': false,
  'writeBookings': false,
};

Map<String, bool> _connectionCapabilities() => {
  'eventList': true,
  'rosterIdentity': true,
  'registrationStatus': true,
  'providerCheckIn': true,
  'orderAmount': false,
  'refundStatus': false,
  'referralCode': false,
  'webhooks': false,
  'writeBookings': false,
};
