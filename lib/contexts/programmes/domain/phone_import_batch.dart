import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';

/// Frozen command for one explicitly confirmed review. Retain this exact object
/// across an ambiguous transport failure; rebuilding a review is a new command.
/// This is neither a contact store nor proof of workspace authority.
class PhoneImportBatch {
  PhoneImportBatch._({
    required this.accountId,
    required this.programId,
    required this.organizerId,
    required this.operationId,
    required this.rows,
  });

  factory PhoneImportBatch.fromReview({
    required PhoneImportReview review,
    required String accountId,
    required String programId,
    required String organizerId,
    required Map<PhoneImportFamilySide, String> familySideLabels,
  }) {
    if (accountId.trim().isEmpty ||
        programId.trim().isEmpty ||
        programId.length > 180 ||
        organizerId.trim().isEmpty ||
        !RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(review.reviewId) ||
        review.entries.isEmpty ||
        review.entries.length > 100) {
      throw const ValidationException(
        'Choose a wedding and review 1–100 guests.',
      );
    }
    final references = <String>{};
    final rows = <Map<String, Object?>>[];
    for (final entry in review.entries) {
      final name = entry.displayName.trim();
      final household = entry.household.trim();
      if (entry.selectedPhone != null && entry.phoneForImport == null) {
        throw const ValidationException(
          'Review the selected phone with its international country code.',
          code: 'phone-import-country-code-required',
        );
      }
      if (!entry.valid ||
          (entry.selectedPhone != null &&
              !entry.numbers.any(
                (number) => number.value == entry.selectedPhone,
              )) ||
          name.length > 140 ||
          household.length > 140 ||
          !RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(entry.id)) {
        throw const ValidationException(
          'Review each guest name, phone and household.',
        );
      }
      // The local opaque row id persists through edits of this draft. A shared
      // number or matching name never becomes a guest identity or dedup key.
      final prefix = entry.source == PhoneImportEntrySource.systemContactPicker
          ? 'phone-picker'
          : 'phone-household';
      final reference = '$prefix:${entry.id}';
      if (!references.add(reference)) {
        throw const ValidationException(
          'Each selected guest needs a distinct row.',
        );
      }
      final row = <String, Object?>{
        'displayName': name,
        'externalReference': reference,
      };
      if (entry.selectedPhone != null) {
        // Formatting cleanup only: local numbers need explicit country-code
        // review before this seam is mounted. Never infer a country or owner.
        final phone = entry.phoneForImport;
        if (phone == null) {
          throw const ValidationException(
            'Review the selected phone with its international country code.',
            code: 'phone-import-country-code-required',
          );
        }
        row['phoneE164'] = phone;
      }
      if (household.isNotEmpty) row['householdLabel'] = household;
      if (entry.familySide != PhoneImportFamilySide.unassigned) {
        final label = familySideLabels[entry.familySide]?.trim();
        if (label == null ||
            label.isEmpty ||
            label.contains(';') ||
            label.length > 140) {
          throw const ValidationException(
            'Choose an existing wedding family-side label.',
          );
        }
        // Canonical manifest schema accepts a cell string, never an array.
        row['groupLabels'] = 'side:$label';
      }
      rows.add(Map.unmodifiable(row));
    }
    return PhoneImportBatch._(
      accountId: accountId,
      programId: programId,
      organizerId: organizerId,
      operationId: review.reviewId,
      rows: List.unmodifiable(rows),
    );
  }

  Map<String, Object?> toJson() => {
    'accountId': accountId,
    'programId': programId,
    'organizerId': organizerId,
    'clientOperationId': operationId,
    'rows': rows,
  };

  /// Restores only a frozen confirmed command, never an address-book entry.
  factory PhoneImportBatch.fromJson(Map<String, Object?> value) {
    String text(Map<String, Object?> map, String key, int max) {
      final v = map[key];
      if (v is! String || v.trim().isEmpty || v.length > max) {
        throw const ValidationException('The saved import needs recovery.');
      }
      return v;
    }

    if (value.keys.toSet().difference({
      'accountId',
      'programId',
      'organizerId',
      'clientOperationId',
      'rows',
    }).isNotEmpty) {
      throw const ValidationException('The saved import needs recovery.');
    }
    final actor = text(value, 'accountId', 180);
    final program = text(value, 'programId', 180);
    final organizer = text(value, 'organizerId', 180);
    final operation = text(value, 'clientOperationId', 120);
    final rawRows = value['rows'];
    if (!RegExp(r'^[A-Za-z0-9_-]{8,120}$').hasMatch(operation) ||
        rawRows is! List ||
        rawRows.isEmpty ||
        rawRows.length > 100) {
      throw const ValidationException('The saved import needs recovery.');
    }
    final references = <String>{};
    final restored = <Map<String, Object?>>[];
    for (final raw in rawRows) {
      if (raw is! Map || raw.keys.any((key) => key is! String)) {
        throw const ValidationException('The saved import needs recovery.');
      }
      final row = Map<String, Object?>.from(raw);
      if (row.keys.toSet().difference({
        'displayName',
        'externalReference',
        'phoneE164',
        'householdLabel',
        'groupLabels',
      }).isNotEmpty) {
        throw const ValidationException('The saved import needs recovery.');
      }
      text(row, 'displayName', 140);
      final reference = text(row, 'externalReference', 180);
      if (!RegExp(
            r'^phone-(picker|household):[A-Za-z0-9_-]{8,120}$',
          ).hasMatch(reference) ||
          !references.add(reference)) {
        throw const ValidationException('The saved import needs recovery.');
      }
      if (row.containsKey('phoneE164')) {
        if (!RegExp(
          r'^\+[1-9][0-9]{1,14}$',
        ).hasMatch(text(row, 'phoneE164', 20))) {
          throw const ValidationException('The saved import needs recovery.');
        }
      } else if (reference.startsWith('phone-picker:')) {
        throw const ValidationException('The saved import needs recovery.');
      }
      if (row.containsKey('householdLabel')) text(row, 'householdLabel', 140);
      if (row.containsKey('groupLabels')) {
        final group = text(row, 'groupLabels', 145);
        if (!group.startsWith('side:') ||
            group.length == 5 ||
            group.contains(';')) {
          throw const ValidationException('The saved import needs recovery.');
        }
      }
      restored.add(Map.unmodifiable(row));
    }
    return PhoneImportBatch._(
      accountId: actor,
      programId: program,
      organizerId: organizer,
      operationId: operation,
      rows: List.unmodifiable(restored),
    );
  }

  final String accountId;
  final String programId;
  final String organizerId;
  final String operationId;
  final List<Map<String, Object?>> rows;

  /// Includes actor, destination and row order, not just the callable payload.
  String get contentKey =>
      jsonEncode([accountId, programId, organizerId, operationId, rows]);
}
