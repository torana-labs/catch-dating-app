import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// The team list from `programStaffViews` rows at [now]. A row is the
/// callable's member row with the facts its status derived from; the phone
/// derives the status from them and the clock: revoked, approval required
/// (the owner's approval proof is missing), active while a live duty remains
/// (`activeUntilMillis` in the future), otherwise expired. Members are in
/// account id order, as the callable listed them, and none is paged.
ProgramStaffList programStaffListFromViews(
  String programId,
  List<Map<Object?, Object?>> rows,
  DateTime now,
) {
  final members = [for (final row in rows) programStaffMemberFromView(row, now)]
    ..sort((a, b) => a.uid.compareTo(b.uid));
  return ProgramStaffList(
    programId: programId,
    members: members,
    nextCursor: null,
  );
}

ProgramStaffMember programStaffMemberFromView(
  Map<Object?, Object?> row,
  DateTime now,
) => ProgramStaffMember(
  uid: requiredString(row, 'uid'),
  // Both are null once the programme's archive anonymized the grant.
  displayName: row['displayName'] as String? ?? '',
  phoneLastFour: row['phoneLastFour'] as String? ?? '',
  duties: mapList(
    row['duties'],
    'duties',
  ).map(ProgramDutyAssignment.fromMap).toList(growable: false),
  status: _statusOf(row, now),
  expiresAt: requiredDateTime(row, 'expiresAtMillis'),
  revision: requiredInt(row, 'revision'),
);

ProgramStaffStatus _statusOf(Map<Object?, Object?> row, DateTime now) {
  if (row['revoked'] == true) return ProgramStaffStatus.revoked;
  if (row['ownerApproved'] != true) return ProgramStaffStatus.approvalRequired;
  final until = row['activeUntilMillis'];
  final from = row['activeFromMillis'];
  final live =
      until is int &&
      until > now.millisecondsSinceEpoch &&
      (from is! int || from <= now.millisecondsSinceEpoch);
  return live ? ProgramStaffStatus.active : ProgramStaffStatus.expired;
}

/// The next instant after [now] at which a member's status changes by time
/// alone: an active member's last duty ending.
DateTime? nextStaffStatusChange(
  List<Map<Object?, Object?>> rows,
  DateTime now,
) {
  DateTime? next;
  for (final row in rows) {
    if (row['revoked'] == true || row['ownerApproved'] != true) continue;
    final until = row['activeUntilMillis'];
    if (until is! int) continue;
    final at = DateTime.fromMillisecondsSinceEpoch(until);
    if (at.isAfter(now) && (next == null || at.isBefore(next))) next = at;
  }
  return next;
}
