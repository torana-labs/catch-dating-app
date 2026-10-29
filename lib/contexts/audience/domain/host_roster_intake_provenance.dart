part of 'host_roster_import.dart';

List<Map<String, Object?>> _buildIntakeRows({
  required HostRosterTable table,
  required HostRosterMappedRows mapped,
  required Map<HostRosterField, int?> mapping,
}) {
  final ready = {for (final row in mapped.rows) row.rowId: row};
  final issues = <int, List<String>>{};
  for (final issue in mapped.issues) {
    final rowNumber = issue.rowNumber;
    if (rowNumber != null) {
      issues.putIfAbsent(rowNumber, () => []).add(_issueCode(issue.type));
    }
  }
  return [
    for (final indexed in table.rows.take(250).indexed)
      () {
        final rowNumber = indexed.$1 + 2;
        final raw = indexed.$2
            .take(40)
            .map((cell) => cell.length > 500 ? cell.substring(0, 500) : cell)
            .toList(growable: false);
        final imported = ready['$rowNumber'];
        final value =
            imported?.toJson() ??
            <String, Object?>{
              'rowId': '$rowNumber',
              'displayName': _boundedCell(
                raw,
                mapping[HostRosterField.displayName],
                120,
              ),
              'status': EventAttendeeStatus.registered.name,
            };
        final fields = <String, Object?>{};
        for (final entry in mapping.entries) {
          final column = entry.value;
          if (column == null ||
              column >= raw.length ||
              raw[column].trim().isEmpty) {
            continue;
          }
          final field = _intakeFieldName(entry.key);
          final evidence = <String, Object?>{
            'column': column,
            'header': table.headers[column],
            'origin': 'upload',
            'confidence': null,
          };
          fields[field] = evidence;
        }
        Map<String, Object?> hostEvidence(String header) => {
          'column': -1,
          'header': header,
          'origin': 'hostCorrection',
          'confidence': null,
        };
        if (value['revenueAmountMinor'] != null &&
            !fields.containsKey('revenueAmountMinor')) {
          fields['revenueAmountMinor'] = hostEvidence(
            'Host per-guest revenue fallback',
          );
        }
        if (value['revenueCurrency'] != null &&
            !fields.containsKey('revenueCurrency')) {
          fields['revenueCurrency'] = hostEvidence(
            'Host revenue currency fallback',
          );
        }
        if (value['revenueSource'] case final source?) {
          final amountColumn = mapping[HostRosterField.revenueAmount];
          final uploadedAmount =
              amountColumn != null &&
              amountColumn < raw.length &&
              raw[amountColumn].trim().isNotEmpty;
          fields['revenueSource'] = uploadedAmount
              ? <String, Object?>{
                  'column': amountColumn,
                  'header': table.headers[amountColumn],
                  'origin': 'upload',
                  'confidence': null,
                }
              : hostEvidence('Host revenue authority: $source');
        }
        return <String, Object?>{
          'value': value,
          'sourceRowNumber': rowNumber,
          'fields': fields,
          'rawCells': raw,
          if (issues[rowNumber]?.isNotEmpty ?? false)
            'issues': issues[rowNumber],
        };
      }(),
  ];
}

String _boundedCell(List<String> row, int? column, int maxLength) {
  if (column == null || column >= row.length) return '';
  final value = row[column].trim();
  return value.length > maxLength ? value.substring(0, maxLength) : value;
}

String _intakeFieldName(HostRosterField field) => switch (field) {
  HostRosterField.city => 'cityMarketId',
  HostRosterField.revenueAmount => 'revenueAmountMinor',
  _ => field.name,
};

String _issueCode(HostRosterRowIssueType issue) => switch (issue) {
  HostRosterRowIssueType.missingNameColumn => 'missing-name-column',
  HostRosterRowIssueType.duplicateMappedColumn => 'duplicate-mapped-column',
  HostRosterRowIssueType.missingName => 'missing-name',
  HostRosterRowIssueType.missingStableIdentity => 'missing-stable-identity',
  HostRosterRowIssueType.invalidPhone => 'invalid-phone',
  HostRosterRowIssueType.invalidEmail => 'invalid-email',
  HostRosterRowIssueType.invalidCity => 'invalid-city',
  HostRosterRowIssueType.invalidRevenueAmount => 'invalid-revenue-amount',
  HostRosterRowIssueType.missingRevenueCurrency => 'missing-revenue-currency',
  HostRosterRowIssueType.duplicateIdentity => 'duplicate-identity',
  HostRosterRowIssueType.unknownStatus => 'unknown-status',
  HostRosterRowIssueType.excludedStatus => 'excluded-status',
};
