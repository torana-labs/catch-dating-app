import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// A deliberate lookup. Formatting is removed; the country code is explicit.
/// The full number is retained only for lookup and the matching write.
final class EventAssistanceGroupStaffLookup {
  EventAssistanceGroupStaffLookup({
    required this.group,
    required String phoneNumber,
  }) : phoneNumber = _phone(phoneNumber);
  final EventAssistanceGroupScope group;
  final String phoneNumber;
  String get phoneLastFour => phoneNumber.substring(phoneNumber.length - 4);

  static String _phone(String input) {
    if (input.length > 32) {
      throw const FormatException(
        'Use a complete phone number with country code.',
      );
    }
    final number = input.trim().replaceAll(RegExp(r'[\s().-]'), '');
    if (!RegExp(r'^\+[1-9][0-9]{7,14}$').hasMatch(number)) {
      throw const FormatException(
        'Use a complete phone number with country code.',
      );
    }
    return number;
  }

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceGroupStaffLookup &&
      other.group == group &&
      other.phoneNumber == phoneNumber;
  @override
  int get hashCode => Object.hash(group, phoneNumber);
  @override
  String toString() => 'EventAssistanceGroupStaffLookup(ending $phoneLastFour)';
}

/// Pending decisions belong to the verified account, not its phone formatting.
final class EventAssistanceGroupStaffTarget {
  EventAssistanceGroupStaffTarget({required this.group, required this.uid}) {
    assistanceText(uid, 180);
  }
  final EventAssistanceGroupScope group;
  final String uid;
  @override
  bool operator ==(Object other) =>
      other is EventAssistanceGroupStaffTarget &&
      other.group == group &&
      other.uid == uid;
  @override
  int get hashCode => Object.hash(group, uid);
}

enum AssistanceGroupDuty { lead, pacer, sweep }

enum AssistanceGroupPermission {
  readProgress,
  confirmDeparture,
  transferGroup,
  recordCheckpoint,
  resolveAccountability,
}

extension AssistanceGroupDutyPermissions on AssistanceGroupDuty {
  Set<AssistanceGroupPermission> get permissions => switch (this) {
    AssistanceGroupDuty.lead || AssistanceGroupDuty.pacer => Set.unmodifiable(
      AssistanceGroupPermission.values,
    ),
    AssistanceGroupDuty.sweep => const {
      AssistanceGroupPermission.readProgress,
      AssistanceGroupPermission.recordCheckpoint,
      AssistanceGroupPermission.resolveAccountability,
    },
  };
}

enum AssistanceGroupStaffStatus {
  none,
  assigned,
  expired,
  revoked,
  sourceChanged,
}

enum AssistanceGroupStaffOutcome { read, applied, replayed }

final class AssistanceGroupStaffDuty {
  const AssistanceGroupStaffDuty._({
    required this.duty,
    required this.expiresAt,
    required this.sourceHash,
    required this.grantedBy,
    required this.grantedAt,
  });
  final AssistanceGroupDuty duty;
  final int expiresAt, grantedAt;
  final String sourceHash, grantedBy;

  factory AssistanceGroupStaffDuty._parse(
    Object? raw,
    EventAssistanceGroupScope group,
    int now,
  ) => AssistanceGroupStaffDuty.fromJson(
    raw,
    groupId: group.groupId,
    serverTime: now,
  );

  factory AssistanceGroupStaffDuty.fromJson(
    Object? raw, {
    required String groupId,
    required int serverTime,
  }) {
    final map = assistanceObject(raw, {
      'groupId',
      'duty',
      'expiresAtMillis',
      'sourceHash',
      'grantedBy',
      'grantedAtMillis',
    });
    final expiry = assistanceInteger(map['expiresAtMillis']);
    final granted = assistanceInteger(map['grantedAtMillis']);
    if (map['groupId'] != groupId ||
        granted > serverTime ||
        expiry <= granted) {
      throw const FormatException('Invalid group staff duty evidence.');
    }
    return AssistanceGroupStaffDuty._(
      duty: assistanceEnum(AssistanceGroupDuty.values, map['duty']),
      expiresAt: expiry,
      grantedAt: granted,
      sourceHash: assistanceHash(map['sourceHash']),
      grantedBy: assistanceText(map['grantedBy'], 180),
    );
  }
}

final class EventAssistanceGroupStaffView {
  const EventAssistanceGroupStaffView._({
    required this.lookup,
    required this.target,
    required this.displayName,
    required this.sourceHash,
    required this.serverTime,
    required this.revision,
    required this.status,
    required this.recordedDuty,
    required this.operatorExpiresAt,
    required this.canAssign,
    required this.availableDuties,
  });
  final EventAssistanceGroupStaffLookup lookup;
  final EventAssistanceGroupStaffTarget target;
  final String displayName, sourceHash;
  String get phoneLastFour => lookup.phoneLastFour;
  final int serverTime, revision;
  final AssistanceGroupStaffStatus status;

  /// Historical evidence remains removable even when it grants no authority.
  final AssistanceGroupStaffDuty? recordedDuty;
  AssistanceGroupStaffDuty? get currentDuty =>
      status == AssistanceGroupStaffStatus.assigned ? recordedDuty : null;
  bool get canRemove => recordedDuty != null;

  /// Independent event-wide access; a group assignment never extends this.
  final int? operatorExpiresAt;
  final bool canAssign;
  final Set<AssistanceGroupDuty> availableDuties;

  factory EventAssistanceGroupStaffView._parse(
    Object? raw,
    EventAssistanceGroupStaffLookup lookup,
  ) {
    final map = assistanceObject(raw, {
      'context',
      'groupId',
      'sourceHash',
      'serverTime',
      'uid',
      'displayName',
      'phoneLastFour',
      'revision',
      'status',
      'duty',
      'operatorExpiresAtMillis',
      'canAssign',
      'availableDuties',
    });
    lookup.group.requireMatch(map['context'], map['groupId']);
    final now = assistanceInteger(map['serverTime']);
    final revision = assistanceInteger(map['revision']);
    final sourceHash = assistanceHash(map['sourceHash']);
    final status = assistanceEnum(
      AssistanceGroupStaffStatus.values,
      map['status'],
    );
    final operatorExpiry = assistanceNullableInteger(
      map['operatorExpiresAtMillis'],
    );
    final canAssign = assistanceBoolean(map['canAssign']);
    final roles = map['availableDuties'];
    if (roles is! List ||
        roles.length > 3 ||
        roles.toSet().length != roles.length) {
      throw const FormatException('Invalid available group duties.');
    }
    final duties = roles
        .map((r) => assistanceEnum(AssistanceGroupDuty.values, r))
        .toSet();
    final duty = map['duty'] == null
        ? null
        : AssistanceGroupStaffDuty._parse(map['duty'], lookup.group, now);
    if (map['phoneLastFour'] != lookup.phoneLastFour ||
        (status == AssistanceGroupStaffStatus.none) != (duty == null) ||
        (revision == 0 && (duty != null || operatorExpiry != null)) ||
        (status == AssistanceGroupStaffStatus.revoked &&
            operatorExpiry != null) ||
        (duties.isNotEmpty &&
            !duties.containsAll({
              AssistanceGroupDuty.lead,
              AssistanceGroupDuty.sweep,
            })) ||
        (canAssign && duties.isEmpty) ||
        (lookup.group.groupId == 'event:whole' &&
            duties.contains(AssistanceGroupDuty.pacer)) ||
        (status == AssistanceGroupStaffStatus.assigned &&
            (duty!.expiresAt <= now ||
                duty.sourceHash != sourceHash ||
                !duties.contains(duty.duty))) ||
        (status == AssistanceGroupStaffStatus.sourceChanged &&
            duty!.sourceHash == sourceHash &&
            duties.isNotEmpty)) {
      throw const FormatException('Inconsistent group staff review.');
    }
    return EventAssistanceGroupStaffView._(
      lookup: lookup,
      target: EventAssistanceGroupStaffTarget(
        group: lookup.group,
        uid: assistanceText(map['uid'], 180),
      ),
      displayName: assistanceText(map['displayName'], 120),
      sourceHash: sourceHash,
      serverTime: now,
      revision: revision,
      status: status,
      recordedDuty: duty,
      operatorExpiresAt: operatorExpiry,
      canAssign: canAssign,
      availableDuties: Set.unmodifiable(duties),
    );
  }
}

final class EventAssistanceGroupStaffResult {
  const EventAssistanceGroupStaffResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceGroupStaffOutcome outcome;
  final int? operationRevision;
  final EventAssistanceGroupStaffView view;

  factory EventAssistanceGroupStaffResult.fromCallableData(
    Object? raw, {
    required EventAssistanceGroupStaffLookup expectedLookup,
  }) {
    final map = assistanceObject(raw, {'outcome', 'operationRevision', 'view'});
    final outcome = assistanceEnum(
      AssistanceGroupStaffOutcome.values,
      map['outcome'],
    );
    final revision = assistanceNullableInteger(map['operationRevision']);
    final view = EventAssistanceGroupStaffView._parse(
      map['view'],
      expectedLookup,
    );
    if (outcome == AssistanceGroupStaffOutcome.read
        ? revision != null
        : revision == null || revision == 0 || revision > view.revision) {
      throw const FormatException('Invalid group staff receipt.');
    }
    return EventAssistanceGroupStaffResult._(outcome, revision, view);
  }
}
