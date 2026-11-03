import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_platform/schema_contracts/generated/callables/repair_event_assistance_delivery_callable_request.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_assistance_deliveries_fixtures.dart';

void main() {
  AssistanceHostDelivery parse(Map<String, Object?> row, {int now = 2000}) =>
      AssistanceHostDelivery.fromJson(
        row,
        scope: deliveryQuery().scopeFor(deliveryId()),
        serverTime: now,
      );
  // A view row has the shape the single-delivery command response returns.
  final rowSchema = JsonSchema.create(
    contractSchema('EventAssistanceDeliveryCallableResponse'),
  );
  Map<String, Object?> rowResponse(Map<String, Object?> row) => {
    'context': deliveryQuery().context,
    'serverTime': 2000,
    'outcome': 'applied',
    'operationRevision': row['revision'],
    'view': row,
  };

  test(
    'canonical requests keep one immutable message review and no caller authority',
    () {
      final change = deliveryChange();
      final input = RepairEventAssistanceDeliveryCallableRequest(
        command: change.command,
        expectedMessageRevision: change.snapshot.revision,
        expectedReviewHash: change.snapshot.reviewHash,
      ).toJson();
      expect(
        JsonSchema.create(
          contractSchema('RepairEventAssistanceDeliveryCallablePayload'),
        ).validate(input).isValid,
        isTrue,
      );
      expect(change.command['kind'], 'repairDelivery');
      expect(change.command['payload'], {
        'deliveryId': deliveryId(),
        'action': 'manualHandoff',
      });
      expect(input.keys, isNot(contains('actorUid')));
      (change.command['payload']! as Map<String, Object?>)['action'] = 'bad';
      expect((change.command['payload']! as Map)['action'], 'manualHandoff');
      expect(
        () => change.snapshot.attempts.add((
          channel: AssistanceDeliveryChannel.sms,
          state: AssistanceDeliveryAttemptState.failed,
          at: 2000,
        )),
        throwsUnsupportedError,
      );
      expect(
        JsonSchema.create(
          contractSchema('EventAssistanceDeliveryCallableResponse'),
        ).validate(deliveryResultResponse(change)).isValid,
        isTrue,
      );
    },
  );

  test(
    'availability separates actionable, observed and stale guest identities',
    () {
      expect(parse(deliveryRow()), isA<AssistanceActionableDelivery>());
      expect(
        parse(deliveryRow(patch: {'actions': []})),
        isA<AssistanceObservedDelivery>(),
      );
      expect(
        parse(
          deliveryRow(
            patch: {
              'availability': 'sourceChanged',
              'attendeeId': null,
              'actions': [],
            },
          ),
        ),
        isA<AssistanceStaleDelivery>(),
      );
      for (final patch in <Map<String, Object?>>[
        {'availability': 'sourceChanged'},
        {'attendeeId': null},
        {
          'actions': ['reconcile'],
        },
        {
          'actions': ['manualHandoff', 'manualHandoff'],
        },
        {'lifecycle': 'responded'},
        {'lifecycle': 'cancelled'},
        {'expiresAt': 2000},
        {
          'handling': {
            'kind': 'manual',
            'actorUid': 'host-1',
            'at': 1500,
            'authority': 'current',
          },
          'revision': 1,
        },
      ]) {
        expect(() => parse(deliveryRow(patch: patch)), throwsFormatException);
      }
      expect(
        parse(
          deliveryRow(
            patch: {
              'handling': {
                'kind': 'manual',
                'actorUid': 'removed-host',
                'at': 1500,
                'authority': 'revoked',
              },
              'revision': 1,
            },
          ),
        ),
        isA<AssistanceActionableDelivery>(),
      );
    },
  );

  test('every channel and recorded outcome remains distinct', () {
    for (final channel in AssistanceDeliveryChannel.values) {
      for (final state in AssistanceDeliveryAttemptState.values) {
        final row = deliveryRow(
          patch: {
            'revision': 2,
            'deliveryStatus': state.name,
            'actions': [],
            'attempts': [
              {'channel': channel.name, 'state': state.name, 'at': 1500},
            ],
          },
        );
        expect(rowSchema.validate(rowResponse(row)).isValid, isTrue);
        final parsed = parse(row);
        expect(parsed.status.name, state.name);
        expect(parsed.attempts.single.channel, channel);
        expect(parsed.attempts.single.state, state);
      }
    }
    final mixed = deliveryRow(
      patch: {
        'revision': 5,
        'deliveryStatus': 'unknown',
        'attempts': [
          {'channel': 'whatsapp', 'state': 'unknown', 'at': 1600},
          {'channel': 'sms', 'state': 'failed', 'at': 1500},
        ],
      },
    );
    expect(parse(mixed).status, AssistanceDeliveryStatus.unknown);
    expect(
      () => parse({...mixed, 'deliveryStatus': 'failed'}),
      throwsFormatException,
    );
    expect(
      parse({...mixed, 'deliveryStatus': 'conflictingEvidence'}).status,
      AssistanceDeliveryStatus.conflictingEvidence,
    );
  });

  test(
    'canonical purpose and attempt unions require a native parsing decision',
    () {
      final schema =
          jsonDecode(
                File(
                  'contracts/shared/event_assistance_delivery_review.schema.json',
                ).readAsStringSync(),
              )
              as Map;
      final row =
          ((schema['definitions'] as Map)['View'] as Map)['oneOf'] as List;
      final properties = (row.first as Map)['properties'] as Map;
      expect(
        (properties['purpose'] as Map)['enum'],
        unorderedEquals(AssistanceMessagePurpose.values.map((e) => e.name)),
      );
      expect(
        (properties['deliveryStatus'] as Map)['enum'],
        unorderedEquals(AssistanceDeliveryStatus.values.map((e) => e.name)),
      );
      for (final purpose in AssistanceMessagePurpose.values) {
        expect(
          parse(deliveryRow(patch: {'purpose': purpose.name})).purpose,
          purpose,
        );
      }
    },
  );

  test(
    'coordinator states follow every canonical phase/reason without inventing delivery',
    () {
      final source =
          jsonDecode(
                File(
                  'contracts/operations/event_assistance_delivery_work.schema.json',
                ).readAsStringSync(),
              )
              as Map;
      final variants =
          (((source['properties'] as Map)['checkpoint'] as Map)['oneOf']
              as List);
      final actualPhases = <String>{};
      for (final variant in variants.cast<Map>()) {
        final props = variant['properties'] as Map;
        final phase = (props['phase'] as Map)['const'] as String;
        actualPhases.add(phase);
        final reason = props['reason'] as Map;
        final reasons = reason['enum'] as List? ?? [reason['const']];
        for (final reason in reasons) {
          final row = deliveryRow(
            patch: {
              'coordination': {
                'kind': 'tracked',
                'phase': phase,
                'reason': reason,
                'dueAt': phase == 'complete' ? null : 10000,
              },
            },
          );
          final model = parse(row);
          expect(model.status, AssistanceDeliveryStatus.notSubmitted);
          expect(model.coordination, switch (phase) {
            'queued' => isA<AssistanceDeliveryQueued>(),
            'complete' => isA<AssistanceDeliveryComplete>(),
            'receipt' => isA<AssistanceDeliveryAwaitingReceipt>(),
            'retry' => isA<AssistanceDeliveryRetrying>(),
            'review' => isA<AssistanceDeliveryNeedsReview>(),
            _ => throw StateError('Handle new phase $phase'),
          });
        }
      }
      expect(actualPhases, {
        'queued',
        'complete',
        'receipt',
        'retry',
        'review',
      });
      expect(
        parse(
          deliveryRow(
            patch: {
              'coordination': {'kind': 'untracked'},
            },
          ),
        ).coordination,
        isA<AssistanceDeliveryUntracked>(),
      );
      for (final c in [
        {
          'kind': 'tracked',
          'phase': 'complete',
          'reason': 'hostStopped',
          'dueAt': 5000,
        },
        {
          'kind': 'tracked',
          'phase': 'queued',
          'reason': 'delivered',
          'dueAt': 5000,
        },
        {
          'kind': 'tracked',
          'phase': 'receipt',
          'reason': 'delivered',
          'dueAt': 5000,
        },
        {
          'kind': 'tracked',
          'phase': 'review',
          'reason': 'providerPending',
          'dueAt': 5000,
        },
        {
          'kind': 'tracked',
          'phase': 'retry',
          'reason': 'new-code',
          'dueAt': 5000,
        },
        {'kind': 'untracked', 'dueAt': 5000},
      ]) {
        expect(
          () => parse(deliveryRow(patch: {'coordination': c})),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'foreign fields, unsafe numbers, unknown states and invalid times fail closed',
    () {
      for (final patch in <Map<String, Object?>>[
        {'messageId': deliveryId(2)},
        {'messageId': 'outbox:not-a-hash'},
        {'recipientEndpointId': 'leak'},
        {'reviewHash': 'x' * 64},
        {'revision': -1},
        {'revision': 1.5},
        {'revision': 9007199254740992},
        {'revision': double.infinity},
        {'createdAt': 2001},
        {'expiresAt': 999},
        {'purpose': 'new-purpose'},
        {'lifecycle': 'new-status'},
        {
          'attempts': [
            {'channel': 'sms', 'state': 'unknown', 'at': 999},
          ],
        },
        {
          'attempts': [
            {'channel': 'sms', 'state': 'unknown', 'at': 2001},
          ],
        },
        {
          'attempts': List.filled(7, {
            'channel': 'sms',
            'state': 'unknown',
            'at': 1500,
          }),
        },
        {
          'handling': {
            'kind': 'manual',
            'actorUid': 'host-1',
            'at': 2001,
            'authority': 'current',
          },
        },
      ]) {
        expect(() => parse(deliveryRow(patch: patch)), throwsFormatException);
      }
    },
  );

  test('page identity, ordering and continuation cannot invent coverage', () {
    final rows = List.generate(
      50,
      (i) => deliveryRow(messageId: deliveryId(i + 1)),
    );
    final query = deliveryQuery();
    for (final row in rows) {
      expect(rowSchema.validate(rowResponse(row)).isValid, isTrue);
    }
    final page = deliveryPage(rows: rows, hasMore: true);
    expect(page.nextQuery, deliveryQuery(cursor: deliveryId(50)));
    expect(() => page.deliveries.clear(), throwsUnsupportedError);
    expect(deliveryQuery(), query);
    expect(deliveryQuery().hashCode, query.hashCode);
    EventAssistanceDeliveriesPage pageOf(
      List<AssistanceDeliveryViewDocument> views, {
      bool hasMore = false,
      EventAssistanceDeliveryQuery? expected,
    }) => EventAssistanceDeliveriesPage.fromViews(
      query: expected ?? query,
      views: views,
      hasMore: hasMore,
      nowMillis: 2000,
    );
    AssistanceDeliveryViewDocument patched(
      Map<String, Object?> row,
      Map<String, Object?> data,
    ) {
      final view = deliveryView(row);
      return (
        id: view.id,
        data: {...view.data, ...data},
        evaluatedAtMillis: view.evaluatedAtMillis,
      );
    }

    final views = rows.map(deliveryView).toList();
    for (final wrong in [
      () => pageOf([
        patched(rows.first, {'eventId': 'foreign'}),
      ]),
      () => pageOf([
        patched(rows.first, {'organizerId': 'foreign'}),
      ]),
      () => pageOf([
        patched(rows.first, {'messageId': deliveryId(9)}),
      ]),
      () => pageOf([
        patched(rows.first, {'sourceCoverage': 'invalidSource'}),
      ]),
      () => pageOf([
        patched(rows.first, {'view': null}),
      ]),
      () => pageOf([
        patched(rows.first, {'relevantUntilMillis': null}),
      ]),
      () => pageOf(views.reversed.toList()),
      () => pageOf([views.first, views.first]),
      () => pageOf([views.first], hasMore: true),
      () => pageOf([], hasMore: true),
      () => pageOf([
        ...views,
        deliveryView(deliveryRow(messageId: deliveryId(51))),
      ]),
      () => pageOf(views, expected: deliveryQuery(cursor: deliveryId())),
    ]) {
      expect(wrong, throwsFormatException);
    }
  });

  test('a handoff lapses on the app clock at relevantUntilMillis', () {
    final row = deliveryRow();
    EventAssistanceDeliveriesPage at(int now) =>
        EventAssistanceDeliveriesPage.fromViews(
          query: deliveryQuery(),
          views: [deliveryView(row, relevantUntil: 5000)],
          hasMore: false,
          nowMillis: now,
        );
    expect(at(4999).deliveries.single, isA<AssistanceActionableDelivery>());
    expect(at(4999).nextActionLapseMillis, 5000);
    expect(at(5000).deliveries.single, isA<AssistanceObservedDelivery>());
    expect(at(5000).nextActionLapseMillis, isNull);
  });

  test(
    'applied handoff must preserve attempts and belong to the acting host',
    () {
      final change = deliveryChange();
      final result = deliveryResult(change);
      expect(result.operationRevision, 1);
      expect(result.view, isA<AssistanceObservedDelivery>());
      expect(
        (result.view.handling as AssistanceManualDeliveryHandling).actorUid,
        'host-1',
      );
      for (final patch in <Map<String, Object?>>[
        {'revision': 0},
        {'revision': 2},
        {'reviewHash': 'a' * 64},
        {'createdAt': 1100},
        {'expiresAt': 11000},
        {'purpose': 'followUp'},
        {'attendeeId': 'foreign'},
        {'availability': 'sourceChanged', 'attendeeId': null},
        {'lifecycle': 'responded'},
        {
          'handling': {'kind': 'automatic'},
        },
        {
          'handling': {
            'kind': 'manual',
            'actorUid': 'other',
            'at': 3000,
            'authority': 'current',
          },
        },
        {
          'handling': {
            'kind': 'manual',
            'actorUid': 'host-1',
            'at': 2999,
            'authority': 'current',
          },
        },
        {
          'coordination': {
            'kind': 'tracked',
            'phase': 'complete',
            'reason': 'delivered',
            'dueAt': null,
          },
        },
      ]) {
        expect(
          () => deliveryResult(change, rowPatch: patch),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'exact replay retains later evidence, source changes and reassigned ownership',
    () {
      final change = deliveryChange(
        patch: {
          'revision': 2,
          'deliveryStatus': 'unknown',
          'attempts': [
            {'channel': 'rcs', 'state': 'unknown', 'at': 1500},
          ],
        },
      );
      final result = deliveryResult(
        change,
        outcome: 'replayed',
        rowPatch: {
          'revision': 5,
          'lifecycle': 'responded',
          'deliveryStatus': 'read',
          'attempts': [
            {'channel': 'rcs', 'state': 'read', 'at': 3000},
          ],
          'availability': 'sourceChanged',
          'attendeeId': null,
          'handling': {
            'kind': 'manual',
            'actorUid': 'host-2',
            'at': 3000,
            'authority': 'revoked',
          },
          'coordination': {
            'kind': 'tracked',
            'phase': 'complete',
            'reason': 'hostStopped',
            'dueAt': null,
          },
        },
      );
      expect(result.operationRevision, 3);
      expect(result.view.revision, 5);
      expect(result.view, isA<AssistanceStaleDelivery>());
      expect(result.view.status, AssistanceDeliveryStatus.read);
      expect(result.view.lifecycle, AssistanceMessageLifecycle.responded);
      for (final patch in <Map<String, Object?>>[
        {'attempts': [], 'deliveryStatus': 'notSubmitted'},
        {
          'handling': {'kind': 'automatic'},
        },
        {
          'attempts': [
            {'channel': 'sms', 'state': 'unknown', 'at': 1500},
          ],
        },
      ]) {
        expect(
          () => deliveryResult(change, outcome: 'replayed', rowPatch: patch),
          throwsFormatException,
        );
      }
    },
  );
}
