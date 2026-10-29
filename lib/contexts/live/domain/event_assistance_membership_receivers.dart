import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

final class AssistanceMembershipReceiver {
  const AssistanceMembershipReceiver._(
    this.operatorId,
    this.displayName,
    this.groups,
  );
  final String operatorId;
  final String? displayName;

  /// Each group has its own authority deadline; unrelated duties never extend it.
  final Map<String, int> groups;
}

/// A bounded choice list. The write still verifies the receiver's current duty.
final class AssistanceMembershipHandoverReview {
  const AssistanceMembershipHandoverReview._(this.expiresAt, this.receivers);
  final int expiresAt;
  final List<AssistanceMembershipReceiver> receivers;

  factory AssistanceMembershipHandoverReview.fromJson(
    Object? raw, {
    required AssistanceMembershipFacts facts,
  }) {
    final map = assistanceObject(raw, {'expiresAt', 'receivers'});
    final until = assistanceInteger(map['expiresAt']);
    final list = map['receivers'];
    if (!facts.actions.contains(AssistanceMembershipAction.propose) ||
        until <= facts.serverTime ||
        until - facts.serverTime > 1800000 ||
        list is! List ||
        list.length > 92) {
      throw const FormatException('Invalid membership handover review.');
    }
    final receivers = <AssistanceMembershipReceiver>[];
    final seen = <String>{};
    for (final value in list) {
      final row = assistanceObject(value, {
        'operatorId',
        'displayName',
        'groups',
      });
      final id = assistanceText(row['operatorId'], 180);
      final name = row['displayName'] == null
          ? null
          : assistanceText(row['displayName'], 120);
      final groups = row['groups'];
      if (!seen.add(id) ||
          groups is! List ||
          groups.isEmpty ||
          groups.length > 40) {
        throw const FormatException('Invalid receiving operator groups.');
      }
      final deadlines = <String, int>{};
      for (final value in groups) {
        final group = assistanceObject(value, {'groupId', 'validUntil'});
        final id = assistanceId(group['groupId']);
        final deadline = assistanceInteger(group['validUntil']);
        if (deadlines.containsKey(id) ||
            !facts.groups.any((g) => g.groupId == id) ||
            deadline <= facts.serverTime ||
            deadline > until) {
          throw const FormatException('Invalid receiving operator authority.');
        }
        deadlines[id] = deadline;
      }
      receivers.add(
        AssistanceMembershipReceiver._(id, name, Map.unmodifiable(deadlines)),
      );
    }
    return AssistanceMembershipHandoverReview._(
      until,
      List.unmodifiable(receivers),
    );
  }

  void requireChoice({
    required String operatorId,
    required String groupId,
    required int expiresAt,
  }) {
    final receiver = receivers
        .where((r) => r.operatorId == operatorId)
        .firstOrNull;
    final until = receiver?.groups[groupId];
    if (until == null || expiresAt > until || expiresAt > this.expiresAt) {
      throw const FormatException(
        'Choose a current receiving operator and handover deadline.',
      );
    }
  }
}
