import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_publication.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/schema_contracts.g.dart'
    as schemas;
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_rehearsal_assistance_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

RehearsalPublicationDraft _draft(
  RehearsalJoiningPoint point, {
  AssistanceLateJoinRules? rules,
  DateTime? deadline,
  List<RehearsalLaterJoiningOption> later = const [],
  List<AssistanceMessageRoute>? routes,
}) => RehearsalPublicationDraft(
  actorId: 'actor-01',
  joiningPoint: point,
  rules: rules ?? practiceRules(destination: const LateJoinConfirmedProgress()),
  routes: routes ?? practicePlan().routes,
  deliveryPolicy: practicePlan().deliveryPolicy,
  responseDeadline: deadline,
  laterChoices: later,
);
const _delivered = RehearsalDeliveryConfirmed(
  RehearsalConfirmedDelivery.delivered,
);

void main() {
  test('catalog and defaults use actual event and pace-group identities', () {
    for (final name in ['initial', 'departed', 'groupReady', 'groupDeparted']) {
      final review = movementReview(name);
      final points = rehearsalJoiningPoints(review);
      expect(points.map((p) => p.destination), review.destinations);
      expect(
        points.map((p) => p.target),
        review.destinations.map((d) => d.target),
      );
      final point = rehearsalDefaultJoiningPoint(review)!;
      expect(point.target, isNot(isA<AssistanceFixedPlace>()));
      expect(
        point.groupLabel,
        review.groups
            .singleWhere((g) => g.groupId == review.scope.groupId)
            .label,
      );
      expect(() => points.clear(), throwsUnsupportedError);
      if (review.guidance != null) {
        expect(point.target, review.guidance!.destination);
      }
    }
  });

  test(
    'configuration before departure exposes no directions and cannot publish',
    () {
      for (final name in ['initial', 'ready', 'groupReady']) {
        final snapshot = movementSnapshot(name);
        final input = _draft(
          rehearsalDefaultJoiningPoint(snapshot.movementReview!)!,
        );
        expect(
          input.preview(snapshot),
          isA<RehearsalJoiningAwaitingDeparture>(),
        );
        expect(
          input.configure(snapshot, [_delivered]).plan.departureConfirmed,
          isFalse,
        );
        expect(() => input.prepare(snapshot), throwsFormatException);
      }
    },
  );

  test(
    'every configured family and confirmed publication matches the callable schema',
    () {
      final schema = JsonSchema.create(
        schemas.schemaContractsByName['ControlEventRehearsalCallablePayload']!,
      );
      for (final name in [
        'initial',
        'departed',
        'fixed',
        'groupReady',
        'groupDeparted',
      ]) {
        final snapshot = movementSnapshot(name);
        for (final point in rehearsalJoiningPoints(snapshot.movementReview!)) {
          final input = _draft(point);
          final commands = <RehearsalAssistanceCommand>[
            input.configure(snapshot, [_delivered]),
          ];
          if (input.preview(snapshot) case RehearsalJoiningConfirmed(
            entryPermitted: true,
          )) {
            commands.add(input.prepare(snapshot));
          }
          for (final command in commands) {
            final change = RehearsalAssistanceChange(
              snapshot: snapshot,
              command: command,
              clientActionId: 'practice-publication-1',
            );
            final result = schema.validate(change.toJson());
            expect(result.isValid, isTrue, reason: '${result.errors}');
          }
        }
      }
    },
  );

  test(
    'confirmed directions and material hashes match the backend projector',
    () {
      for (final name in ['departed', 'fixed', 'oldFixed', 'groupDeparted']) {
        final snapshot = movementSnapshot(name);
        final review = snapshot.movementReview!;
        final point = rehearsalJoiningPoints(
          review,
        ).singleWhere((p) => p.target == review.guidance!.destination);
        final guide = _draft(point).prepare(snapshot).plan.guidance;
        expect(guide.destination, review.guidance!.destination);
        expect(guide.text, review.guidance!.text);
        expect(guide.materialKey, review.guidance!.materialKey);
        expect(guide.revision, review.current!.revision);
        expect(guide.validUntil, review.endAt);
      }
    },
  );

  test(
    'default policy permits the whole itinerary; explicit selections stay narrow',
    () {
      final snapshot = movementSnapshot('departed');
      final points = rehearsalJoiningPoints(
        snapshot.movementReview!,
      ).where((p) => p.target is AssistanceItineraryStop).toList();
      final input = _draft(points.first);
      final policy =
          input.prepare(snapshot).plan.rules.destination as LateJoinItinerary;
      expect(policy.permittedStopIds, ['one', 'two']);
      expect(policy.permits(points.last.target), isTrue);
      final second = points.last.target as AssistanceItineraryStop;
      final narrow = _draft(
        points.last,
        rules: practiceRules(
          destination: LateJoinItinerary(
            itineraryId: second.itineraryId,
            permittedStopIds: [second.stopId],
          ),
        ),
      );
      expect(narrow.preview(snapshot), isA<RehearsalJoiningOutsidePolicy>());
      expect(
        (narrow.preview(snapshot) as RehearsalJoiningOutsidePolicy)
            .currentDestination
            .target,
        points.first.target,
      );
      expect(() => narrow.prepare(snapshot), throwsFormatException);
      expect(
        (narrow.configure(snapshot, [_delivered]).plan.rules.destination
                as LateJoinItinerary)
            .permittedStopIds,
        ['two'],
      );
      expect(
        () => _draft(
          points.first,
          rules: practiceRules(
            destination: LateJoinItinerary(
              itineraryId: second.itineraryId,
              permittedStopIds: ['one', 'foreign'],
            ),
          ),
        ).configure(snapshot, [_delivered]),
        throwsFormatException,
      );
    },
  );

  test(
    'fixed venue restrictions remain explicit and cannot imply permission to send',
    () {
      final snapshot = movementSnapshot('fixed');
      final point = rehearsalJoiningPoints(snapshot.movementReview!).first;
      final target = point.target as AssistanceFixedPlace;
      for (final entry in LateEntryRule.values) {
        final input = _draft(
          point,
          rules: practiceRules(
            destination: LateJoinFixedPlace(
              placeId: target.placeId,
              lateEntry: entry,
            ),
          ),
        );
        final preview = input.preview(snapshot) as RehearsalJoiningConfirmed;
        expect(
          (preview.guidance.destination as AssistanceFixedPlace).lateEntry.name,
          entry.name,
        );
        expect(preview.entryPermitted, entry == LateEntryRule.allowed);
        expect(
          input.configure(snapshot, [_delivered]).plan.guidance.destination,
          preview.guidance.destination,
        );
        if (entry != LateEntryRule.allowed) {
          expect(() => input.prepare(snapshot), throwsFormatException);
          expect(
            preview.guidance.materialKey,
            isNot(snapshot.movementReview!.guidance!.materialKey),
          );
        }
      }
    },
  );

  test(
    'cutoff, deadline, route order, cap and cooldown remain independently configurable',
    () {
      final snapshot = movementSnapshot('departed');
      final point = rehearsalDefaultJoiningPoint(snapshot.movementReview!)!;
      final rules = AssistanceLateJoinRules(
        destination: const LateJoinConfirmedProgress(),
        cutoff: LateJoinAtTime(1800000),
        maxMessagesPerEpisode: 0,
        minimumMinutesBetweenMessages: 5,
        unanswered: LateJoinUnansweredRule.hostReviewAtDeadline,
      );
      expect(
        () => _draft(point, rules: rules).configure(snapshot, [_delivered]),
        throwsFormatException,
      );
      final routes = [
        AssistanceMessageRoute.catchEventRcs,
        AssistanceMessageRoute.catchEventSms,
      ];
      final input = _draft(
        point,
        rules: rules,
        routes: routes,
        deadline: DateTime.fromMillisecondsSinceEpoch(1200000),
      );
      routes.clear();
      final plan = input.configure(snapshot, [_delivered]).plan;
      expect(plan.guidance.validUntil, 7200000);
      expect((plan.rules.cutoff as LateJoinAtTime).at, 1800000);
      expect(plan.rules.maxMessagesPerEpisode, 0);
      expect(plan.rules.minimumMinutesBetweenMessages, 5);
      expect(plan.responseDeadline, 1200000);
      expect(plan.routes, [
        AssistanceMessageRoute.catchEventRcs,
        AssistanceMessageRoute.catchEventSms,
      ]);
      for (final deadline in [1000, 1800001, 7200001]) {
        expect(
          () => _draft(
            point,
            rules: rules,
            deadline: DateTime.fromMillisecondsSinceEpoch(deadline),
          ).configure(snapshot, [_delivered]),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'later choices keep the reviewed group, labels and immutable selection',
    () {
      final snapshot = movementSnapshot('groupReady');
      final points = rehearsalJoiningPoints(snapshot.movementReview!);
      final later = [
        RehearsalLaterJoiningOption(points.last, label: 'Join at stop two'),
      ];
      final input = _draft(points.first, later: later);
      later.clear();
      final plan = input.configure(snapshot, [_delivered]).plan;
      expect(plan.laterChoices!.single.label, 'Join at stop two');
      expect(plan.laterChoices!.single.target, points.last.target);
      expect(
        (plan.rules.destination as LateJoinGroupCheckpoints)
            .permittedCheckpointIds,
        ['one', 'two'],
      );
      for (final choices in [
        [
          RehearsalLaterJoiningOption(points.last),
          RehearsalLaterJoiningOption(points.last),
        ],
        [
          RehearsalLaterJoiningOption(
            rehearsalJoiningPoints(movementReview()).last,
          ),
        ],
        [
          RehearsalLaterJoiningOption(
            rehearsalJoiningPoints(movementReview('groupReady')).last,
          ),
        ],
      ]) {
        expect(
          () => _draft(
            points.first,
            later: choices,
          ).configure(snapshot, [_delivered]),
          throwsFormatException,
        );
      }
      expect(
        () => RehearsalLaterJoiningOption(points.last, label: 'x' * 81),
        throwsFormatException,
      );
    },
  );

  test(
    'refresh, reset, another rehearsal and a finished runtime cannot reuse a draft',
    () {
      final snapshot = movementSnapshot('departed');
      final input = _draft(
        rehearsalDefaultJoiningPoint(snapshot.movementReview!)!,
      );
      for (final patch in <Map<String, Object?>>[
        {'id': 'foreign'},
        {'setupRevision': 1},
        {'runtimeRevision': 3},
        {'virtualNowMillis': 120000},
        {'actionCount': 500},
        {'status': 'complete'},
        {'virtualStartedAtMillis': null},
      ]) {
        final raw = movementBootstrap('departed')..remove('movementReview');
        movementObjectAt(raw, ['session']).addAll(patch);
        expect(
          () => input.configure(EventRehearsalBootstrap.fromCallableData(raw), [
            _delivered,
          ]),
          throwsFormatException,
        );
      }
      expect(
        () => input.configure(movementSnapshot('complete'), [_delivered]),
        throwsFormatException,
      );
    },
  );
}
