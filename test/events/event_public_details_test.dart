import 'package:catch_dating_app/contexts/events/data/event_callable_adapters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  test('editing and clearing guest notes preserves sibling format data', () {
    final original = EventFormatSnapshot.custom(
      label: 'Hosted walk',
      interactionModel: EventInteractionModel.hostLedProgram,
      defaultModuleIds: const ['welcome'],
      activityDetails: const {
        'routePlan': {'version': 2, 'movementMode': 'walk'},
        'privateNotes': 'Host-only context',
        'publicDetails': {'requirements': 'Bring ID', 'included': 'Tea'},
      },
    );
    final saved = EventFormatSnapshot.fromJson(
      Map<String, dynamic>.from(
        original
            .withPublicDetails(
              accessibility: '  Step-free entrance  ',
              included: ' Water ',
            )
            .toJson(),
      ),
    );
    expect(saved.accessibilityNotes, 'Step-free entrance');
    expect(saved.includedNotes, 'Water');
    expect(
      saved.activityDetails['routePlan'],
      original.activityDetails['routePlan'],
    );
    expect(saved.activityDetails['privateNotes'], 'Host-only context');
    expect(saved.defaultModuleIds, ['welcome']);
    expect(saved.customActivityLabel, 'Hosted walk');
    final cleared = saved.withPublicDetails(accessibility: ' ', included: '');
    expect(cleared.accessibilityNotes, isNull);
    expect(cleared.includedNotes, isNull);
    expect(cleared.activityDetails['publicDetails'], {
      'requirements': 'Bring ID',
    });
    expect(saved.withPublicDetails().includedNotes, 'Water');
  });

  test('callable payloads carry authored notes and explicit clearing', () {
    final event = buildEvent(startingPointLat: 19.1, startingPointLng: 72.9);
    final format = event.eventFormat.withPublicDetails(
      accessibility: 'Step-free entrance',
      included: 'Equipment',
    );
    final authored = event.copyWith(eventFormat: format);
    final create = createEventCallableRequestFromEvent(authored).toJson();
    expect((create['eventFormat'] as Map)['activityDetails'], {
      ...format.activityDetails,
    });
    final cleared = authored.copyWith(
      eventFormat: format.withPublicDetails(accessibility: '', included: ''),
    );
    final update = updateEventCallableRequestFromEvent(cleared).toJson();
    final fields = update['fields'] as Map;
    final updatedFormat = fields['eventFormat'] as Map;
    expect(
      (updatedFormat['activityDetails'] as Map?)?['publicDetails'],
      isNull,
    );
  });

  test('absent notes remain absent and old drafts stay valid', () {
    final format = const EventFormatSnapshot.socialRun().withPublicDetails(
      accessibility: '',
      included: ' ',
    );
    expect(format.toJson().containsKey('activityDetails'), isFalse);
    final draft = EventDraft(
      id: 'draft',
      clubId: 'host',
      savedAt: DateTime(2026),
    );
    expect(draft.toJson().containsKey('accessibility'), isFalse);
    expect(EventDraft.fromJson(draft.toJson()).included, isNull);
    expect(draft.copyWith(included: 'Equipment').isEmpty, isFalse);
    expect(draft.copyWith(accessibility: 'Step-free').isEmpty, isFalse);
  });
}
