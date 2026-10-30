import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callables/confirm_event_assistance_departure_callable_request.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/confirm_event_assistance_departure_callable_payload.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/event_assistance_departure_roster_callable_response.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/event_assistance_group_progress_callable_response.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_departure_fixtures.dart';

void main() {
  final responseSchema = JsonSchema.create(
    schemaEventAssistanceGroupProgressCallableResponseSchema,
  );
  final commandSchema = JsonSchema.create(
    schemaConfirmEventAssistanceDepartureCallablePayloadSchema,
  );
  final rosterSchema = JsonSchema.create(
    schemaEventAssistanceDepartureRosterCallableResponseSchema,
  );

  EventAssistanceDepartureChange prepare(
    EventAssistanceGroupProgressView view, {
    EventAssistanceDepartureRosterReview? roster,
    AssistanceDepartureCheckpointRequest? checkpoint,
  }) => EventAssistanceDepartureChange.prepare(
    snapshot: view,
    operationId: 'departure:once',
    destination: view.destinations.single.target,
    roster: roster,
    checkpoint: checkpoint,
  );

  EventAssistanceDepartureRosterReview review(
    EventAssistanceGroupProgressView view, {
    List<String> ids = const ['guest-1'],
  }) => EventAssistanceDepartureRosterReview.fromCallableData(
    departureRosterResponse(attendeeIds: [...ids]..sort()),
    snapshot: view,
    expectedSelection: EventAssistanceDepartureRosterSelection(ids),
  );

  test('typed destinations round-trip and retain all identity dimensions', () {
    const targets = [
      departureMeeting,
      departureStop,
      AssistanceGroupCheckpoint(
        routeId: 'route',
        groupId: 'pace',
        checkpointId: 'end',
      ),
      AssistanceFixedPlace(
        placeId: 'meeting',
        lateEntry: AssistanceLateEntry.closed,
      ),
      AssistanceItineraryStop(itineraryId: 'other', stopId: 'second'),
      AssistanceGroupCheckpoint(
        routeId: 'other',
        groupId: 'pace',
        checkpointId: 'end',
      ),
    ];
    expect(targets.toSet(), hasLength(targets.length));
    for (final target in targets) {
      final decoded = AssistanceJoiningTarget.fromJson(target.toJson());
      expect(decoded, target);
      expect(decoded.hashCode, target.hashCode);
    }
  });

  test('schedule choices never manufacture departure or joining guidance', () {
    final raw = departureResponse();
    expect(responseSchema.validate(raw).isValid, isTrue);
    final view = parseDeparture(raw).view;
    expect(view.progress, isNull);
    expect(view.guidance, isNull);
    expect(view.freshness, AssistanceProgressFreshness.unconfirmed);
    expect(view.canConfirm, isTrue);
    expect(view.revision, 0);
    expect(view.destinations.single.location.latitude, 12.9);
    expect(() => view.destinations.clear(), throwsUnsupportedError);
  });

  test(
    'authority is separate from event readiness and available destinations',
    () {
      for (final raw in [
        departureResponse(authority: 'readOnly'),
        departureResponse(runtimeLive: false),
        departureResponse(eventOpen: false),
        departureResponse()
          ..['view'] = {
            ...departureRawView(departureResponse()),
            'destinations': <Object?>[],
          },
      ]) {
        expect(responseSchema.validate(raw).isValid, isTrue);
        final view = parseDeparture(raw).view;
        expect(view.canConfirm, isFalse);
        expect(() => prepare(view), throwsStateError);
      }
      final readOnly = parseDeparture(
        departureResponse(authority: 'readOnly'),
      ).view;
      expect(readOnly.authority, isA<AssistanceDepartureReadOnly>());
    },
  );

  test('current and stale progress are distinct and can be confirmed anew', () {
    for (final freshness in ['current', 'sourceChanged']) {
      final raw = departureResponse(revision: 2, freshness: freshness);
      expect(responseSchema.validate(raw).isValid, isTrue);
      final view = parseDeparture(raw).view;
      expect(view.progress!.revision, 2);
      expect(view.canConfirm, isTrue);
      expect(view.guidance != null, freshness == 'current');
      final change = prepare(view);
      final input = ConfirmEventAssistanceDepartureCallableRequest(
        command: change.command,
        expectedSourceHash: view.sourceHash,
      ).toJson();
      expect(commandSchema.validate(input).isValid, isTrue);
      expect(
        (change.command['payload']! as Map)['expectedProgressRevision'],
        2,
      );
    }
  });

  test('replay receipt stays separate from a newer current progress view', () {
    final raw = departureResponse(
      outcome: 'replayed',
      operationRevision: 1,
      revision: 3,
      freshness: 'current',
    );
    expect(responseSchema.validate(raw).isValid, isTrue);
    final result = parseDeparture(raw);
    expect(result.operationRevision, 1);
    expect(result.view.revision, 3);
  });

  test(
    'cross-event, cross-group, rehearsal and account responses fail closed',
    () {
      final originals = [
        departureResponse()..['actorUid'] = 'another-manager',
        departureResponse()
          ..['view'] = {
            ...departureRawView(departureResponse()),
            'groupId': 'another-group',
          },
        departureResponse()
          ..['view'] = {
            ...departureRawView(departureResponse()),
            'context': {...departureScope().context, 'eventId': 'other-event'},
          },
        departureResponse()
          ..['view'] = {
            ...departureRawView(departureResponse()),
            'context': {...departureScope().context, 'mode': 'rehearsal'},
          },
        departureResponse(
          scope: departureScope(groupId: 'pace-one'),
          target: const AssistanceGroupCheckpoint(
            routeId: 'route',
            groupId: 'pace-two',
            checkpointId: 'end',
          ),
        ),
      ];
      for (final raw in originals) {
        expect(() => parseDeparture(raw), throwsFormatException);
      }
      final scope = departureScope(groupId: 'pace-one');
      final raw = departureResponse(
        scope: scope,
        target: const AssistanceGroupCheckpoint(
          routeId: 'route',
          groupId: 'pace-one',
          checkpointId: 'end',
        ),
      );
      expect(responseSchema.validate(raw).isValid, isTrue);
      expect(parseDeparture(raw, scope: scope).view.scope, scope);
      expect(scope, departureScope(groupId: 'pace-one'));
    },
  );

  test(
    'malformed and contradictory progress cannot become usable controls',
    () {
      final mutations = <void Function(Map<String, Object?>)>[
        (v) => v['revision'] = 1,
        (v) => v['sourceHash'] = 'unknown',
        (v) => v['serverTime'] = double.infinity,
        (v) => v['serverTime'] = 1.25,
        (v) => v['serverTime'] = 9007199254740992,
        (v) => v['freshness'] = 'something-new',
        (v) => v['unexpected'] = true,
        (v) => v['destinations'] = List.filled(
          42,
          (v['destinations']! as List).single,
        ),
        (v) => v['destinations'] = List.filled(
          2,
          (v['destinations']! as List).single,
        ),
        (v) => ((v['destinations']! as List).single as Map)['location'] = {
          'name': 'Broken',
          'latitude': 91,
          'longitude': 0,
        },
      ];
      for (final mutate in mutations) {
        final raw = departureResponse();
        mutate(departureRawView(raw));
        expect(() => parseDeparture(raw), throwsFormatException);
      }
      for (final raw in [
        departureResponse(validUntil: departureNow),
        departureResponse(authority: 'unknown'),
        departureResponse(reporter: 'anyone'),
        departureResponse()..['operationRevision'] = 1,
        departureResponse(outcome: 'applied'),
      ]) {
        expect(() => parseDeparture(raw), throwsFormatException);
      }
    },
  );

  test('stale, future or mismatched guidance cannot masquerade as current', () {
    final mutations = <void Function(Map<String, Object?>)>[
      (v) => v['guidance'] = null,
      (v) => (v['guidance']! as Map)['validUntil'] = departureNow,
      (v) => (v['guidance']! as Map)['revision'] = 0,
      (v) => (v['guidance']! as Map)['destination'] = departureMeeting.toJson(),
      (v) => (v['progress']! as Map)['groupId'] = 'other',
      (v) => (v['progress']! as Map)['confirmedAt'] = departureNow + 1,
      (v) => (v['progress']! as Map)['sourceHash'] = 'c' * 64,
      (v) => (v['progress']! as Map)['departureRosterId'] = 'bad',
      (v) => v['runtimeLive'] = false,
    ];
    for (final mutate in mutations) {
      final raw = departureResponse(revision: 1, freshness: 'current');
      mutate(departureRawView(raw));
      expect(() => parseDeparture(raw), throwsFormatException);
    }
  });

  test('omitted roster is distinct from reviewed empty roster in commands', () {
    final view = departureView();
    final noRoster = prepare(view);
    final emptyRoster = prepare(view, roster: review(view, ids: []));
    expect(
      (noRoster.command['payload']! as Map).containsKey('departureRoster'),
      isFalse,
    );
    expect((emptyRoster.command['payload']! as Map)['departureRoster'], {
      'attendeeIds': <String>[],
      'expectedSourceHash': 'f' * 64,
    });
    for (final change in [noRoster, emptyRoster]) {
      expect(
        commandSchema
            .validate(
              ConfirmEventAssistanceDepartureCallableRequest(
                command: change.command,
                expectedSourceHash: view.sourceHash,
              ).toJson(),
            )
            .isValid,
        isTrue,
      );
    }
  });

  test('selected roster is immutable, canonical, bounded and exact', () {
    final ids = ['guest-z', 'guest-a'];
    final selection = EventAssistanceDepartureRosterSelection(ids);
    ids.clear();
    expect(selection.attendeeIds, ['guest-a', 'guest-z']);
    expect(() => selection.attendeeIds.clear(), throwsUnsupportedError);
    final raw = departureRosterResponse(attendeeIds: selection.attendeeIds);
    expect(rosterSchema.validate(raw).isValid, isTrue);
    final roster = EventAssistanceDepartureRosterReview.fromCallableData(
      raw,
      snapshot: departureView(),
      expectedSelection: selection,
    );
    expect(roster.attendeeIds, selection.attendeeIds);
    expect(
      () => EventAssistanceDepartureRosterSelection(['a', 'a']),
      throwsArgumentError,
    );
    expect(
      () => EventAssistanceDepartureRosterSelection(['invalid/id']),
      throwsFormatException,
    );
    expect(
      () => EventAssistanceDepartureRosterSelection(
        List.generate(1001, (i) => 'guest-$i'),
      ),
      throwsArgumentError,
    );
    expect(
      EventAssistanceDepartureRosterSelection(
        List.generate(1000, (i) => 'guest-$i'),
      ).attendeeIds,
      hasLength(1000),
    );
  });

  test(
    'roster reviews cannot drift in scope, revision, membership or time',
    () {
      for (final raw in [
        departureRosterResponse(attendeeIds: []),
        departureRosterResponse(attendeeIds: ['guest-2']),
        departureRosterResponse(attendeeIds: ['guest-1', 'guest-1']),
        departureRosterResponse(revision: 1),
        departureRosterResponse(serverTime: departureNow - 1),
        departureRosterResponse()..['groupId'] = 'other',
      ]) {
        expect(
          () => EventAssistanceDepartureRosterReview.fromCallableData(
            raw,
            snapshot: departureView(),
            expectedSelection: EventAssistanceDepartureRosterSelection([
              'guest-1',
            ]),
          ),
          throwsFormatException,
        );
      }
      final view = departureView();
      expect(
        () => prepare(departureView(), roster: review(view)),
        throwsArgumentError,
      );
    },
  );

  test('checkpoint needs a roster and an appropriate destination', () {
    final checkpoint = AssistanceDepartureCheckpointRequest(
      responsibleOperatorId: departureActor,
      dueAt: departureNow + 100,
    );
    final view = departureView();
    expect(() => prepare(view, checkpoint: checkpoint), throwsArgumentError);
    final fixed = parseDeparture(
      departureResponse(target: departureMeeting),
    ).view;
    expect(
      () => prepare(fixed, roster: review(fixed), checkpoint: checkpoint),
      throwsArgumentError,
    );
    final change = prepare(view, roster: review(view), checkpoint: checkpoint);
    expect(
      commandSchema
          .validate(
            ConfirmEventAssistanceDepartureCallableRequest(
              command: change.command,
              expectedSourceHash: view.sourceHash,
            ).toJson(),
          )
          .isValid,
      isTrue,
    );
    final edited = change.command;
    (edited['payload']! as Map)['expectedProgressRevision'] = 100;
    expect((change.command['payload']! as Map)['expectedProgressRevision'], 0);
  });

  test('scoped leads can name only themselves within their duty deadline', () {
    final view = parseDeparture(departureResponse(reporter: 'selfOnly')).view;
    final roster = review(view);
    for (final checkpoint in [
      AssistanceDepartureCheckpointRequest(
        responsibleOperatorId: 'other-operator',
        dueAt: departureNow + 100,
      ),
      AssistanceDepartureCheckpointRequest(
        responsibleOperatorId: departureActor,
        dueAt: departureNow + 100000,
      ),
      AssistanceDepartureCheckpointRequest(
        responsibleOperatorId: departureActor,
        dueAt: departureNow,
      ),
    ]) {
      expect(
        () => prepare(view, roster: roster, checkpoint: checkpoint),
        throwsArgumentError,
      );
    }
    expect(
      prepare(
        view,
        roster: roster,
        checkpoint: AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 100,
        ),
      ).checkpoint!.responsibleOperatorId,
      departureActor,
    );
    final manager = departureView();
    expect(
      prepare(
        manager,
        roster: review(manager),
        checkpoint: AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: 'another-current-operator',
          dueAt: departureNow + 100,
        ),
      ).checkpoint!.responsibleOperatorId,
      'another-current-operator',
    );
  });

  test('confirm cannot select a target outside the reviewed event', () {
    expect(
      () => EventAssistanceDepartureChange.prepare(
        snapshot: departureView(),
        operationId: 'departure:one',
        destination: departureMeeting,
      ),
      throwsArgumentError,
    );
  });
}
