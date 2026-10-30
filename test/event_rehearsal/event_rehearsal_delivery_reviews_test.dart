import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_rehearsal_assistance_fixtures.dart';
import 'event_rehearsal_delivery_fixtures.dart';

void main() {
  EventRehearsalBootstrap read(Map<String, Object?> data) =>
      EventRehearsalBootstrap.fromCallableData(data);
  Map<String, Object?> copy(Map<String, Object?> data) =>
      (jsonDecode(jsonEncode(data)) as Map).cast<String, Object?>();

  test(
    'canonical reviews share delivery evidence without a live command scope',
    () {
      final wire = practiceDeliveryBootstrap();
      final validator = JsonSchema.create(
        schemas
            .schemaContractsByName['EventRehearsalBootstrapCallableResponse']!,
      );
      expect(validator.validate(wire).isValid, isTrue);
      final reviews = read(wire).deliveryReviews!;
      final row = reviews.deliveries.single as RehearsalActionableDelivery;
      expect(row.evidence.status, AssistanceDeliveryStatus.accepted);
      expect(row.evidence.coordination, isA<AssistanceDeliveryUntracked>());
      expect(row.scope.sessionId, 'session-1');
      expect(row.scope.setupRevision, 1);
      expect(row.actorId, 'actor-01');
      (wire['deliveryReviews']! as Map)['deliveries'] = <Object>[];
      expect(reviews.deliveries.length, 1);
      expect(() => reviews.deliveries.clear(), throwsUnsupportedError);
      expect(() => row.evidence.attempts.clear(), throwsUnsupportedError);
      expect(practiceSnapshot().deliveryReviews, isNull);
      expect(
        practiceDeliverySnapshot().deliveryReviews!.deliveries.single.scope,
        row.scope,
      );
    },
  );

  test('all route evidence and terminal states retain their distinctions', () {
    for (final state in AssistanceDeliveryAttemptState.values) {
      for (final channel in AssistanceDeliveryChannel.values) {
        final row = practiceDeliveryRow(status: state.name);
        ((row['attempts']! as List).single as Map)['channel'] = channel.name;
        final model = read(
          practiceDeliveryBootstrap(row: row),
        ).deliveryReviews!.deliveries.single;
        expect(model.evidence.status.name, state.name);
        expect(model.evidence.attempts.single.channel, channel);
        expect(
          model is RehearsalObservedDelivery,
          [
            AssistanceDeliveryAttemptState.delivered,
            AssistanceDeliveryAttemptState.read,
          ].contains(state),
        );
      }
    }
    final empty = {
      ...practiceDeliveryRow(),
      'deliveryStatus': 'notSubmitted',
      'attempts': <Object>[],
    };
    expect(
      read(
        practiceDeliveryBootstrap(row: empty),
      ).deliveryReviews!.deliveries.single.evidence.status,
      AssistanceDeliveryStatus.notSubmitted,
    );
    final conflict = {
      ...practiceDeliveryRow(),
      'deliveryStatus': 'conflictingEvidence',
    };
    expect(
      read(
        practiceDeliveryBootstrap(row: conflict),
      ).deliveryReviews!.deliveries.single.evidence.status,
      AssistanceDeliveryStatus.conflictingEvidence,
    );
  });

  test(
    'foreign clocks, missing actors and incomplete coverage are rejected',
    () {
      final mutations = <void Function(Map<String, Object?>)>[
        (wire) => (wire['deliveryReviews']! as Map)['coverage'] = 'page',
        (wire) =>
            ((wire['deliveryReviews']! as Map)['context'] as Map)['mode'] =
                'live',
        (wire) =>
            ((wire['deliveryReviews']! as Map)['context'] as Map)['clockId'] =
                'clock:${'f' * 64}',
        (wire) =>
            ((wire['deliveryReviews']! as Map)['context']
                    as Map)['rehearsalId'] =
                'foreign',
        (wire) =>
            ((wire['deliveryReviews']! as Map)['context']
                    as Map)['virtualEventId'] =
                'practice:${'f' * 64}',
        (wire) => (wire['session']! as Map)['setupRevision'] = 2,
        (wire) => (wire['deliveryReviews']! as Map)['deliveries'] = <Object>[],
        (wire) => (wire['actors']! as List).removeAt(0),
        (wire) =>
            (wire['actors']! as List).add((wire['actors']! as List).first),
        (wire) => ((wire['deliveryReviews']! as Map)['deliveries'] as List).add(
          practiceDeliveryRow(),
        ),
        (wire) =>
            ((wire['actors']! as List).first as Map)['status'] = 'present',
        (wire) => (wire['session']! as Map)['status'] = 'complete',
      ];
      for (final mutate in mutations) {
        final wire = copy(practiceDeliveryBootstrap());
        mutate(wire);
        expect(() => read(wire), throwsFormatException);
      }
    },
  );

  test(
    'contradictions and private data cannot masquerade as a valid review',
    () {
      for (final patch in <Map<String, Object?>>[
        {'deliveryStatus': 'failed'},
        {'messageId': 'outbox:${'d' * 64}'},
        {
          'availability': 'sourceChanged',
          'attendeeId': null,
          'actions': <Object>[],
        },
        {'purpose': 'followUp'},
        {'createdAt': 1001},
        {'expiresAt': 3600001},
        {'senderId': 'private'},
        {
          'actions': ['retryDefiniteFailure'],
        },
        {
          'coordination': {
            'kind': 'tracked',
            'phase': 'queued',
            'reason': null,
            'dueAt': 1000,
          },
        },
        {
          'handling': {
            'kind': 'manual',
            'actorUid': 'host-1',
            'at': 1000,
            'authority': 'current',
          },
        },
      ]) {
        final wire = practiceDeliveryBootstrap();
        (((wire['deliveryReviews']! as Map)['deliveries'] as List).first as Map)
            .addAll(patch);
        expect(() => read(wire), throwsFormatException, reason: '$patch');
      }
    },
  );

  test('handoff freezes the exact row and matches the canonical command', () {
    final change = practiceDeliveryChange();
    final command = change.command as RehearsalTakeDelivery;
    final validator = JsonSchema.create(
      schemas.schemaContractsByName['ControlEventRehearsalCallablePayload']!,
    );
    expect(validator.validate(change.toJson()).isValid, isTrue);
    expect(command.toJson(), {
      'kind': 'repairDelivery',
      'actorId': 'actor-01',
      'expectedMessageRevision': 1,
      'expectedReviewHash': 'b' * 64,
      'payload': {'deliveryId': practiceMessageId, 'action': 'manualHandoff'},
    });
    expect(
      () => RehearsalAssistanceChange(
        snapshot: practiceDeliverySnapshot(),
        command: command,
        clientActionId: 'different-review',
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalAssistanceChange(
        snapshot: practiceSnapshot(),
        command: command,
        clientActionId: 'missing-review',
      ),
      throwsFormatException,
    );
  });

  test('applied handoff verifies ownership without fabricating delivery', () {
    final change = practiceDeliveryChange();
    final result = read(practiceDeliveryResult(change));
    change.requireResult(result);
    final row = result.deliveryReviews!.deliveries.single;
    expect(row, isA<RehearsalObservedDelivery>());
    expect(row.evidence.status, AssistanceDeliveryStatus.accepted);
    for (final rowPatch in [
      {'revision': 1},
      {'reviewHash': 'b' * 64},
      {
        'handling': {
          'kind': 'manual',
          'actorUid': 'host-2',
          'at': 1000,
          'authority': 'current',
        },
      },
    ]) {
      final wire = practiceDeliveryResult(change);
      (((wire['deliveryReviews']! as Map)['deliveries'] as List).first as Map)
          .addAll(rowPatch);
      expect(() => change.requireResult(read(wire)), throwsFormatException);
    }
    expect(
      () => change.requireResult(
        read(practiceDeliveryResult(change, status: 'delivered')),
      ),
      throwsFormatException,
    );
    final noReceipt = practiceDeliveryResult(change)..['actions'] = <Object>[];
    expect(() => change.requireResult(read(noReceipt)), throwsFormatException);
  });

  test(
    'exact replay retains late evidence and accepts explicit current-only coverage',
    () {
      final change = practiceDeliveryChange();
      final replay = read(
        practiceDeliveryResult(change, status: 'delivered', laterActions: 1),
      );
      change.requireResult(replay);
      expect(
        replay.deliveryReviews!.deliveries.single.evidence.status,
        AssistanceDeliveryStatus.delivered,
      );
      final replaced = practiceDeliveryResult(change, laterActions: 1);
      final actor = (replaced['actors']! as List).first as Map;
      actor.remove('assistance');
      actor.remove('assistanceMessage');
      actor.remove('assistanceDelivery');
      (replaced['deliveryReviews']! as Map)['deliveries'] = <Object>[];
      change.requireResult(read(replaced));
      (replaced['session']! as Map)['runtimeRevision'] = 5;
      expect(() => change.requireResult(read(replaced)), throwsFormatException);
    },
  );
}
