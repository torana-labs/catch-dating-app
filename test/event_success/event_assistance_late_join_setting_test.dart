import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_assistance_late_join_setting_fixtures.dart';

void main() {
  final responseSchema = JsonSchema.create(
    contractSchema('EventAssistanceSettingCallableResponse'),
  );
  final commandSchema = JsonSchema.create(
    contractSchema('SetEventAssistanceSettingCallablePayload'),
  );
  LateJoinSettingView read(
    Map<String, Object?> value, {
    String groupId = 'event:whole',
  }) {
    expect(responseSchema.validate(value).isValid, isTrue);
    return LateJoinSettingResult.fromCallableData(
      value,
      expectedScope: settingScope(groupId: groupId),
    ).view;
  }

  test('suggestions do not configure or enroll an event', () {
    final view = read(settingResponse());
    expect(view.own, isNull);
    expect(view.status, AssistanceSettingStatus.unconfigured);
    expect(view.effective, isNull);
    expect(view.suggested!.setting, isA<AssistanceTemplateEnabled>());
    expect(view.suggested!.destination, isA<LateJoinConfirmedProgress>());
  });

  test(
    'all destinations, cutoffs and authority choices round-trip through the wire contract',
    () {
      final destinations = [
        const LateJoinConfirmedProgress(),
        for (final rule in LateEntryRule.values)
          LateJoinFixedPlace(placeId: 'place', lateEntry: rule),
        LateJoinItinerary(
          itineraryId: 'bar crawl',
          permittedStopIds: ['first bar', 'second bar'],
        ),
        LateJoinGroupCheckpoints(
          routeId: 'riverside route',
          groupId: 'pace:slow',
          permittedCheckpointIds: ['water stop'],
        ),
      ];
      for (final destination in destinations) {
        for (final cutoff in [const LateJoinEventEnd(), LateJoinAtTime(3000)]) {
          for (final setting in [
            for (final authority in AssistanceTemplateAuthority.values)
              AssistanceTemplateEnabled(authority),
            for (final reason in AssistanceTemplateDisabledReason.values)
              AssistanceTemplateDisabled(reason),
          ]) {
            for (final unanswered in LateJoinUnansweredRule.values) {
              final template = AssistanceLateJoinTemplate(
                setting: setting,
                destination: destination,
                cutoff: cutoff,
                maxMessagesPerEpisode: 3,
                minimumMinutesBetweenMessages: 10,
                unanswered: unanswered,
              );
              final change = settingView().prepareChange(
                requestId: 'setting:once',
                preference: LateJoinConfigured(template),
              );
              expect(commandSchema.validate(change.toJson()).isValid, isTrue);
              expect(
                AssistanceLateJoinTemplate.fromJson(template.toJson()).toJson(),
                template.toJson(),
              );
            }
          }
        }
      }
    },
  );

  test('group inheritance is separate from its own record and revision', () {
    final inherited = read(
      settingResponse(
        groupId: 'pace:slow',
        status: 'configured',
        origin: 'event',
        effective: settingTemplate(),
      ),
      groupId: 'pace:slow',
    );
    expect(inherited.ownRevision, 0);
    expect(inherited.own, isNull);
    final view = read(
      settingResponse(
        groupId: 'pace:slow',
        revision: 2,
        own: settingRecord(
          groupId: 'pace:slow',
          revision: 2,
          preference: {'kind': 'inherit'},
        ),
        status: 'configured',
        origin: 'event',
        effective: settingTemplate(),
      ),
      groupId: 'pace:slow',
    );
    final reset = view.prepareChange(
      requestId: 'inherit:once',
      preference: const LateJoinInherit(),
    );
    expect(reset.toJson()['expectedRevision'], 2);
    expect(commandSchema.validate(reset.toJson()).isValid, isTrue);
  });

  test(
    'disablement survives changed source and may retain saved configuration',
    () {
      final disabledTemplate = settingTemplate(
        setting: {'kind': 'disabled', 'reason': 'hostChoice'},
      );
      for (final preference in [
        {'kind': 'disabled'},
        {'kind': 'configured', 'template': disabledTemplate},
      ]) {
        final effective = preference['template'];
        final view = read(
          settingResponse(
            revision: 1,
            own: settingRecord(preference: preference, sourceHash: 'b' * 64),
            status: 'disabled',
            origin: 'event',
            effective: effective,
          ),
        );
        expect(view.status, AssistanceSettingStatus.disabled);
        expect(view.own!.sourceHash, 'b' * 64);
      }
    },
  );

  test(
    'source changes hide the effective policy while preserving the reviewable old choice',
    () {
      final view = read(
        settingResponse(
          revision: 1,
          own: settingRecord(sourceHash: 'b' * 64),
          status: 'sourceChanged',
          origin: 'event',
        ),
      );
      expect(view.effective, isNull);
      expect(view.own!.preference, isA<LateJoinConfigured>());
      final change = view.prepareChange(
        requestId: 'review:once',
        preference: LateJoinConfigured(lateJoinTemplate()),
      );
      expect(change.toJson()['expectedSourceHash'], 'a' * 64);
      expect(change.toJson()['expectedRevision'], 1);
    },
  );

  test(
    'frozen changes do not retain mutable source or exported wire lists',
    () {
      final stops = ['one'];
      final destination = LateJoinItinerary(
        itineraryId: 'crawl',
        permittedStopIds: stops,
      );
      stops.add('two');
      final raw = settingTemplate(destination: destination.toJson());
      final template = AssistanceLateJoinTemplate.fromJson(raw);
      final change = settingView().prepareChange(
        requestId: 'frozen',
        preference: LateJoinConfigured(template),
      );
      final before = change.toJson();
      ((raw['config']! as Map)['destination'] as Map)['permittedStopIds'] = [
        'foreign',
      ];
      final exported = change.toJson();
      (((exported['preference']! as Map)['template'] as Map)['config']
              as Map)['destination'] =
          'foreign destination';
      expect(change.toJson(), before);
      expect((template.destination as LateJoinItinerary).permittedStopIds, [
        'one',
      ]);
      expect(
        () => destination.permittedStopIds.add('three'),
        throwsUnsupportedError,
      );
    },
  );

  test(
    'invalid limits, destinations and enum variants cannot become templates',
    () {
      for (final patch in [
        {'maxMessagesPerEpisode': -1},
        {'maxMessagesPerEpisode': 101},
        {'minimumMinutesBetweenMessages': 1441},
        {'minimumMinutesBetweenMessages': 1.5},
        {'updateOn': 'timer'},
        {'unanswered': 'assumeAbsent'},
        {'private': true},
        {
          'cutoff': {'kind': 'eventEnd', 'at': 1000},
        },
        {
          'cutoff': {'kind': 'time', 'at': 9007199254740992},
        },
        {
          'destination': {'kind': 'liveLocation'},
        },
        {
          'destination': {'kind': 'confirmedGroupProgress', 'placeId': 'x'},
        },
        {
          'destination': {
            'kind': 'itineraryStop',
            'itineraryId': 'crawl',
            'permittedStopIds': [],
          },
        },
        {
          'destination': {
            'kind': 'itineraryStop',
            'itineraryId': 'crawl',
            'permittedStopIds': ['x', 'x'],
          },
        },
      ]) {
        final raw = settingTemplate();
        (raw['config']! as Map).addAll(patch);
        expect(
          () => AssistanceLateJoinTemplate.fromJson(raw),
          throwsFormatException,
          reason: '$patch',
        );
      }
      for (final patch in [
        {'kind': 'checkpoint'},
        {'version': 2},
        {
          'setting': {'kind': 'enabled', 'authority': 'autonomous'},
        },
        {'runtime': 'live'},
      ]) {
        expect(
          () => AssistanceLateJoinTemplate.fromJson({
            ...settingTemplate(),
            ...patch,
          }),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'foreign scopes and contradictory inherited projections fail closed',
    () {
      for (final patch in [
        {'groupId': 'foreign'},
        {'workflowKind': 'checkpoint'},
        {
          'context': {...settingScope().context, 'mode': 'rehearsal'},
        },
        {
          'context': {...settingScope().context, 'organizerId': 'foreign'},
        },
        {'ownRevision': 1},
        {'serverTime': double.nan},
        {'sourceHash': 'invalid'},
        {'status': 'configured'},
        {'status': 'disabled', 'origin': 'none'},
        {'effective': settingTemplate()},
        {'origin': 'group'},
        {'unknown': true},
      ]) {
        final raw = settingResponse();
        (raw['view']! as Map).addAll(patch);
        expect(
          () => LateJoinSettingResult.fromCallableData(
            raw,
            expectedScope: settingScope(),
          ),
          throwsFormatException,
        );
      }
      for (final patch in [
        {'groupId': 'foreign'},
        {'revision': 0},
        {'updatedAt': 1001},
        {'createdAt': 1001},
        {'settingId': 'invalid'},
        {'workflowKind': 'checkpoint'},
      ]) {
        final raw = settingResponse(
          revision: 1,
          own: {...settingRecord(), ...patch},
          status: 'configured',
          origin: 'event',
          effective: settingTemplate(),
        );
        expect(
          () => LateJoinSettingResult.fromCallableData(
            raw,
            expectedScope: settingScope(),
          ),
          throwsFormatException,
        );
      }
      final stale = settingResponse(
        revision: 1,
        own: settingRecord(sourceHash: 'b' * 64),
        status: 'configured',
        origin: 'event',
        effective: settingTemplate(),
      );
      expect(
        () => LateJoinSettingResult.fromCallableData(
          stale,
          expectedScope: settingScope(),
        ),
        throwsFormatException,
      );
    },
  );

  test(
    'replays preserve original operation revision and a newer current setting',
    () {
      final change = settingView().prepareChange(
        requestId: 'once',
        preference: LateJoinConfigured(lateJoinTemplate()),
      );
      final raw = settingResponse(
        outcome: 'replayed',
        operationRevision: 1,
        revision: 3,
        own: settingRecord(revision: 3, preference: {'kind': 'disabled'}),
        status: 'disabled',
        origin: 'event',
      );
      expect(responseSchema.validate(raw).isValid, isTrue);
      final result = LateJoinSettingResult.fromCallableData(
        raw,
        expectedScope: settingScope(),
        expectedChange: change,
      );
      expect(result.operationRevision, 1);
      expect(result.view.ownRevision, 3);
      expect(result.view.own!.preference, isA<LateJoinDisabled>());
      for (final patch in [
        {'outcome': 'applied'},
        {'operationRevision': 2},
        {'operationRevision': null},
      ]) {
        expect(
          () => LateJoinSettingResult.fromCallableData(
            {...raw, ...patch},
            expectedScope: settingScope(),
            expectedChange: change,
          ),
          throwsFormatException,
        );
      }
    },
  );
}
