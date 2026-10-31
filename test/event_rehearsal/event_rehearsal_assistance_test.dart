import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_view.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_rehearsal_assistance_fixtures.dart';

void main() {
  test(
    'shared rules preserve template wire format and unresolved defaults',
    () {
      final rules = practiceRules(
        destination: const LateJoinConfirmedProgress(),
      );
      final template = AssistanceLateJoinTemplate.withRules(
        setting: const AssistanceTemplateEnabled(
          AssistanceTemplateAuthority.prepare,
        ),
        rules: rules,
      );
      expect(
        AssistanceLateJoinTemplate.fromJson(template.toJson()).toJson(),
        template.toJson(),
      );
      expect(template.destination, isA<LateJoinConfirmedProgress>());
      expect(() => practicePlan(rules: rules), throwsFormatException);
      expect(
        () => AssistanceLateJoinRules.fromJson({
          ...rules.toJson(),
          'updateOn': 'clock',
        }),
        throwsFormatException,
      );
    },
  );

  test('practice plans freeze ordered routes and later choices', () {
    final routes = [
      AssistanceMessageRoute.catchEventRcs,
      AssistanceMessageRoute.catchEventSms,
    ];
    final choices = [
      AssistanceLaterJoiningChoice(
        label: 'Studio',
        target: const AssistanceFixedPlace(
          placeId: 'studio',
          lateEntry: AssistanceLateEntry.allowed,
        ),
      ),
    ];
    final plan = practicePlan(routes: routes, laterChoices: choices);
    final before = plan.toJson();
    routes.clear();
    choices.clear();
    expect(plan.toJson(), before);
    expect(() => plan.routes.clear(), throwsUnsupportedError);
    expect(() => plan.laterChoices!.clear(), throwsUnsupportedError);
    expect(practicePlan().toJson().containsKey('laterChoices'), isFalse);
    expect(practicePlan(laterChoices: []).toJson()['laterChoices'], isEmpty);
    expect(before['departureConfirmed'], isFalse);
    expect(before['routes'], ['catchEventRcs', 'catchEventSms']);
    expect(before.containsKey('senderId'), isFalse);
    expect(() => practicePlan(routes: []), throwsFormatException);
    expect(
      () => practicePlan(
        routes: [
          AssistanceMessageRoute.catchEventSms,
          AssistanceMessageRoute.catchEventSms,
        ],
      ),
      throwsFormatException,
    );
    expect(
      () => practicePlan(
        rules: practiceRules(
          unanswered: LateJoinUnansweredRule.hostReviewAtDeadline,
        ),
      ),
      throwsFormatException,
    );
  });

  test(
    'every closed command and outcome matches the existing callable schema',
    () {
      final confirmed = <RehearsalConfirmedOutcome>[
        for (final result in RehearsalConfirmedDelivery.values)
          RehearsalDeliveryConfirmed(result),
        for (final failure in RehearsalDeliveryFailure.values)
          RehearsalDeliveryFailed(failure),
      ];
      final commands = <RehearsalAssistanceCommand>[
        RehearsalPublishInstruction(actorId: 'actor-01', plan: practicePlan()),
        for (final route in AssistanceMessageRoute.values)
          RehearsalPublishInstruction(
            actorId: 'actor-01',
            plan: practicePlan(routes: [route]),
          ),
        for (final outcome in <RehearsalDeliveryOutcome>[
          ...confirmed,
          for (final reason in RehearsalDeliveryUncertainty.values)
            RehearsalDeliveryUnknown(reason),
        ])
          RehearsalDispatchMessage(
            actorId: 'actor-01',
            messageId: practiceMessageId,
            outcome: outcome,
          ),
        RehearsalPauseAutomation(actorId: 'actor-01'),
        RehearsalResumeAutomation(actorId: 'actor-01'),
        for (final outcome in <RehearsalDeliveryOutcome>[
          ...confirmed,
          for (final reason in RehearsalDeliveryUncertainty.values)
            RehearsalDeliveryUnknown(reason),
        ])
          RehearsalConfigureAutomation(
            actorId: 'actor-01',
            plan: practicePlan(),
            outcomes: [outcome],
          ),
        for (final outcome in confirmed)
          RehearsalRecordReceipt(
            actorId: 'actor-01',
            messageId: practiceMessageId,
            attemptId: 'attempt-1',
            outcome: outcome,
          ),
      ];
      final schema = JsonSchema.create(
        contractSchema('ControlEventRehearsalCallablePayload'),
      );
      for (final command in commands) {
        final change = RehearsalAssistanceChange(
          snapshot: practiceSnapshot(),
          command: command,
          clientActionId: 'practice_request_1',
        );
        final validation = schema.validate(change.toJson());
        expect(
          validation.isValid,
          isTrue,
          reason: '${command.toJson()}: ${validation.errors}',
        );
      }
    },
  );

  test('a frozen command carries its reviewed reset generation', () {
    final change = practiceChange();
    expect(
      change.toJson()['expectedSetupRevision'],
      change.session.setupRevision,
    );
    final schema = JsonSchema.create(
      contractSchema('ControlEventRehearsalCallablePayload'),
    );
    final withoutGeneration = {...change.toJson()}
      ..remove('expectedSetupRevision');
    expect(schema.validate(withoutGeneration).isValid, isFalse);
  });

  test(
    'Host retains intention, instruction and evidence without checking in',
    () {
      final response = practiceBootstrap(
        actors: [practiceActor(withAssistance: true, responded: true)],
      );
      final bootstrap = EventRehearsalBootstrap.fromCallableData(response);
      final actor = bootstrap.actors.single;
      expect(actor.assistance!.intention, isA<AssistanceOnMyWay>());
      expect(actor.assistanceMessage!.responseLabel, 'On my way');
      expect(actor.assistanceMessage!.canRespond, isFalse);
      expect(
        actor.assistanceDelivery!.attempts.single.status,
        RehearsalAttemptStatus.accepted,
      );
      expect(bootstrap.presentCount, 0);
      expect(actor.status, EventRehearsalActorStatus.expected);
      expect(EventRehearsalActor.fromMap(practiceActor()).assistance, isNull);
    },
  );

  test('malformed and mismatched Host assistance projections fail closed', () {
    final valid = practiceActor(withAssistance: true);
    final badActors = <Map<String, Object?>>[
      {...valid, 'assistance': null},
      {...valid, 'assistanceMessage': null},
      {...valid, 'assistanceDelivery': null},
      {
        ...valid,
        'assistanceMessage': {
          ...practiceInstruction(),
          'messageId': 'outbox:${'b' * 64}',
        },
      },
      {
        ...valid,
        'assistanceMessage': {...practiceInstruction(), 'canRespond': 'yes'},
      },
      {
        ...valid,
        'assistanceMessage': {
          ...practiceInstruction(),
          'responseChoiceId': 'on-my-way',
        },
      },
      {
        ...valid,
        'assistanceMessage': {
          ...practiceInstruction(responded: true),
          'responseChoiceId': 'other',
        },
      },
      {
        ...valid,
        'assistanceMessage': {
          ...practiceInstruction(responded: true),
          'canRespond': true,
        },
      },
      {
        ...valid,
        'assistanceDelivery': {
          'conflictingEvidence': false,
          'attempts': [
            {
              'attemptId': 'attempt-1',
              'routeId': 'catchEventSms',
              'status': 'assumedDelivered',
            },
          ],
        },
      },
    ];
    for (final actor in badActors) {
      expect(() => EventRehearsalActor.fromMap(actor), throwsFormatException);
    }
  });

  test(
    'command review rejects unavailable actors, closed runs and exhausted logs',
    () {
      final command = RehearsalPublishInstruction(
        actorId: 'actor-01',
        plan: practicePlan(),
      );
      for (final data in [
        practiceBootstrap(status: 'draft'),
        practiceBootstrap(status: 'complete'),
        practiceBootstrap(actionCount: 500),
        practiceBootstrap(actors: []),
      ]) {
        expect(
          () => RehearsalAssistanceChange(
            snapshot: EventRehearsalBootstrap.fromCallableData(data),
            command: command,
            clientActionId: 'practice_request_1',
          ),
          throwsFormatException,
        );
      }
      expect(
        () => RehearsalAssistanceChange(
          snapshot: practiceSnapshot(),
          command: command,
          clientActionId: 'bad',
        ),
        throwsFormatException,
      );
      final receipt = RehearsalRecordReceipt(
        actorId: 'actor-01',
        messageId: practiceMessageId,
        attemptId: 'attempt-1',
        outcome: const RehearsalDeliveryConfirmed(
          RehearsalConfirmedDelivery.delivered,
        ),
      );
      expect(
        () => RehearsalAssistanceChange(
          snapshot: EventRehearsalBootstrap.fromCallableData(
            practiceBootstrap(status: 'complete'),
          ),
          command: receipt,
          clientActionId: 'practice_request_1',
        ),
        returnsNormally,
      );
    },
  );

  test(
    'result proof binds the reviewed action, session, organizer and reset generation',
    () {
      final change = practiceChange();
      final receipt = practiceReceipt(change);
      final invalid = [
        practiceBootstrap(runtimeRevision: 5),
        practiceBootstrap(
          runtimeRevision: 5,
          sessionId: 'other',
          actions: [receipt],
        ),
        practiceBootstrap(
          runtimeRevision: 5,
          organizerId: 'other',
          actions: [receipt],
        ),
        practiceBootstrap(
          runtimeRevision: 5,
          setupRevision: 2,
          actions: [receipt],
        ),
        practiceBootstrap(actions: [receipt]),
        for (final field in ['clientActionId', 'actorId', 'kind', 'name'])
          practiceBootstrap(
            runtimeRevision: 5,
            actions: [
              {...receipt, field: 'other'},
            ],
          ),
        practiceBootstrap(
          runtimeRevision: 6,
          actions: [
            {...receipt, 'runtimeRevision': 6},
          ],
        ),
      ];
      for (final response in invalid) {
        expect(
          () => change.requireResult(
            EventRehearsalBootstrap.fromCallableData(response),
          ),
          throwsFormatException,
        );
      }
      // An exact retry may return the current, newer frame while retaining its receipt.
      expect(
        () => change.requireResult(
          EventRehearsalBootstrap.fromCallableData(
            practiceBootstrap(runtimeRevision: 7, actions: [receipt]),
          ),
        ),
        returnsNormally,
      );
    },
  );
}
