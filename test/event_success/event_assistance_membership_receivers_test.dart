import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_assistance_membership_fixtures.dart';

Map<String, Object?> _wire() {
  final wire = membershipWire(state: 'current');
  (wire['view']! as Map)['handoverReview'] = {
    'expiresAt': 7000,
    'receivers': [
      {
        'operatorId': 'host-2',
        'displayName': 'Sam',
        'groups': [
          {'groupId': 'tempo', 'validUntil': 6000},
        ],
      },
    ],
  };
  return wire;
}

Map _review(Map wire) => (wire['view'] as Map)['handoverReview'] as Map;
Map _receiver(Map wire) => (_review(wire)['receivers'] as List).single as Map;
Map _group(Map wire) => (_receiver(wire)['groups'] as List).single as Map;

void main() {
  test(
    'the generated contract and native review retain bounded receiver choices',
    () {
      final schema = JsonSchema.create(
        contractSchema('EventAssistanceMembershipCallableResponse'),
      );
      final wire = _wire();
      expect(schema.validate(wire).isValid, isTrue);
      final view = membershipResult(wire).view;
      final review = view.handoverReview!;
      expect(review.receivers.single.displayName, 'Sam');
      expect(review.receivers.single.groups, {'tempo': 6000});
      membershipChange(
        view: view,
        decision: const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 6000,
        ),
      );
      _group(wire)['validUntil'] = 1000;
      expect(review.receivers.single.groups['tempo'], 6000);
      expect(() => review.receivers.clear(), throwsUnsupportedError);
      expect(
        () => review.receivers.single.groups.clear(),
        throwsUnsupportedError,
      );
      expect(membershipView().handoverReview, isNull);
    },
  );

  test(
    'a proposal cannot substitute a receiver, group, or later authority deadline',
    () {
      final view = membershipResult(_wire()).view;
      for (final decision in [
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'foreign',
          expiresAt: 6000,
        ),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 6001,
        ),
      ]) {
        expect(
          () => membershipChange(view: view, decision: decision),
          throwsFormatException,
        );
      }
      expect(
        () => view.handoverReview!.requireChoice(
          operatorId: 'host-2',
          groupId: 'easy',
          expiresAt: 5000,
        ),
        throwsFormatException,
      );
    },
  );

  test(
    'malformed, expired, duplicated or expanded receiver projections fail closed',
    () {
      for (final mutate in <void Function(Map)>[
        (w) => _review(w)['expiresAt'] = 1000,
        (w) => _review(w)['expiresAt'] = 1801001,
        (w) => _review(w)['receivers'] = List.generate(93, (_) => _receiver(w)),
        (w) => _review(w)['receivers'] = [_receiver(w), _receiver(w)],
        (w) => _receiver(w)['phone'] = '+919999999999',
        (w) => _receiver(w)['displayName'] = '',
        (w) => _receiver(w)['groups'] = [],
        (w) => _receiver(w)['groups'] = [_group(w), _group(w)],
        (w) => _group(w)['groupId'] = 'foreign',
        (w) => _group(w)['validUntil'] = 1000,
        (w) => _group(w)['validUntil'] = 7001,
        (w) => (w['view'] as Map)['actions'] = ['leave'],
        (w) => (w['view'] as Map)['handoverReview'] = null,
      ]) {
        final wire = _wire();
        mutate(wire);
        expect(() => membershipResult(wire), throwsFormatException);
      }
    },
  );
}
