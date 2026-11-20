import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

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
