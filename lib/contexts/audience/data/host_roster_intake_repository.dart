import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:catch_dating_app/contexts/audience/domain/guest_list_import_preview.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_roster_intake_repository.g.dart';

// Every call is the guests.import-list command (contracts/commands/catalog.json):
// a file preview, or a review session named by id. manageHostRosterIntake stays
// deployed only for older app builds.
//
// keepalive: account-free: one callable client owns guest-list preview, resume,
// revise and apply across the event-scoped intake surface.
@Riverpod(keepAlive: true)
HostRosterIntakeRepository hostRosterIntakeRepository(Ref ref) =>
    HostRosterIntakeRepository(ref.watch(firebaseFunctionsProvider));

/// One idempotency key per guest-list review, as the command envelope asks.
String newGuestListImportKey() {
  final random = Random.secure();
  return 'guestimport-${List.generate(24, (_) => random.nextInt(16).toRadixString(16)).join()}';
}

class HostRosterIntakeRepository {
  const HostRosterIntakeRepository(this._functions);

  final FirebaseFunctions _functions;

  /// The newest guest list still in review for this event, such as one
  /// forwarded by email or WhatsApp, or null when none is waiting.
  Future<String?> latestInReviewSessionId({required String eventId}) =>
      withBackendErrorContext(
        () async {
          try {
            final data = await _command(
              mode: 'preview',
              idempotencyKey: newGuestListImportKey(),
              input: {'eventId': eventId},
            );
            return HostRosterIntakeReview.fromCommandData(
              data,
              idempotencyKey: '',
            ).sessionId;
          } on FirebaseFunctionsException catch (error) {
            if (error.code == 'not-found') return null;
            rethrow;
          }
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'find a guest list waiting for review',
          resource: 'hostRosterIntakeSessions',
        ),
      );

  /// Sends the file to guests.import-list, which reads it on the server
  /// and holds its rows in a review session. [mapping] and
  /// [fallbackRevenue] are the host's choices; null keeps the server's.
  Future<GuestListImportPreview> previewGuestList({
    required String eventId,
    required String fileName,
    required Uint8List bytes,
    required String idempotencyKey,
    Map<HostRosterField, int?>? mapping,
    GuestListFallbackRevenue? fallbackRevenue,
  }) => withBackendErrorContext(
    () async => GuestListImportPreview.fromCallableData(
      await _command(
        mode: 'preview',
        idempotencyKey: idempotencyKey,
        input: {
          'eventId': eventId,
          'file': {'fileName': fileName, 'contentBase64': base64Encode(bytes)},
          if (mapping != null)
            'mapping': {
              for (final entry in mapping.entries) entry.key.name: entry.value,
            },
          if (fallbackRevenue != null)
            'fallbackRevenue': {
              'amountMinor': fallbackRevenue.amountMinor,
              'currency': fallbackRevenue.currency,
            },
        },
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'read a guest list',
      resource: 'hostRosterIntakeSessions',
    ),
  );

  /// Opens a review session by id with a fresh command key.
  Future<HostRosterIntakeReview> resume(String sessionId) {
    final key = newGuestListImportKey();
    return _review(
      mode: 'preview',
      idempotencyKey: key,
      input: {'sessionId': sessionId},
    );
  }

  /// Previews the session again with [rowIds] left out.
  Future<HostRosterIntakeReview> setExcludedRows(
    HostRosterIntakeReview review,
    Iterable<String> rowIds,
  ) => _review(
    mode: 'preview',
    idempotencyKey: review.idempotencyKey,
    input: {
      'sessionId': review.sessionId,
      'excludedRowIds': rowIds.toList(growable: false),
    },
  );

  /// Saves exactly the reviewed preview, confirmed by its hash.
  Future<HostRosterIntakeReview> apply(HostRosterIntakeReview review) =>
      _review(
        mode: 'apply',
        idempotencyKey: review.idempotencyKey,
        input: {
          'sessionId': review.sessionId,
          'excludedRowIds': review.excludedRowIds,
        },
        confirm: {
          'commandId': 'guests.import-list',
          'previewHash': review.previewHash,
        },
      );

  Future<HostRosterIntakeReview> _review({
    required String mode,
    required String idempotencyKey,
    required Map<String, Object?> input,
    Map<String, Object?>? confirm,
  }) => withBackendErrorContext(
    () async => HostRosterIntakeReview.fromCommandData(
      await _command(
        mode: mode,
        idempotencyKey: idempotencyKey,
        input: input,
        confirm: confirm,
      ),
      idempotencyKey: idempotencyKey,
    ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review a guest list',
      resource: 'hostRosterIntakeSessions',
    ),
  );

  Future<Object?> _command({
    required String mode,
    required String idempotencyKey,
    required Map<String, Object?> input,
    Map<String, Object?>? confirm,
  }) async {
    final result = await _functions
        .httpsCallable('importGuestList')
        .call<Object?>(
          ImportGuestListCallableRequest(
            mode: mode,
            idempotencyKey: idempotencyKey,
            surface: 'catch_host',
            input: input,
            confirm: confirm,
          ).toJson(),
        );
    return result.data;
  }
}

/// One guest-list review as guests.import-list answers it. The
/// [idempotencyKey] and [previewHash] carry the review to its apply.
class HostRosterIntakeReview {
  const HostRosterIntakeReview({
    required this.sessionId,
    required this.revision,
    required this.fileName,
    required this.state,
    required this.reviewHash,
    required this.previewHash,
    required this.idempotencyKey,
    required this.eligibleForApply,
    required this.counts,
    required this.rows,
    required this.excludedRowIds,
    this.result,
  });

  factory HostRosterIntakeReview.fromCommandData(
    Object? value, {
    required String idempotencyKey,
  }) {
    final root = _map(value);
    final result = _map(root['result']);
    final sessionId = result['sessionId'];
    if (sessionId is! String) {
      throw const FormatException('Guest list review has no session.');
    }
    final status = root['status'] as String;
    final imported = result['import'];
    return HostRosterIntakeReview(
      sessionId: sessionId,
      revision: (result['revision'] as num? ?? 0).toInt(),
      fileName: result['fileName'] as String? ?? '',
      state: status == 'applied' || status == 'replayed' ? 'applied' : 'review',
      reviewHash: result['reviewHash'] as String? ?? '',
      previewHash: root['previewHash'] as String? ?? '',
      idempotencyKey: idempotencyKey,
      eligibleForApply: result['eligibleForApply'] as bool? ?? false,
      counts:
          (result['counts'] == null
                  ? const <String, Object?>{}
                  : _map(result['counts']))
              .map((key, count) => MapEntry(key, (count as num).toInt())),
      rows: (result['rows'] as List<Object?>? ?? const [])
          .map((row) => HostRosterIntakePreviewRow.fromJson(_map(row)))
          .toList(growable: false),
      excludedRowIds: (result['excludedRowIds'] as List<Object?>? ?? const [])
          .cast<String>()
          .toList(growable: false),
      result: imported == null ? null : _importResult(_map(imported)),
    );
  }

  final String sessionId;
  final int revision;
  final String fileName;
  final String state;
  final String reviewHash;
  final String previewHash;
  final String idempotencyKey;
  final bool eligibleForApply;
  final Map<String, int> counts;
  final List<HostRosterIntakePreviewRow> rows;
  final List<String> excludedRowIds;
  final EventAttendeeImportResult? result;

  Iterable<String> get unresolvedRowIds => rows
      .where(
        (row) => row.kind == 'needsReview' || row.kind == 'identityConflict',
      )
      .map((row) => row.rowId);
}

EventAttendeeImportResult _importResult(Map<String, Object?> imported) {
  final created = (imported['createdCount'] as num).toInt();
  final updated = (imported['updatedCount'] as num).toInt();
  final skipped = (imported['skippedCount'] as num).toInt();
  return EventAttendeeImportResult(
    importId: imported['importId'] as String,
    status: imported['status'] as String,
    rowCount: created + updated + skipped,
    createdCount: created,
    updatedCount: updated,
    skippedCount: skipped,
    errors: const [],
    replayed: false,
  );
}

class HostRosterIntakePreviewRow {
  const HostRosterIntakePreviewRow({
    required this.rowId,
    required this.sourceRowNumber,
    this.displayName = '',
    this.externalReference,
    required this.kind,
    required this.changedFields,
    this.fieldChanges = const [],
    required this.issueCode,
  });

  factory HostRosterIntakePreviewRow.fromJson(Map<String, Object?> json) =>
      HostRosterIntakePreviewRow(
        rowId: json['rowId'] as String,
        sourceRowNumber: (json['sourceRowNumber'] as num).toInt(),
        displayName: json['displayName'] as String,
        externalReference: json['externalReference'] as String?,
        kind: json['kind'] as String,
        changedFields: (json['changedFields'] as List<Object?>).cast<String>(),
        fieldChanges: (json['fieldChanges'] as List<Object?>? ?? const [])
            .map((value) => HostRosterIntakeFieldChange.fromJson(_map(value)))
            .toList(growable: false),
        issueCode: json['issueCode'] as String?,
      );

  final String rowId;
  final int sourceRowNumber;
  final String displayName;
  final String? externalReference;
  final String kind;
  final List<String> changedFields;
  final List<HostRosterIntakeFieldChange> fieldChanges;
  final String? issueCode;
}

class HostRosterIntakeFieldChange {
  const HostRosterIntakeFieldChange({
    required this.field,
    required this.currentValue,
    required this.proposedValue,
    required this.origin,
  });

  factory HostRosterIntakeFieldChange.fromJson(Map<String, Object?> json) =>
      HostRosterIntakeFieldChange(
        field: json['field'] as String,
        currentValue: json['currentValue'] as String?,
        proposedValue: json['proposedValue'] as String?,
        origin: json['origin'] as String?,
      );

  final String field;
  final String? currentValue;
  final String? proposedValue;
  final String? origin;
}

Map<String, Object?> _map(Object? value) {
  if (value is! Map<Object?, Object?>) {
    throw const FormatException('Invalid Host roster intake response.');
  }
  return value.map((key, value) => MapEntry(key as String, value));
}
