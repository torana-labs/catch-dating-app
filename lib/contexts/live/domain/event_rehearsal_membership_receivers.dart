import 'dart:math';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_receivers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership.dart';

/// Practice choices use only the reviewed synthetic team and virtual clock.
AssistanceMembershipHandoverReview? rehearsalMembershipReceivers(
  EventRehearsalSession session,
  RehearsalMembershipRow row,
) {
  if (session.id != row.scope.sessionId ||
      session.setupRevision != row.scope.setupRevision ||
      session.virtualNow.millisecondsSinceEpoch != row.facts.serverTime) {
    throw const FormatException(
      'Practice receiving choices belong to another review.',
    );
  }
  if (!row.facts.actions.contains(AssistanceMembershipAction.propose)) {
    return null;
  }
  final now = row.facts.serverTime;
  final end =
      session.virtualStartedAt!.millisecondsSinceEpoch +
      session.setup.durationMinutes * 60000;
  final expiry = min(now + 1800000, end);
  if (expiry <= now) return null;
  final staff = row.staffReview;
  return AssistanceMembershipHandoverReview.fromJson({
    'expiresAt': expiry,
    'receivers': [
      for (final id in row.receivingOperatorIds)
        if (!id.startsWith('practice-staff:') || staff != null)
          () {
            final groups = <Map<String, Object?>>[];
            for (final group in row.facts.groups) {
              final until = id.startsWith('practice-staff:')
                  ? staff!.operatorPermissionUntil(
                      id,
                      group.groupId,
                      AssistanceGroupPermission.transferGroup,
                    )
                  : expiry;
              if (until != null && until > now) {
                groups.add({
                  'groupId': group.groupId,
                  'validUntil': min(until, expiry),
                });
              }
            }
            return {
              'operatorId': id,
              'displayName': staff?.operators[id]?.displayName,
              'groups': groups,
            };
          }(),
    ].where((r) => (r['groups']! as List).isNotEmpty).toList(),
  }, facts: row.facts);
}
