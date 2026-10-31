import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_help_requests.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_rehearsal_accountability_fixtures.dart';
import 'event_rehearsal_assistance_fixtures.dart';
import 'event_rehearsal_delivery_fixtures.dart';
import 'event_rehearsal_membership_fixtures.dart';

void main() {
  final guidance = practicePlan().toJson()['guidance'];
  final shared =
      jsonDecode(
            File(
              'contracts/shared/event_rehearsal_assistance.schema.json',
            ).readAsStringSync(),
          )
          as Map;
  final definitions = shared['definitions'] as Map;
  final deliveryVariants =
      (definitions['automationDelivery'] as Map)['oneOf'] as List;
  final policySchema = contractSchema('EventAssistanceLateJoinDecision');

  test('every schema outcome and command kind is represented natively', () {
    for (final variant in (definitions['outcome'] as Map)['oneOf'] as List) {
      final props = (variant as Map)['properties'] as Map;
      final kind = props['kind'] as Map;
      final kinds = kind['enum'] as List? ?? [kind['const']];
      final detailKeys = props.keys.where((key) => key != 'kind').toList();
      expect(detailKeys.length, lessThanOrEqualTo(1));
      final detailKey = detailKeys.isEmpty ? null : detailKeys.single;
      final details = detailKey == null
          ? [null]
          : (props[detailKey] as Map)['enum'] as List;
      for (final name in kinds) {
        for (final detail in details) {
          final wire = <String, Object?>{
            'kind': name,
            if (detailKey != null) detailKey as String: detail,
          };
          final outcome = RehearsalDeliveryOutcome.fromJson(wire);
          expect(outcome.toJson(), wire);
          expect(JsonSchema.create(variant).validate(wire).isValid, isTrue);
        }
      }
    }
    const delivered = RehearsalDeliveryConfirmed(
      RehearsalConfirmedDelivery.delivered,
    );
    final commands = <RehearsalAssistanceCommand>[
      RehearsalPublishInstruction(actorId: 'actor-01', plan: practicePlan()),
      RehearsalDispatchMessage(
        actorId: 'actor-01',
        messageId: practiceMessageId,
        outcome: delivered,
      ),
      RehearsalRecordReceipt(
        actorId: 'actor-01',
        messageId: practiceMessageId,
        attemptId: 'attempt-1',
        outcome: delivered,
      ),
      RehearsalConfigureAutomation(
        actorId: 'actor-01',
        plan: practicePlan(),
        outcomes: [delivered],
      ),
      RehearsalPauseAutomation(actorId: 'actor-01'),
      RehearsalResumeAutomation(actorId: 'actor-01'),
      practiceDeliveryChange().command,
      practiceVisitChange().command,
      practiceMembershipChange().command,
      RehearsalResolveAssistance(
        snapshot:
            EventRehearsalBootstrap.fromCallableData(
                  practiceBootstrap(helpRequests: practiceHelpRequests()),
                ).helpRequests!.cases.single
                as RehearsalOpenHelpCase,
        actorUid: 'host-1',
        decision: const AssistanceCaseDecision.resolve(),
      ),
    ];
    // Generated schemas resolve shared references in the canonical command union.
    final payload = contractSchema('ControlEventRehearsalCallablePayload');
    final commandSchema = ((payload['properties'] as Map)['assistance'] as Map);
    final sourceKinds = (commandSchema['oneOf'] as List).map(
      (variant) =>
          (((variant as Map)['properties'] as Map)['kind'] as Map)['const'],
    );
    expect(
      commands.map((command) => command.kind),
      unorderedEquals(sourceKinds),
    );
    final validator = JsonSchema.create(commandSchema);
    for (final command in commands) {
      expect(
        validator.validate(command.toJson()).isValid,
        isTrue,
        reason: command.kind,
      );
    }
    final max =
        ((((definitions['automation'] as Map)['properties'] as Map)['outcomes']
                as Map)['maxItems']
            as int);
    for (var count = 1; count <= max; count++) {
      expect(
        RehearsalConfigureAutomation(
          actorId: 'actor-01',
          plan: practicePlan(),
          outcomes: List.filled(count, delivered),
        ).outcomes.length,
        count,
      );
    }
    expect(
      () => RehearsalConfigureAutomation(
        actorId: 'actor-01',
        plan: practicePlan(),
        outcomes: List.filled(max + 1, delivered),
      ),
      throwsFormatException,
    );
  });

  test(
    'every schema policy kind and reason has a precise native representation',
    () {
      final validator = JsonSchema.create(policySchema);
      for (final variant in policySchema['anyOf']! as List) {
        final properties = (variant as Map)['properties'] as Map;
        final kind = (properties['kind'] as Map)['const'];
        final reasons =
            (properties['reason'] as Map?)?['enum'] as List? ?? [null];
        for (final reason in reasons) {
          final wire = <String, Object?>{
            'kind': kind,
            'reason': ?reason,
            if (properties.containsKey('guidance')) 'guidance': guidance,
            if (properties.containsKey('messageKey'))
              'messageKey': 'practice-current',
            if (properties.containsKey('shouldSend')) 'shouldSend': false,
            if (properties.containsKey('nextEvaluationAt'))
              'nextEvaluationAt': 60000,
          };
          expect(validator.validate(wire).isValid, isTrue);
          final value = AssistanceJoinDecision.fromJson(wire);
          final decoded = switch (value) {
            AssistanceJoinResolved(:final reason) => ('resolved', reason.name),
            AssistanceJoinCancelled(:final reason) => (
              'cancelled',
              reason.name,
            ),
            AssistanceJoinExpired(:final reason) => ('expired', reason.name),
            AssistanceJoinWaiting(:final reason) => ('wait', reason.name),
            AssistanceJoinNeedsHost(:final reason) => (
              'hostDecision',
              reason.name,
            ),
            AssistanceJoiningUpdate() => ('update', null),
          };
          expect(decoded, (kind, reason));
          if (value is AssistanceJoiningUpdate) {
            expect(value.shouldSend, isFalse);
            expect(value.nextEvaluationAt, 60000);
            expect(value.messageKey, 'practice-current');
            expect(value.guidance.destination, isA<AssistanceFixedPlace>());
          }
        }
      }
      final review =
          AssistanceJoinDecision.fromJson({
                'kind': 'hostDecision',
                'reason': 'missingInformation',
                'guidance': null,
              })
              as AssistanceJoinNeedsHost;
      expect(review.guidance, isNull);
      final ready =
          AssistanceJoinDecision.fromJson({
                'kind': 'update',
                'guidance': guidance,
                'messageKey': 'practice-current',
                'shouldSend': true,
                'nextEvaluationAt': null,
              })
              as AssistanceJoiningUpdate;
      expect(ready.nextEvaluationAt, isNull);
      expect(ready.shouldSend, isTrue);
    },
  );

  test(
    'every delivery variant preserves its evidence, wait or review reason',
    () {
      for (final variant in deliveryVariants) {
        final properties = (variant as Map)['properties'] as Map;
        final kind = (properties['kind'] as Map)['const'];
        final reasonProperty = properties['reason'] as Map?;
        final reasons =
            reasonProperty?['enum'] as List? ?? [reasonProperty?['const']];
        for (final reason in reasons) {
          final wire = <String, Object?>{
            'kind': kind,
            'reason': ?reason,
            if (properties.containsKey('attemptIds'))
              'attemptIds': ['attempt-1'],
            if (properties.containsKey('notBefore')) 'notBefore': 60000,
          };
          expect(JsonSchema.create(variant).validate(wire).isValid, isTrue);
          final value = RehearsalDeliveryEvaluation.fromJson(wire);
          final decoded = switch (value) {
            RehearsalDeliveryPaused() => ('paused', null),
            RehearsalDeliveryNotApplicable() => ('notApplicable', null),
            RehearsalDeliveryScriptExhausted() => ('scriptExhausted', null),
            RehearsalDeliveryStopped(:final reason) => ('stop', reason.name),
            RehearsalDeliveryDelivered() => ('delivered', null),
            RehearsalDeliveryReconcile() => ('reconcile', null),
            RehearsalDeliveryRefreshFacts(:final reason) => (
              'refreshFacts',
              reason.name,
            ),
            RehearsalDeliveryBackoff() => ('wait', 'retryBackoff'),
            RehearsalDeliveryNeedsHost(:final reason) => (
              'hostDecision',
              reason.name,
            ),
          };
          expect(decoded, (kind, reason));
          if (value is RehearsalDeliveryReconcile) {
            expect(value.notBefore, 60000);
            expect(value.attemptIds, ['attempt-1']);
            expect(() => value.attemptIds.clear(), throwsUnsupportedError);
          }
          if (value is RehearsalDeliveryDelivered) {
            expect(value.attemptIds, ['attempt-1']);
            expect(() => value.attemptIds.clear(), throwsUnsupportedError);
          }
          if (value is RehearsalDeliveryBackoff) expect(value.notBefore, 60000);
        }
      }
    },
  );

  test('saved plan and script remain immutable across caller edits', () {
    final source = practiceAutomation(
      consumed: 1,
      evaluation: {
        'at': 1000,
        'policy': {'kind': 'wait', 'reason': 'departureUnconfirmed'},
        'delivery': {'kind': 'notApplicable'},
      },
    );
    final parsed = RehearsalAssistanceAutomation.fromJson(source);
    expect(parsed.plan.toJson(), practicePlan().toJson());
    expect(parsed.remainingOutcomes, 1);
    expect(parsed.status, RehearsalAutomationStatus.enabled);
    expect(parsed.evaluation!.policy, isA<AssistanceJoinWaiting>());
    (source['outcomes']! as List).clear();
    ((source['plan']! as Map)['routes'] as List)[0] = 'catchEventRcs';
    expect(parsed.outcomes.length, 2);
    expect(parsed.plan.routes.single, AssistanceMessageRoute.catchEventSms);
    expect(() => parsed.outcomes.clear(), throwsUnsupportedError);
    final script = <RehearsalDeliveryOutcome>[
      const RehearsalDeliveryUnknown(RehearsalDeliveryUncertainty.timeout),
    ];
    final command = RehearsalConfigureAutomation(
      actorId: 'actor-01',
      plan: parsed.plan,
      outcomes: script,
    );
    script.clear();
    expect(command.outcomes.single, isA<RehearsalDeliveryUnknown>());
    final body = command.toJson();
    (body['outcomes']! as List)[0] = {'kind': 'delivered'};
    expect(command.outcomes.single, isA<RehearsalDeliveryUnknown>());
    for (final script in [
      <RehearsalDeliveryOutcome>[],
      List<RehearsalDeliveryOutcome>.filled(
        7,
        const RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
      ),
    ]) {
      expect(
        () => RehearsalConfigureAutomation(
          actorId: 'actor-01',
          plan: practicePlan(),
          outcomes: script,
        ),
        throwsFormatException,
      );
    }
  });

  test('plan parsing preserves absent, empty and concrete later choices', () {
    for (final later in [
      null,
      <AssistanceLaterJoiningChoice>[],
      [
        AssistanceLaterJoiningChoice(
          label: 'Studio',
          target: const AssistanceFixedPlace(
            placeId: 'studio',
            lateEntry: AssistanceLateEntry.allowed,
          ),
        ),
      ],
    ]) {
      final plan = practicePlan(laterChoices: later).toJson();
      expect(RehearsalAssistancePlan.fromJson(plan).toJson(), plan);
    }
    expect(
      () => RehearsalAssistancePlan.fromJson({
        ...practicePlan().toJson(),
        'laterChoices': null,
      }),
      throwsFormatException,
    );
  });

  test(
    'bootstrap retains automation without inventing a message or attendance',
    () {
      final snapshot = EventRehearsalBootstrap.fromCallableData(
        practiceBootstrap(
          actors: [
            {...practiceActor(), 'assistanceAutomation': practiceAutomation()},
          ],
        ),
      );
      expect(snapshot.actors.single.assistanceAutomation!.evaluation, isNull);
      expect(snapshot.actors.single.assistanceMessage, isNull);
      expect(snapshot.presentCount, 0);
      expect(
        EventRehearsalActor.fromMap(practiceActor()).assistanceAutomation,
        isNull,
      );
      final pending = RehearsalAssistanceAutomation.fromJson(
        practiceAutomation(
          consumed: 1,
          evaluation: {
            'at': 1000,
            'policy': null,
            'delivery': {
              'kind': 'reconcile',
              'attemptIds': ['attempt-1'],
              'notBefore': 121000,
            },
          },
        ),
      );
      expect(pending.evaluation!.delivery, isA<RehearsalDeliveryReconcile>());
      final paused = RehearsalAssistanceAutomation.fromJson(
        practiceAutomation(
          status: 'paused',
          consumed: 1,
          evaluation: {
            'at': 1000,
            'policy': null,
            'delivery': {'kind': 'paused'},
          },
        ),
      );
      expect(paused.nextOutcomeIndex, 1);
      expect(paused.evaluation!.delivery, isA<RehearsalDeliveryPaused>());
    },
  );

  test(
    'unknown states, malformed scripts and unsupported authority fail closed',
    () {
      for (final wire in [
        {...practiceAutomation(), 'clockId': 'live:event'},
        {...practiceAutomation(), 'status': 'running'},
        {...practiceAutomation(), 'nextOutcomeIndex': 3},
        {...practiceAutomation(), 'nextOutcomeIndex': -1},
        {...practiceAutomation(), 'outcomes': <Object?>[]},
        {
          ...practiceAutomation(),
          'outcomes': [
            {'kind': 'reserved'},
          ],
        },
        {...practiceAutomation(), 'senderId': 'real-sender'},
        {
          ...practiceAutomation(),
          'evaluation': {
            'at': 1000,
            'policy': null,
            'delivery': {'kind': 'dispatch'},
          },
        },
      ]) {
        expect(
          () => RehearsalAssistanceAutomation.fromJson(wire),
          throwsFormatException,
        );
      }
      for (final delivery in [
        {'kind': 'wait', 'reason': 'assumeLater', 'notBefore': 5},
        {'kind': 'delivered', 'attemptIds': <String>[]},
        {
          'kind': 'reconcile',
          'attemptIds': ['a', 'a'],
          'notBefore': 5,
        },
        {'kind': 'hostDecision', 'reason': 'unknown'},
      ]) {
        expect(
          () => RehearsalDeliveryEvaluation.fromJson(delivery),
          throwsFormatException,
        );
      }
      for (final policy in [
        {'kind': 'resolved', 'reason': 'probablyJoined'},
        {'kind': 'wait', 'reason': 'departureUnconfirmed', 'extra': true},
        {
          'kind': 'update',
          'guidance': guidance,
          'messageKey': 'm',
          'shouldSend': false,
        },
      ]) {
        expect(
          () => AssistanceJoinDecision.fromJson(policy),
          throwsFormatException,
        );
      }
    },
  );
}
