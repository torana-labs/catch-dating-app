import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

class ProgramAttendanceReportExport {
  const ProgramAttendanceReportExport({
    required this.fileName,
    required this.csv,
  });

  final String fileName;
  final String csv;
}

/// Attendance reconciliation export: a program summary row then one row per
/// function, carrying the same counts and exception guest-id lists the
/// reconciliationViewer can already read on screen. Machine-formatted so it
/// can be diffed line by line against door journals and invite lists.
ProgramAttendanceReportExport buildProgramAttendanceReportExport({
  required String programId,
  required String programTitle,
  required ProgramAttendanceReport report,
  required Map<String, String> functionNames,
  required DateTime exportedAt,
}) {
  const header = [
    'row_type',
    'program_id',
    'program_title',
    'function_id',
    'function_name',
    'guests',
    'invited_guests',
    'responded_guests',
    'attending_guests',
    'attending_heads',
    'maybe_guests',
    'declined_guests',
    'no_response_guests',
    'checked_in_guests',
    'checked_in_heads',
    'no_show_guests',
    'expected_guests',
    'walk_in_guests',
    'walk_in_heads',
    'invited_no_response_guest_ids',
    'declined_checked_in_guest_ids',
    'no_show_guest_ids',
    'walk_in_guest_ids',
    'exported_at',
  ];
  final exported = exportedAt.toUtc().toIso8601String();
  final rows = <List<Object?>>[
    header,
    [
      'program',
      programId,
      programTitle,
      '',
      '',
      report.programGuests,
      report.programInvitedGuests,
      '',
      report.programAttendingGuests,
      '',
      '',
      '',
      '',
      report.programCheckedInGuests,
      '',
      report.programNoShowGuests,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      exported,
    ],
    for (final fn in report.functions)
      [
        'function',
        programId,
        programTitle,
        fn.functionId,
        functionNames[fn.functionId] ?? '',
        '',
        fn.invitedGuests,
        fn.respondedGuests,
        fn.attendingGuests,
        fn.attendingHeads,
        fn.maybeGuests,
        fn.declinedGuests,
        fn.noResponseGuests,
        fn.checkedInGuests,
        fn.checkedInHeads,
        fn.noShowGuests,
        fn.expectedGuests,
        fn.walkInGuests,
        fn.walkInHeads,
        fn.exceptions.invitedNoResponseGuestIds.join('; '),
        fn.exceptions.declinedCheckedInGuestIds.join('; '),
        fn.exceptions.noShowGuestIds.join('; '),
        fn.exceptions.walkInGuestIds.join('; '),
        exported,
      ],
  ];

  final slug = programTitle
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  final date = exported.split('T').first;
  return ProgramAttendanceReportExport(
    fileName: '${slug.isEmpty ? 'program' : slug}-attendance-$date.csv',
    csv: _csv(rows),
  );
}

String _csv(List<List<Object?>> rows) {
  return '${rows.map((row) => row.map(_csvCell).join(',')).join('\n')}\n';
}

String _csvCell(Object? value) {
  final text = value?.toString() ?? '';
  if (!text.contains(',') &&
      !text.contains('"') &&
      !text.contains('\n') &&
      !text.contains('\r')) {
    return text;
  }
  return '"${text.replaceAll('"', '""')}"';
}
