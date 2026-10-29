import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';

part 'host_roster_intake_provenance.dart';

enum HostRosterAdapterId {
  genericV1('generic-v1', 'Flexible spreadsheet'),
  lumaV1('luma-v1', 'Luma export'),
  eventbriteV1('eventbrite-v1', 'Eventbrite export'),
  partifulV1('partiful-v1', 'Partiful export'),
  poshV1('posh-v1', 'POSH export'),
  sampleRequired('sample-required', 'Format review needed');

  const HostRosterAdapterId(this.wireName, this.label);

  final String wireName;
  final String label;
}

enum HostRosterAdapterSupport { verified, generic, sampleRequired }

class HostRosterAdapterDetection {
  const HostRosterAdapterDetection({
    required this.adapterId,
    required this.support,
    required this.confidence,
    this.hintedAdapterId,
    this.providerMismatch = false,
  });

  final HostRosterAdapterId adapterId;
  final HostRosterAdapterSupport support;
  final double confidence;
  final HostRosterAdapterId? hintedAdapterId;
  final bool providerMismatch;
}

enum HostRosterField {
  displayName,
  phone,
  email,
  city,
  externalReference,
  arrivalGroup,
  ticketType,
  revenueAmount,
  revenueCurrency,
  status,
}

enum HostRosterImportIssue {
  unsupportedFile,
  fileTooLarge,
  expandedFileTooLarge,
  missingRows,
  tooManyColumns,
  malformedCsv,
  unreadableXlsx,
  missingWorksheet,
}

class HostRosterImportException implements Exception {
  const HostRosterImportException(this.issue, {this.cause});

  final HostRosterImportIssue issue;
  final Object? cause;

  @override
  String toString() => 'HostRosterImportException($issue, $cause)';
}

enum HostRosterRowIssueType {
  missingNameColumn,
  duplicateMappedColumn,
  missingName,
  missingStableIdentity,
  invalidPhone,
  invalidEmail,
  invalidCity,
  invalidRevenueAmount,
  missingRevenueCurrency,
  duplicateIdentity,
  unknownStatus,
  excludedStatus,
}

class HostRosterRowIssue {
  const HostRosterRowIssue(this.type, {this.rowNumber, this.value});

  final HostRosterRowIssueType type;
  final int? rowNumber;
  final String? value;
}

class HostRosterTable {
  const HostRosterTable({
    required this.fileName,
    required this.format,
    required this.headers,
    required this.rows,
    required this.suggestedMapping,
    required this.adapter,
    this.fileFingerprint = '',
    this.usedLegacyEncoding = false,
    this.worksheetCount = 1,
  });

  final String fileName;
  final EventAttendeeImportFormat format;
  final List<String> headers;
  final List<List<String>> rows;
  final Map<HostRosterField, int?> suggestedMapping;
  final HostRosterAdapterDetection adapter;
  final String fileFingerprint;
  final bool usedLegacyEncoding;
  final int worksheetCount;

  HostRosterMappedRows mapRows(
    Map<HostRosterField, int?> mapping, {
    int? fallbackRevenueAmountMinor,
    String? fallbackRevenueCurrency,
  }) {
    final nameColumn = mapping[HostRosterField.displayName];
    if (nameColumn == null) {
      return const HostRosterMappedRows(
        rows: [],
        issues: [HostRosterRowIssue(HostRosterRowIssueType.missingNameColumn)],
        truncatedCount: 0,
        excludedCount: 0,
        needsReviewCount: 0,
      );
    }
    final mappedColumns = mapping.values.whereType<int>().toList();
    if (mappedColumns.toSet().length != mappedColumns.length) {
      return const HostRosterMappedRows(
        rows: [],
        issues: [
          HostRosterRowIssue(HostRosterRowIssueType.duplicateMappedColumn),
        ],
        truncatedCount: 0,
        excludedCount: 0,
        needsReviewCount: 0,
      );
    }
    final mapped = <EventAttendeeImportRow>[];
    final issues = <HostRosterRowIssue>[];
    final seenIdentities = <String>{};
    var excludedCount = 0;
    var needsReviewCount = 0;
    final boundedRows = rows.take(250).toList(growable: false);
    for (var index = 0; index < boundedRows.length; index += 1) {
      final source = boundedRows[index];
      final displayName = _valueAt(source, nameColumn);
      if (displayName.isEmpty) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.missingName,
            rowNumber: index + 2,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      final phone = _nullableValueAt(source, mapping[HostRosterField.phone]);
      final email = _nullableValueAt(source, mapping[HostRosterField.email]);
      final rawCity = _nullableValueAt(source, mapping[HostRosterField.city]);
      final city = rawCity == null ? null : cityOptionByName(rawCity);
      if (rawCity != null && city == null) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.invalidCity,
            rowNumber: index + 2,
            value: rawCity,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      final externalReference = _nullableValueAt(
        source,
        mapping[HostRosterField.externalReference],
      );
      final arrivalGroup = _nullableValueAt(
        source,
        mapping[HostRosterField.arrivalGroup],
      );
      final statusValue = _nullableValueAt(
        source,
        mapping[HostRosterField.status],
      );
      final rawRevenueAmount = _nullableValueAt(
        source,
        mapping[HostRosterField.revenueAmount],
      );
      final mappedRevenueAmountMinor = rawRevenueAmount == null
          ? null
          : parseHostRosterRevenueAmountMinor(rawRevenueAmount);
      if (rawRevenueAmount != null && mappedRevenueAmountMinor == null) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.invalidRevenueAmount,
            rowNumber: index + 2,
            value: rawRevenueAmount,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      final mappedCurrency = _nullableValueAt(
        source,
        mapping[HostRosterField.revenueCurrency],
      )?.toUpperCase();
      final revenueAmountMinor =
          mappedRevenueAmountMinor ?? fallbackRevenueAmountMinor;
      final revenueCurrency = mappedCurrency ?? fallbackRevenueCurrency;
      if (revenueAmountMinor != null &&
          (revenueCurrency == null ||
              !RegExp(r'^[A-Z]{3}$').hasMatch(revenueCurrency))) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.missingRevenueCurrency,
            rowNumber: index + 2,
            value: revenueCurrency,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      final parsedStatus = _parseStatus(statusValue);
      if (parsedStatus.disposition == _RosterRowDisposition.excluded) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.excludedStatus,
            rowNumber: index + 2,
            value: statusValue,
          ),
        );
        excludedCount += 1;
        continue;
      }
      if (parsedStatus.disposition == _RosterRowDisposition.needsReview) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.unknownStatus,
            rowNumber: index + 2,
            value: statusValue,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      if (phone != null && !_isValidRosterPhone(phone)) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.invalidPhone,
            rowNumber: index + 2,
            value: phone,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      if (email != null && !_isValidRosterEmail(email)) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.invalidEmail,
            rowNumber: index + 2,
            value: email,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      final identity = _stableRosterIdentity(
        phone: phone,
        email: email,
        externalReference: externalReference,
      );
      if (identity == null) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.missingStableIdentity,
            rowNumber: index + 2,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      if (!seenIdentities.add(identity)) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.duplicateIdentity,
            rowNumber: index + 2,
          ),
        );
        needsReviewCount += 1;
        continue;
      }
      mapped.add(
        EventAttendeeImportRow(
          rowId: '${index + 2}',
          displayName: displayName,
          phone: phone,
          email: email,
          cityMarketId: city?.effectiveMarketId,
          externalReference: externalReference,
          arrivalGroup: arrivalGroup,
          ticketType: _nullableValueAt(
            source,
            mapping[HostRosterField.ticketType],
          ),
          revenueAmountMinor: revenueAmountMinor,
          revenueCurrency: revenueAmountMinor == null ? null : revenueCurrency,
          revenueSource: revenueAmountMinor == null
              ? null
              : mappedRevenueAmountMinor != null
              ? EventAttendeeRevenueSource.hostImport
              : EventAttendeeRevenueSource.hostEstimate,
          status: parsedStatus.status,
        ),
      );
    }
    final phoneIdentities = <String, Set<String>>{};
    for (final row in mapped) {
      final phone = row.phone;
      if (phone == null) continue;
      final normalized = _normalizedRosterPhone(phone)!;
      phoneIdentities
          .putIfAbsent(normalized, () => <String>{})
          .add(
            row.externalReference?.trim().toLowerCase() ?? 'phone:$normalized',
          );
    }
    final ambiguousPhones = phoneIdentities.entries
        .where((entry) => entry.value.length > 1)
        .map((entry) => entry.key)
        .toSet();
    final ready = <EventAttendeeImportRow>[];
    for (final row in mapped) {
      if (row.phone != null &&
          ambiguousPhones.contains(_normalizedRosterPhone(row.phone!))) {
        issues.add(
          HostRosterRowIssue(
            HostRosterRowIssueType.duplicateIdentity,
            rowNumber: int.tryParse(row.rowId),
          ),
        );
        needsReviewCount += 1;
      } else {
        ready.add(row);
      }
    }
    return HostRosterMappedRows(
      rows: ready,
      issues: issues,
      truncatedCount: rows.length > 250 ? rows.length - 250 : 0,
      excludedCount: excludedCount,
      needsReviewCount: needsReviewCount,
    );
  }
}

class HostRosterMappedRows {
  const HostRosterMappedRows({
    required this.rows,
    required this.issues,
    required this.truncatedCount,
    required this.excludedCount,
    required this.needsReviewCount,
  });

  final List<EventAttendeeImportRow> rows;
  final List<HostRosterRowIssue> issues;
  final int truncatedCount;
  final int excludedCount;
  final int needsReviewCount;

  int get readyCount => rows.length;

  bool get hasBlockingMappingIssue => issues.any(
    (issue) =>
        issue.type == HostRosterRowIssueType.missingNameColumn ||
        issue.type == HostRosterRowIssueType.duplicateMappedColumn,
  );
}

class HostRosterImportPlan {
  const HostRosterImportPlan({
    required this.fileName,
    required this.fileFingerprint,
    required this.format,
    required this.rows,
    required this.readyCount,
    required this.needsReviewCount,
    required this.excludedCount,
    required this.adapterId,
    this.headers = const [],
    this.mapping = const {},
    this.intakeRows = const [],
  });

  factory HostRosterImportPlan.fromMappedRows({
    required HostRosterTable table,
    required HostRosterMappedRows mapped,
    required Map<HostRosterField, int?> mapping,
  }) => HostRosterImportPlan(
    fileName: table.fileName,
    fileFingerprint: table.fileFingerprint,
    format: table.format,
    rows: List.unmodifiable(mapped.rows),
    readyCount: mapped.readyCount,
    needsReviewCount: mapped.needsReviewCount,
    excludedCount: mapped.excludedCount,
    adapterId: table.adapter.adapterId,
    headers: List.unmodifiable(table.headers),
    mapping: Map.unmodifiable(mapping),
    intakeRows: List.unmodifiable(
      _buildIntakeRows(table: table, mapped: mapped, mapping: mapping),
    ),
  );

  final String fileName;
  final String fileFingerprint;
  final EventAttendeeImportFormat format;
  final List<EventAttendeeImportRow> rows;
  final int readyCount;
  final int needsReviewCount;
  final int excludedCount;
  final HostRosterAdapterId adapterId;
  final List<String> headers;
  final Map<HostRosterField, int?> mapping;
  final List<Map<String, Object?>> intakeRows;

  ExternalBookingProvider get bookingProvider => switch (adapterId) {
    HostRosterAdapterId.lumaV1 => ExternalBookingProvider.luma,
    HostRosterAdapterId.eventbriteV1 => ExternalBookingProvider.eventbrite,
    HostRosterAdapterId.partifulV1 => ExternalBookingProvider.partiful,
    HostRosterAdapterId.poshV1 => ExternalBookingProvider.posh,
    HostRosterAdapterId.genericV1 ||
    HostRosterAdapterId.sampleRequired => ExternalBookingProvider.generic,
  };
}

List<String> uniqueHostRosterHeaders(List<String> rawHeaders) {
  final counts = <String, int>{};
  return [
    for (var index = 0; index < rawHeaders.length; index += 1)
      () {
        final base = rawHeaders[index].trim().isEmpty
            ? 'Column ${index + 1}'
            : rawHeaders[index].trim();
        final count = counts.update(
          base,
          (value) => value + 1,
          ifAbsent: () => 1,
        );
        return count == 1 ? base : '$base ($count)';
      }(),
  ];
}

Map<HostRosterField, int?> suggestHostRosterMapping(
  List<String> headers, {
  HostRosterAdapterId adapterId = HostRosterAdapterId.genericV1,
}) {
  int? firstAlias(Set<String> aliases) {
    for (var index = 0; index < headers.length; index += 1) {
      final normalized = _normalizeHeader(headers[index]);
      if (aliases.contains(normalized)) return index;
    }
    return null;
  }

  return {
    HostRosterField.displayName: firstAlias({
      'name',
      'fullname',
      'guestname',
      'attendeename',
      'participantname',
      'ticketbuyer',
      'ticketbuyername',
      'buyername',
      'customername',
    }),
    HostRosterField.phone: firstAlias({
      'phone',
      'phonenumber',
      'mobile',
      'mobilenumber',
      'contactnumber',
      'whatsapp',
      'phonee164',
      'guestphone',
    }),
    HostRosterField.email: firstAlias({
      'email',
      'emailaddress',
      'guestemail',
      'attendeeemail',
    }),
    HostRosterField.city: firstAlias({
      'city',
      'guestcity',
      'attendeecity',
      'residencecity',
    }),
    HostRosterField.externalReference: firstAlias(
      _externalReferenceAliases(adapterId),
    ),
    HostRosterField.arrivalGroup: firstAlias(_arrivalGroupAliases(adapterId)),
    HostRosterField.ticketType: firstAlias({
      'ticket',
      'tickettype',
      'category',
      'pass',
      'ticketname',
    }),
    HostRosterField.revenueAmount: firstAlias({
      'amount',
      'amountpaid',
      'paidamount',
      'ordertotal',
      'ticketprice',
      'ticketamount',
      'revenue',
      'grossrevenue',
    }),
    HostRosterField.revenueCurrency: firstAlias({
      'currency',
      'currencycode',
      'paymentcurrency',
    }),
    HostRosterField.status: firstAlias({
      'status',
      'registrationstatus',
      'bookingstatus',
      'rsvpstatus',
      'approvalstatus',
      'attendeestatus',
      'checkinstatus',
    }),
  };
}

Set<String> _externalReferenceAliases(HostRosterAdapterId adapterId) =>
    switch (adapterId) {
      HostRosterAdapterId.eventbriteV1 || HostRosterAdapterId.poshV1 => {
        'attendeeid',
        'ticketid',
        'ticketkey',
        'id',
      },
      HostRosterAdapterId.lumaV1 => {'guestkey', 'guestid', 'attendeeid', 'id'},
      HostRosterAdapterId.genericV1 ||
      HostRosterAdapterId.partifulV1 ||
      HostRosterAdapterId.sampleRequired => {
        'id',
        'reference',
        'bookingid',
        'orderid',
        'ticketid',
        'guestkey',
        'ticketkey',
        'attendeeid',
        'order',
        'ordernumber',
      },
    };

Set<String> _arrivalGroupAliases(HostRosterAdapterId adapterId) {
  const common = {
    'arrivalgroup',
    'groupid',
    'partyid',
    'bookinggroup',
    'buyeremail',
    'ticketbuyeremail',
  };
  return switch (adapterId) {
    HostRosterAdapterId.eventbriteV1 || HostRosterAdapterId.poshV1 => {
      'orderid',
      'ordernumber',
      'order',
      'bookingid',
      ...common,
    },
    HostRosterAdapterId.genericV1 ||
    HostRosterAdapterId.lumaV1 ||
    HostRosterAdapterId.partifulV1 ||
    HostRosterAdapterId.sampleRequired => common,
  };
}

String _normalizeHeader(String value) =>
    value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');

String _valueAt(List<String> row, int index) =>
    index >= 0 && index < row.length ? row[index].trim() : '';

String? _nullableValueAt(List<String> row, int? index) {
  if (index == null) return null;
  final value = _valueAt(row, index);
  return value.isEmpty ? null : value;
}

int? parseHostRosterRevenueAmountMinor(String value) {
  final normalized = value.trim().replaceAll(',', '');
  final match = RegExp(
    r'^(?:[^0-9-]*)?([0-9]+)(?:\.([0-9]{1,2}))?$',
  ).firstMatch(normalized);
  if (match == null) return null;
  final whole = int.tryParse(match.group(1)!);
  if (whole == null) return null;
  final fraction = (match.group(2) ?? '').padRight(2, '0');
  final minor = whole * 100 + (int.tryParse(fraction) ?? 0);
  return minor <= 9007199254740991 ? minor : null;
}

enum _RosterRowDisposition { ready, needsReview, excluded }

class _ParsedRosterStatus {
  const _ParsedRosterStatus(this.status, this.disposition);

  final EventAttendeeStatus status;
  final _RosterRowDisposition disposition;
}

_ParsedRosterStatus _parseStatus(String? value) {
  final normalized = _normalizeHeader(value ?? '');
  if ({'waitlist', 'waitlisted', 'waiting'}.contains(normalized)) {
    return const _ParsedRosterStatus(
      EventAttendeeStatus.waitlisted,
      _RosterRowDisposition.ready,
    );
  }
  if ({'invited', 'invite', 'pending'}.contains(normalized)) {
    return const _ParsedRosterStatus(
      EventAttendeeStatus.invited,
      _RosterRowDisposition.ready,
    );
  }
  if ({
    'cancelled',
    'canceled',
    'refunded',
    'declined',
    'rejected',
    'notgoing',
    'noshow',
    'void',
    'voided',
  }.contains(normalized)) {
    return const _ParsedRosterStatus(
      EventAttendeeStatus.cancelled,
      _RosterRowDisposition.excluded,
    );
  }
  if ({
    '',
    'registered',
    'confirmed',
    'approved',
    'accepted',
    'attending',
    'going',
    'booked',
    'checkedin',
  }.contains(normalized)) {
    return const _ParsedRosterStatus(
      EventAttendeeStatus.registered,
      _RosterRowDisposition.ready,
    );
  }
  return const _ParsedRosterStatus(
    EventAttendeeStatus.cancelled,
    _RosterRowDisposition.needsReview,
  );
}

bool _isValidRosterEmail(String value) =>
    RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value.trim());

String? _normalizedRosterPhone(String value) {
  var normalized = value.trim().replaceAll(RegExp(r'[^\d+]'), '');
  if (normalized.startsWith('00')) normalized = '+${normalized.substring(2)}';
  if (!normalized.startsWith('+')) {
    final digits = normalized.replaceFirst(RegExp(r'^0+'), '');
    normalized = digits.length == 10 ? '+91$digits' : '+$digits';
  }
  return RegExp(r'^\+[1-9][0-9]{7,14}$').hasMatch(normalized)
      ? normalized
      : null;
}

bool _isValidRosterPhone(String value) => _normalizedRosterPhone(value) != null;

String? _stableRosterIdentity({
  required String? phone,
  required String? email,
  required String? externalReference,
}) {
  final reference = externalReference?.trim().toLowerCase();
  if (reference != null && reference.isNotEmpty) return 'external:$reference';
  if (phone != null) return 'phone:${_normalizedRosterPhone(phone)}';
  if (email != null) return 'email:${email.trim().toLowerCase()}';
  return null;
}
