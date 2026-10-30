import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_host_guests.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/event_assistance_host_guests_callable_response.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_host_guests_fixtures.dart';

void main() {
  final schema = JsonSchema.create(
    schemaEventAssistanceHostGuestsCallableResponseSchema,
  );
  EventAssistanceHostGuestsView parse(
    Map<String, Object?> raw, {
    EventAssistanceGuestSelection? selection,
  }) => EventAssistanceHostGuestsView.fromCallableData(
    raw,
    expectedSelection: selection ?? hostGuestsSelection(),
  );

  test('selection identity is ordered, bounded and immune to caller edits', () {
    final ids = ['first', 'second'];
    final selection = hostGuestsSelection(attendeeIds: ids);
    final same = hostGuestsSelection(attendeeIds: ['first', 'second']);
    expect(selection, same);
    expect(selection.hashCode, same.hashCode);
    expect(
      selection,
      isNot(hostGuestsSelection(attendeeIds: ['second', 'first'])),
    );
    ids[0] = 'replaced';
    expect(selection.attendeeIds, ['first', 'second']);
    expect(() => selection.attendeeIds.add('third'), throwsUnsupportedError);
    expect(() => selection.scopeFor('outside'), throwsArgumentError);
    expect(selection.scopeFor('first').eventId, selection.eventId);
    for (final ids in [
      <String>[],
      ['duplicate', 'duplicate'],
      ['invalid/id'],
      List.generate(51, (i) => 'guest-$i'),
    ]) {
      expect(
        () => hostGuestsSelection(attendeeIds: ids),
        throwsFormatException,
      );
    }
    expect(
      hostGuestsSelection(
        attendeeIds: List.generate(50, (i) => 'guest-$i'),
      ).attendeeIds,
      hasLength(50),
    );
    expect(
      () => EventAssistanceGuestSelection(
        organizerId: 'invalid/id',
        eventId: 'event',
        attendeeIds: ['guest'],
      ),
      throwsFormatException,
    );
  });

  test(
    'each guest state remains distinct and the read never invents presence',
    () {
      final rows = <Map<String, Object?>>[
        {'kind': 'unavailable', 'attendeeId': 'unavailable'},
        {
          'kind': 'ineligible',
          'attendeeId': 'ineligible',
          'rosterStatus': 'waitlisted',
        },
        {
          'kind': 'uninitialized',
          'attendeeId': 'uninitialized',
          'checkedIn': true,
        },
        {
          'kind': 'sourceChanged',
          'attendeeId': 'sourceChanged',
          'checkedIn': false,
        },
        {
          ...hostCurrentGuest(attendeeId: 'current'),
          'participation': {
            'state': 'temporaryBreak',
            'resumeAtUnit': 'itinerary:second',
          },
          'intention': {'kind': 'notComing'},
        },
      ];
      final raw = hostGuestsResponse(guests: rows);
      expect(schema.validate(raw).isValid, isTrue);
      final selection = hostGuestsSelection(
        attendeeIds: rows.map((r) => r['attendeeId']! as String).toList(),
      );
      final view = parse(raw, selection: selection);
      expect(view.guests[0], isA<AssistanceGuestUnavailable>());
      expect(
        (view.guests[1] as AssistanceGuestIneligible).rosterStatus,
        AssistanceIneligibleStatus.waitlisted,
      );
      expect(
        (view.guests[2] as AssistanceGuestUninitialized).checkedIn,
        isTrue,
      );
      expect(view.guests[3], isA<AssistanceGuestSourceChanged>());
      final current = view.guests[4] as AssistanceCurrentGuest;
      expect(current.checkedIn, isFalse);
      expect(current.participation, isA<EventParticipationOnBreak>());
      expect(current.intention, isA<AssistanceNotComing>());
      expect(current.work, isA<AssistanceGuestNotEnrolled>());
      expect(() => view.guests.clear(), throwsUnsupportedError);
      rows[4]['checkedIn'] = true;
      expect(current.checkedIn, isFalse);
    },
  );

  test(
    'all current server outcome and reason variants decode as typed records',
    () {
      final observations = _observationsFromContracts();
      final kinds = observations.map((o) => o['kind']).toSet();
      expect(kinds, {
        'decision',
        'sourceNotReady',
        'historyUnavailable',
        'runtimeUnavailable',
        'responseDeadlineMissing',
        'episodeChanged',
        'workExpired',
        'evaluationLimit',
      });
      for (final observation in observations) {
        final terminal = _terminal(observation);
        final raw = hostGuestsResponse(
          guests: [
            hostCurrentGuest(
              work: hostRecordedWork(
                observation: observation,
                terminal: terminal,
              ),
            ),
          ],
        );
        final validation = schema.validate(raw);
        expect(
          validation.isValid,
          isTrue,
          reason: validation.errors.toString(),
        );
        final guest = parse(raw).guests.single as AssistanceCurrentGuest;
        final work = guest.work as AssistanceRecordedGuestWork;
        expect(
          work.lastEvaluation!.observation.isTerminal,
          terminal,
          reason: observation.toString(),
        );
        expect(work.lastEvaluation!.at, assistanceServerTime - 1000);
      }
    },
  );

  test(
    'reported destinations and ETA retain their meaning without check-in',
    () {
      final targets = [
        for (final lateEntry in ['allowed', 'hostDecision', 'closed'])
          {'kind': 'fixedPlace', 'placeId': 'venue', 'lateEntry': lateEntry},
        {'kind': 'itineraryStop', 'itineraryId': 'event-1', 'stopId': 'second'},
        {
          'kind': 'groupCheckpoint',
          'routeId': 'route-1',
          'groupId': 'easy',
          'checkpointId': 'halfway',
        },
      ];
      for (final target in targets) {
        final raw = hostGuestsResponse(
          guests: [
            hostCurrentGuest(
              intention: {'kind': 'joinLater', 'target': target},
            ),
          ],
        );
        expect(schema.validate(raw).isValid, isTrue);
        final guest = parse(raw).guests.single as AssistanceCurrentGuest;
        expect(guest.intention, isA<AssistanceJoinLater>());
        expect(guest.checkedIn, isFalse);
        final parsed = (guest.intention as AssistanceJoinLater).target;
        expect(switch (parsed) {
          AssistanceFixedPlace() => 'fixedPlace',
          AssistanceItineraryStop() => 'itineraryStop',
          AssistanceGroupCheckpoint() => 'groupCheckpoint',
        }, target['kind']);
      }
      for (final eta in [null, assistanceServerTime + 10000]) {
        final guest =
            parse(
                  hostGuestsResponse(
                    guests: [
                      hostCurrentGuest(
                        intention: {'kind': 'onMyWay', 'claimedEta': eta},
                      ),
                    ],
                  ),
                ).guests.single
                as AssistanceCurrentGuest;
        expect((guest.intention as AssistanceOnMyWay).claimedEta, eta);
        expect(guest.checkedIn, isFalse);
      }
    },
  );

  test(
    'runtime pause, worker record and publication remain separate facts',
    () {
      final raw = hostGuestsResponse(
        runtimeStatus: 'paused',
        guests: [
          hostCurrentGuest(
            work: hostRecordedWork(
              binding: 'configurationChanged',
              publishedIntentCount: 1,
              observation: {
                'kind': 'decision',
                'decision': {
                  'kind': 'update',
                  'guidance': hostJoiningGuidance(),
                  'messageKey': 'message-1',
                  'shouldSend': true,
                  'nextEvaluationAt': assistanceServerTime + 600000,
                },
              },
            ),
          ),
        ],
      );
      final view = parse(raw);
      final work =
          (view.guests.single as AssistanceCurrentGuest).work
              as AssistanceRecordedGuestWork;
      expect(view.runtimeStatus, AssistanceRuntimeStatus.paused);
      expect(work.runStatus, AssistanceRunStatus.running);
      expect(
        work.configurationBinding,
        AssistanceConfigurationBinding.configurationChanged,
      );
      expect(work.publishedIntentCount, 1);
      final decision =
          (work.lastEvaluation!.observation as AssistanceDecisionObservation)
                  .decision
              as AssistanceJoiningUpdate;
      expect(decision.guidance.text, 'Meet us at the second stop.');
      expect(decision.guidance.destination, isA<AssistanceItineraryStop>());
      expect(decision.shouldSend, isTrue);
      expect(work.lastEvaluation!.at, lessThan(view.serverTime));
    },
  );

  test(
    'mixed scopes, missing rows and unknown coverage fail instead of all-clear',
    () {
      final patches = <Map<String, Object?>>[
        {
          'context': {...hostGuestsSelection().context, 'mode': 'rehearsal'},
        },
        {
          'context': {
            ...hostGuestsSelection().context,
            'organizerId': 'foreign',
          },
        },
        {
          'context': {...hostGuestsSelection().context, 'eventId': 'foreign'},
        },
        {'coverage': 'wholeEvent'},
        {'workflow': 'accountability'},
        {'runtimeStatus': 'unknown'},
        {'guests': []},
        {
          'guests': [hostCurrentGuest(attendeeId: 'foreign')],
        },
        {
          'guests': [hostCurrentGuest(), hostCurrentGuest()],
        },
        {'serverTime': double.nan},
        {'serverTime': -1},
        {'serverTime': 9007199254740992},
        {'serverTime': 1.5},
        {'deliveryStatus': 'delivered'},
      ];
      for (final patch in patches) {
        expect(
          () => parse({...hostGuestsResponse(), ...patch}),
          throwsFormatException,
          reason: patch.toString(),
        );
      }
      final selection = hostGuestsSelection(attendeeIds: ['first', 'second']);
      for (final guests in [
        [
          hostCurrentGuest(attendeeId: 'second'),
          hostCurrentGuest(attendeeId: 'first'),
        ],
        [
          hostCurrentGuest(attendeeId: 'first'),
          hostCurrentGuest(attendeeId: 'first'),
        ],
      ]) {
        expect(
          () => parse(hostGuestsResponse(guests: guests), selection: selection),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'inconsistent work and extra data cannot become plausible guest states',
    () {
      final observation = {
        'kind': 'decision',
        'decision': {'kind': 'wait', 'reason': 'attendanceUnknown'},
      };
      final work = hostRecordedWork(observation: observation);
      for (final patch in [
        {'runStatus': 'completed'},
        {'nextEvaluationAt': null},
        {'configurationBinding': 'enabled'},
        {'expiresAt': assistanceServerTime - 1},
        {'revision': 0},
        {'revision': -1},
        {'publishedIntentCount': -1},
        {
          'lastEvaluation': {
            'at': assistanceServerTime + 1,
            'observation': observation,
          },
        },
        {
          'lastEvaluation': {
            'at': assistanceServerTime,
            'observation': {'kind': 'sourceNotReady', 'reason': 'madeUp'},
          },
        },
        {'providerReceipt': 'invented'},
      ]) {
        expect(
          () => parse(
            hostGuestsResponse(
              guests: [
                hostCurrentGuest(work: {...work, ...patch}),
              ],
            ),
          ),
          throwsFormatException,
          reason: patch.toString(),
        );
      }
      expect(
        () => parse(
          hostGuestsResponse(
            guests: [
              hostCurrentGuest(work: hostRecordedWork(publishedIntentCount: 1)),
            ],
          ),
        ),
        throwsFormatException,
      );
      for (final patch in [
        {'kind': 'sourceChanged'},
        {'checkedIn': 'true'},
        {
          'intention': {'kind': 'unknown', 'claimedEta': 2},
        },
        {
          'intention': {'kind': 'onMyWay', 'claimedEta': double.infinity},
        },
        {
          'participation': {'state': 'departed', 'resumeAtUnit': 'second'},
        },
        {'participation': null},
        {'phoneE164': '+919999999999'},
      ]) {
        expect(
          () => parse(
            hostGuestsResponse(
              guests: [
                {...hostCurrentGuest(), ...patch},
              ],
            ),
          ),
          throwsFormatException,
          reason: patch.toString(),
        );
      }
    },
  );
}

/// Enumerate the canonical schema, so additions cannot silently miss the client.
List<Map<String, Object?>> _observationsFromContracts() {
  final source =
      jsonDecode(
            File(
              'contracts/operations/event_assistance_live_work.schema.json',
            ).readAsStringSync(),
          )
          as Map<String, Object?>;
  final variants =
      _contractPath(source, [
            'properties',
            'checkpoint',
            'properties',
            'observation',
            'anyOf',
            0,
            'oneOf',
          ])!
          as List<Object?>;
  final common =
      jsonDecode(
            File(
              'contracts/shared/event_assistance_common.schema.json',
            ).readAsStringSync(),
          )
          as Map<String, Object?>;
  final decisions =
      _contractPath(common, ['definitions', 'LateJoinEvaluation', 'anyOf'])!
          as List<Object?>;
  final result = <Map<String, Object?>>[];
  for (final variant in variants.cast<Map<String, Object?>>()) {
    final properties = variant['properties'] as Map<String, Object?>;
    final kind = _contractPath(properties, ['kind', 'const'])! as String;
    if (kind == 'decision') {
      for (final definition in decisions.cast<Map<String, Object?>>()) {
        final props = definition['properties'] as Map<String, Object?>;
        final decisionKind = _contractPath(props, ['kind', 'const'])! as String;
        if (props['reason'] case final Map<String, Object?> reason) {
          for (final value in reason['enum']! as List<Object?>) {
            result.add({
              'kind': kind,
              'decision': {
                'kind': decisionKind,
                'reason': value,
                if (decisionKind == 'hostDecision') 'guidance': null,
              },
            });
          }
        } else {
          result.add({
            'kind': kind,
            'decision': {
              'kind': decisionKind,
              'guidance': hostJoiningGuidance(),
              'messageKey': 'message-1',
              'shouldSend': true,
              'nextEvaluationAt': null,
            },
          });
        }
      }
    } else if (properties['reason'] case final Map<String, Object?> reason) {
      for (final value in reason['enum']! as List<Object?>) {
        result.add({'kind': kind, 'reason': value});
      }
    } else {
      result.add({'kind': kind});
    }
  }
  return result;
}

bool _terminal(Map<String, Object?> observation) {
  if (observation['kind'] == 'decision') {
    final decision = observation['decision']! as Map<String, Object?>;
    return {'resolved', 'cancelled', 'expired'}.contains(decision['kind']);
  }
  return {'episodeChanged', 'workExpired'}.contains(observation['kind']) ||
      (observation['kind'] == 'sourceNotReady' &&
          observation['reason'] == 'eventClosed') ||
      (observation['kind'] == 'runtimeUnavailable' &&
          {'expired', 'eventClosed'}.contains(observation['reason']));
}

Object? _contractPath(Object? value, List<Object> path) {
  for (final key in path) {
    value = switch ((value, key)) {
      (Map<Object?, Object?> map, String key) => map[key],
      (List<Object?> list, int index) => list[index],
      _ => throw StateError('Unexpected assistance contract path.'),
    };
  }
  return value;
}
