import 'dart:convert';

import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';

String rehearsalOperatorId(Object? value) {
  final id = assistanceText(value, 75);
  if (!RegExp(r'^practice-staff:[A-Za-z0-9_-]{1,60}$').hasMatch(id)) {
    throw const FormatException('Invalid practice operator identity.');
  }
  return id;
}

final class RehearsalStaffOperator {
  const RehearsalStaffOperator._(this.id, this.displayName, this.duties);
  final String id, displayName;
  final Map<String, AssistanceGroupStaffDuty> duties;
}

final class RehearsalStaffGroup {
  const RehearsalStaffGroup._({
    required this.id,
    required this.label,
    required this.sourceHash,
    required this.permissions,
    required this.validUntil,
    required this.availableDuties,
  });
  final String id, label, sourceHash;
  final int validUntil;
  final Set<AssistanceGroupPermission> permissions;
  final Set<AssistanceGroupDuty> availableDuties;
}

/// The real Host owns the rehearsal. An explicitly selected synthetic operator
/// supplies only current group permissions, evaluated against the virtual clock.
final class RehearsalStaffReview {
  const RehearsalStaffReview._({
    required this.session,
    required this.clockId,
    required this.revision,
    required this.sourceHash,
    required this.hostUid,
    required this.actorUid,
    required this.practiceOperatorId,
    required this.canAssign,
    required this.operators,
    required this.groups,
  });
  final EventRehearsalSession session;
  final String clockId, sourceHash, hostUid, actorUid;
  final String? practiceOperatorId;
  final int revision;
  final bool canAssign;
  final Map<String, RehearsalStaffOperator> operators;
  final Map<String, RehearsalStaffGroup> groups;
  bool get isManager => practiceOperatorId == null;
  int get serverTime => session.virtualNow.millisecondsSinceEpoch;
  bool canPerform(String groupId, AssistanceGroupPermission permission) =>
      groups[groupId]?.permissions.contains(permission) ?? false;

  /// A synthetic receiver or reporter needs a duty for the specific group.
  /// Real account authority is checked by the backend at execution time.
  int? operatorPermissionUntil(
    String operatorId,
    String groupId,
    AssistanceGroupPermission permission,
  ) {
    final duty = operators[operatorId]?.duties[groupId];
    if (duty == null ||
        duty.sourceHash != groups[groupId]?.sourceHash ||
        duty.expiresAt <= serverTime ||
        !duty.duty.permissions.contains(permission)) {
      return null;
    }
    return duty.expiresAt;
  }

  void requireSameRole(RehearsalStaffReview? other) {
    if (other == null ||
        hostUid != other.hostUid ||
        practiceOperatorId != other.practiceOperatorId ||
        clockId != other.clockId) {
      throw const FormatException(
        'Practice response changed the selected role.',
      );
    }
  }

  factory RehearsalStaffReview.fromJson(
    Object? value, {
    required EventRehearsalSession session,
  }) {
    final m = assistanceObject(value, {
      'clockId',
      'revision',
      'sourceHash',
      'hostUid',
      'actorUid',
      'practiceOperatorId',
      'serverTime',
      'canAssign',
      'operators',
      'groups',
    });
    final now = assistanceInteger(m['serverTime']);
    final start = session.virtualStartedAt?.millisecondsSinceEpoch;
    final revision = assistanceInteger(m['revision']);
    final host = assistanceText(m['hostUid'], 180);
    final actor = assistanceText(m['actorUid'], 180);
    final role = m['practiceOperatorId'] == null
        ? null
        : rehearsalOperatorId(m['practiceOperatorId']);
    final canAssign = assistanceBoolean(m['canAssign']);
    final clock =
        'clock:${sha256Digest(jsonEncode([session.id, start, session.setupRevision]))}';
    if (start == null ||
        start < 0 ||
        start > now ||
        session.setupRevision < 0 ||
        session.setupRevision > 2147483647 ||
        session.actionCount < 0 ||
        session.actionCount > 500 ||
        now != session.virtualNow.millisecondsSinceEpoch ||
        m['clockId'] != clock ||
        actor != (role ?? host) ||
        host.startsWith('practice-staff:') ||
        canAssign !=
            (role == null &&
                [
                  EventRehearsalStatus.draft,
                  EventRehearsalStatus.ready,
                  EventRehearsalStatus.running,
                  EventRehearsalStatus.paused,
                ].contains(session.status) &&
                session.actionCount < 500 &&
                now < start + session.setup.durationMinutes * 60000)) {
      throw const FormatException('Inconsistent practice staff authority.');
    }
    final operators = <String, RehearsalStaffOperator>{};
    for (final raw in _list(m['operators'], 50)) {
      final o = assistanceObject(raw, {'operatorId', 'displayName', 'duties'});
      final id = rehearsalOperatorId(o['operatorId']);
      final name = assistanceText(o['displayName'], 120);
      final duties = <String, AssistanceGroupStaffDuty>{};
      for (final rawDuty in _list(o['duties'], 20)) {
        final groupId = assistanceText(
          assistanceObject(rawDuty)['groupId'],
          180,
        );
        final duty = AssistanceGroupStaffDuty.fromJson(
          rawDuty,
          groupId: groupId,
          serverTime: now,
        );
        if (duties.containsKey(groupId) || duty.grantedAt < start) {
          throw const FormatException('Invalid practice duty history.');
        }
        duties[groupId] = duty;
      }
      if (operators.containsKey(id) || name.trim().isEmpty) {
        throw const FormatException('Invalid practice staff roster.');
      }
      operators[id] = RehearsalStaffOperator._(
        id,
        name,
        Map.unmodifiable(duties),
      );
    }
    if (revision == 0 && operators.isNotEmpty ||
        role != null && !operators.containsKey(role)) {
      throw const FormatException('Practice operator is not in this run.');
    }
    final route = session.setup.movementSimulation?.routePlan;
    final expectedGroups = <String, String>{'event:whole': 'Whole event'};
    if (route?.groupStrategy == RouteGroupStrategy.paceGroups) {
      for (final group in route!.paceGroups) {
        if (expectedGroups.containsKey(group.id)) {
          throw const FormatException('Duplicate configured practice group.');
        }
        expectedGroups[group.id] = group.label;
      }
    }
    final groups = <String, RehearsalStaffGroup>{};
    for (final raw in _list(m['groups'], 21)) {
      final g = assistanceObject(raw, {
        'groupId',
        'label',
        'sourceHash',
        'permissions',
        'validUntil',
        'availableDuties',
      });
      final id = assistanceText(g['groupId'], 180);
      final source = assistanceHash(g['sourceHash']);
      final permissions = _enums(
        g['permissions'],
        AssistanceGroupPermission.values,
      );
      final available = _enums(
        g['availableDuties'],
        AssistanceGroupDuty.values,
      );
      final until = assistanceInteger(g['validUntil']);
      final duty = operators[role]?.duties[id];
      final validDuty =
          duty != null && duty.sourceHash == source && duty.expiresAt > now;
      final expectedPermissions = role == null
          ? AssistanceGroupPermission.values.toSet()
          : validDuty
          ? duty.duty.permissions
          : <AssistanceGroupPermission>{};
      final expectedDuties = {
        AssistanceGroupDuty.lead,
        AssistanceGroupDuty.sweep,
        if (id != 'event:whole') AssistanceGroupDuty.pacer,
      };
      if (groups.containsKey(id) ||
          !expectedGroups.containsKey(id) ||
          g['label'] != expectedGroups[id] ||
          !_sameSet(permissions, expectedPermissions) ||
          !_sameSet(available, expectedDuties) ||
          until !=
              (role == null
                  ? 9007199254740991
                  : validDuty
                  ? duty.expiresAt
                  : 0)) {
        throw const FormatException(
          'Practice group permissions do not match its duty.',
        );
      }
      groups[id] = RehearsalStaffGroup._(
        id: id,
        label: expectedGroups[id]!,
        sourceHash: source,
        permissions: Set.unmodifiable(permissions),
        validUntil: until,
        availableDuties: Set.unmodifiable(available),
      );
    }
    if (groups.length != expectedGroups.length) {
      throw const FormatException('Incomplete practice staff group coverage.');
    }
    return RehearsalStaffReview._(
      session: session,
      clockId: clock,
      revision: revision,
      sourceHash: assistanceHash(m['sourceHash']),
      hostUid: host,
      actorUid: actor,
      practiceOperatorId: role,
      canAssign: canAssign,
      operators: Map.unmodifiable(operators),
      groups: Map.unmodifiable(groups),
    );
  }
}

List<Object?> _list(Object? raw, int max) {
  if (raw is! List || raw.length > max) {
    throw const FormatException('Invalid practice staff collection.');
  }
  return raw.cast<Object?>();
}

Set<T> _enums<T extends Enum>(Object? raw, List<T> values) {
  final list = _list(raw, values.length);
  final set = list.map((v) => assistanceEnum(values, v)).toSet();
  if (set.length != list.length) {
    throw const FormatException('Duplicate practice staff option.');
  }
  return set;
}

bool _sameSet<T>(Set<T> a, Set<T> b) =>
    a.length == b.length && a.containsAll(b);
