import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/event_assistance_runtime_config_callable_response.g.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/set_event_assistance_runtime_config_callable_payload.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_runtime_fixtures.dart';

void main() {
  final responseSchema = JsonSchema.create(
    schemaEventAssistanceRuntimeConfigCallableResponseSchema,
  );
  final commandSchema = JsonSchema.create(
    schemaSetEventAssistanceRuntimeConfigCallablePayloadSchema,
  );
  AssistanceRuntimeView read(Map<String, Object?> raw) {
    expect(responseSchema.validate(raw).isValid, isTrue);
    return AssistanceRuntimeResult.fromCallableData(
      raw,
      expectedScope: runtimeScope(),
    ).view;
  }

  test(
    'configure preserves channel order, deadline and explicit empty versus absent choices',
    () {
      for (final choices in [null, <Object?>[]]) {
        final wire = runtimeConfiguration(choices: choices);
        final config = AssistanceRuntimeConfiguration.fromJson(wire);
        expect(config.toJson(), wire);
        final change = runtimeView().prepareChange(
          requestId: 'configure:once',
          command: AssistanceRuntimeConfigure(config),
        );
        expect(commandSchema.validate(change.toJson()).isValid, isTrue);
        expect(config.routes.map((route) => route.route), [
          AssistanceMessageRoute.organizerEventWhatsapp,
          AssistanceMessageRoute.catchEventRcs,
          AssistanceMessageRoute.catchEventSms,
        ]);
        expect(change.toJson()['expectedSourceHash'], 'a' * 64);
        expect(change.toJson()['expectedRevision'], 0);
      }
    },
  );
  test(
    'fixed places, itinerary stops and group checkpoints remain typed optional choices',
    () {
      final targets = [
        {'kind': 'fixedPlace', 'placeId': 'venue', 'lateEntry': 'hostDecision'},
        {
          'kind': 'itineraryStop',
          'itineraryId': 'crawl',
          'stopId': 'second bar',
        },
        {
          'kind': 'groupCheckpoint',
          'routeId': 'route',
          'groupId': 'pace:slow',
          'checkpointId': 'water stop',
        },
      ];
      final wire = runtimeConfiguration(
        choices: [
          for (final target in targets)
            {'label': 'Join us later', 'target': target},
        ],
      );
      final config = AssistanceRuntimeConfiguration.fromJson(wire);
      expect(config.toJson(), wire);
      expect(
        commandSchema
            .validate(
              runtimeView()
                  .prepareChange(
                    requestId: 'choices',
                    command: AssistanceRuntimeConfigure(config),
                  )
                  .toJson(),
            )
            .isValid,
        isTrue,
      );
      (wire['options']! as Map)['laterChoices'] = [];
      expect(config.laterChoices, hasLength(3));
      final exported = config.toJson();
      (exported['options']! as Map)['routes'] = [];
      expect(config.routes, hasLength(3));
      expect(() => config.routes.clear(), throwsUnsupportedError);
      expect(() => config.laterChoices!.clear(), throwsUnsupportedError);
    },
  );
  test(
    'invalid route selections, ambiguous destinations and limits fail before saving',
    () {
      for (final patch in [
        {'routes': []},
        {
          'routes': [
            {'routeId': 'marketingSms', 'senderId': 'sender'},
          ],
        },
        {
          'routes': [
            {'routeId': 'catchEventSms', 'senderId': 'one'},
            {'routeId': 'catchEventSms', 'senderId': 'two'},
          ],
        },
        {
          'routes': [
            {'routeId': 'catchEventSms', 'senderId': 'foreign/path'},
          ],
        },
        {'responseDeadline': 9001},
        {'responseDeadline': -1},
        {'private': true},
        {'laterChoices': null},
        {
          'laterChoices': [
            {
              'label': 'First',
              'target': {
                'kind': 'fixedPlace',
                'placeId': 'p',
                'lateEntry': 'allowed',
              },
            },
            {
              'label': 'Second',
              'target': {
                'kind': 'fixedPlace',
                'placeId': 'p',
                'lateEntry': 'allowed',
              },
            },
          ],
        },
        {
          'deliveryPolicy': {
            'maxAttempts': 7,
            'maxAttemptsPerRoute': 1,
            'minimumRetrySeconds': 1,
          },
        },
        {
          'deliveryPolicy': {
            'maxAttempts': 1,
            'maxAttemptsPerRoute': 0,
            'minimumRetrySeconds': 1,
          },
        },
        {
          'deliveryPolicy': {
            'maxAttempts': 1,
            'maxAttemptsPerRoute': 1,
            'minimumRetrySeconds': 3601,
          },
        },
      ]) {
        final raw = runtimeConfiguration();
        (raw['options']! as Map).addAll(patch);
        expect(
          () => AssistanceRuntimeConfiguration.fromJson(raw),
          throwsFormatException,
          reason: '$patch',
        );
      }
      for (final patch in [
        {'expiresAt': -1},
        {'maxEvaluations': 0},
        {'maxEvaluations': 10001},
        {'maxEvaluations': 1.5},
        {'extra': 1},
      ]) {
        expect(
          () => AssistanceRuntimeConfiguration.fromJson({
            ...runtimeConfiguration(),
            ...patch,
          }),
          throwsFormatException,
        );
      }
    },
  );
  test(
    'configuration window is checked against the reviewed open event; pausing remains available',
    () {
      final closed = read(runtimeResponse(canConfigure: false));
      expect(
        () => closed.prepareChange(
          requestId: 'configure',
          command: AssistanceRuntimeConfigure(runtimeConfig()),
        ),
        throwsStateError,
      );
      expect(
        commandSchema
            .validate(
              closed
                  .prepareChange(
                    requestId: 'pause',
                    command: const AssistanceRuntimePause(),
                  )
                  .toJson(),
            )
            .isValid,
        isTrue,
      );
      for (final expiry in [1000, 10001]) {
        final raw = runtimeConfiguration();
        raw['expiresAt'] = expiry;
        (raw['options']! as Map)['responseDeadline'] = null;
        expect(
          () => runtimeView().prepareChange(
            requestId: 'configure',
            command: AssistanceRuntimeConfigure(
              AssistanceRuntimeConfiguration.fromJson(raw),
            ),
          ),
          throwsStateError,
        );
      }
    },
  );
  test('all saved statuses remain distinct without implying delivery', () {
    expect(
      read(runtimeResponse()).status,
      AssistanceRuntimeStatus.unconfigured,
    );
    for (final status in [
      'configured',
      'paused',
      'sourceChanged',
      'expired',
      'eventClosed',
    ]) {
      final wire = runtimeResponse(
        revision: 1,
        status: status,
        runtime: runtimeRecord(
          paused: status == 'paused',
          configuration: runtimeConfiguration(),
          sourceHash: status == 'sourceChanged' ? 'b' * 64 : null,
        ),
        now: status == 'expired' ? 9000 : 1000,
        canConfigure: status != 'eventClosed',
      );
      expect(read(wire).status.name, status);
    }
    final paused = read(
      runtimeResponse(
        revision: 1,
        status: 'paused',
        canConfigure: false,
        runtime: runtimeRecord(paused: true),
      ),
    );
    expect(paused.runtime!.configuration, isNull);
  });
  test(
    'a receipt crossing event end preserves status but cannot reconfigure',
    () {
      // A replay can advance the server clock after the source was read. The
      // current configure flag remains authoritative even with the earlier status.
      for (final status in ['expired', 'sourceChanged']) {
        final view = read(
          runtimeResponse(
            revision: 1,
            status: status,
            now: 10000,
            canConfigure: false,
            runtime: runtimeRecord(
              sourceHash: status == 'sourceChanged' ? 'b' * 64 : null,
            ),
          ),
        );
        expect(view.status.name, status);
        expect(
          () => view.prepareChange(
            requestId: 'closed',
            command: AssistanceRuntimeConfigure(runtimeConfig()),
          ),
          throwsStateError,
        );
        expect(
          view
              .prepareChange(
                requestId: 'pause',
                command: const AssistanceRuntimePause(),
              )
              .command,
          isA<AssistanceRuntimePause>(),
        );
      }
    },
  );
  test(
    'foreign scopes, missing records and contradictory status flags fail closed',
    () {
      for (final patch in [
        {
          'context': {...runtimeScope().context, 'eventId': 'foreign'},
        },
        {
          'context': {...runtimeScope().context, 'mode': 'rehearsal'},
        },
        {'revision': 1},
        {'status': 'configured'},
        {'status': 'paused'},
        {'serverTime': double.infinity},
        {'sourceHash': 'invalid'},
        {'eventEnd': 999},
        {'extra': true},
      ]) {
        final raw = runtimeResponse();
        (raw['view']! as Map).addAll(patch);
        expect(
          () => AssistanceRuntimeResult.fromCallableData(
            raw,
            expectedScope: runtimeScope(),
          ),
          throwsFormatException,
        );
      }
      for (final patch in [
        {'runtimeId': 'foreign'},
        {'workflowKind': 'checkpoint'},
        {'updatedAt': 1001},
        {'createdAt': 1001},
        {'configuration': null},
        {'revision': 0},
        {'sourceGeneration': 'invalid'},
      ]) {
        final raw = runtimeResponse(
          revision: 1,
          runtime: {...runtimeRecord(), ...patch},
          status: 'configured',
        );
        expect(
          () => AssistanceRuntimeResult.fromCallableData(
            raw,
            expectedScope: runtimeScope(),
          ),
          throwsFormatException,
        );
      }
      final stale = runtimeResponse(
        revision: 1,
        runtime: runtimeRecord(sourceHash: 'b' * 64),
        status: 'configured',
      );
      expect(
        () => AssistanceRuntimeResult.fromCallableData(
          stale,
          expectedScope: runtimeScope(),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'a replay retains the newer pause and its original operation revision',
    () {
      final change = runtimeView().prepareChange(
        requestId: 'once',
        command: AssistanceRuntimeConfigure(runtimeConfig()),
      );
      final raw = runtimeResponse(
        outcome: 'replayed',
        operationRevision: 1,
        revision: 3,
        status: 'paused',
        runtime: runtimeRecord(
          revision: 3,
          paused: true,
          configuration: runtimeConfiguration(),
        ),
      );
      expect(responseSchema.validate(raw).isValid, isTrue);
      final result = AssistanceRuntimeResult.fromCallableData(
        raw,
        expectedScope: runtimeScope(),
        expectedChange: change,
      );
      expect(result.operationRevision, 1);
      expect(result.view.revision, 3);
      expect(result.view.status, AssistanceRuntimeStatus.paused);
      for (final patch in [
        {'outcome': 'applied'},
        {'operationRevision': 2},
        {'operationRevision': null},
      ]) {
        expect(
          () => AssistanceRuntimeResult.fromCallableData(
            {...raw, ...patch},
            expectedScope: runtimeScope(),
            expectedChange: change,
          ),
          throwsFormatException,
        );
      }
    },
  );
  test(
    'pause confirmation must preserve the previously saved configuration',
    () {
      final before = read(
        runtimeResponse(
          revision: 1,
          runtime: runtimeRecord(),
          status: 'configured',
        ),
      );
      final change = before.prepareChange(
        requestId: 'pause:once',
        command: const AssistanceRuntimePause(),
      );
      final raw = runtimeResponse(
        outcome: 'applied',
        operationRevision: 2,
        revision: 2,
        runtime: runtimeRecord(
          revision: 2,
          paused: true,
          configuration: runtimeConfiguration(),
        ),
        status: 'paused',
      );
      expect(
        AssistanceRuntimeResult.fromCallableData(
          raw,
          expectedScope: runtimeScope(),
          expectedChange: change,
        ).view.status,
        AssistanceRuntimeStatus.paused,
      );
      ((raw['view']! as Map)['runtime'] as Map)['configuration'] = null;
      expect(
        () => AssistanceRuntimeResult.fromCallableData(
          raw,
          expectedScope: runtimeScope(),
          expectedChange: change,
        ),
        throwsFormatException,
      );
    },
  );
}
