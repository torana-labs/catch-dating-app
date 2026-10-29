import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_roster_intake_repository.g.dart';

// keepalive: one callable client owns saved review start, resume, revise, and
// apply operations across the event-scoped intake surface.
@Riverpod(keepAlive: true)
HostRosterIntakeRepository hostRosterIntakeRepository(Ref ref) =>
    HostRosterIntakeRepository(ref.watch(firebaseFunctionsProvider));

class HostRosterIntakeRepository {
  const HostRosterIntakeRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostRosterIntakeReview> start({
    required String eventId,
    required String organizerId,
    required HostRosterImportPlan plan,
  }) => _call(
    ManageHostRosterIntakeCallableRequest(
      action: 'start',
      organizerId: organizerId,
      eventId: eventId,
      fileFingerprint: plan.fileFingerprint,
      fileName: plan.fileName,
      format: plan.format.name,
      headers: plan.headers,
      mapping: {
        for (final entry in plan.mapping.entries)
          if (entry.value != null) entry.key.name: entry.value,
      },
      rows: plan.intakeRows,
    ),
  );

  Future<HostRosterIntakeReview> resume(String sessionId) => _call(
    ManageHostRosterIntakeCallableRequest(
      action: 'preview',
      sessionId: sessionId,
    ),
  );

  Future<HostRosterIntakeReview> setExcludedRows(
    HostRosterIntakeReview review,
    Iterable<String> rowIds,
  ) => _call(
    ManageHostRosterIntakeCallableRequest(
      action: 'revise',
      sessionId: review.sessionId,
      expectedRevision: review.revision,
      rows: review.evidenceRows,
      excludedRowIds: rowIds.toList(growable: false),
    ),
  );

  Future<HostRosterIntakeReview> apply(HostRosterIntakeReview review) => _call(
    ManageHostRosterIntakeCallableRequest(
      action: 'apply',
      sessionId: review.sessionId,
      reviewHash: review.reviewHash,
    ),
  );

  Future<HostRosterIntakeReview> _call(
    ManageHostRosterIntakeCallableRequest request,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('manageHostRosterIntake')
          .call<Object?>(request.toJson());
      return HostRosterIntakeReview.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'manage reviewed Host roster intake',
      resource: 'hostRosterIntakeSessions',
    ),
  );
}

class HostRosterIntakeReview {
  const HostRosterIntakeReview({
    required this.sessionId,
    required this.revision,
    required this.fileName,
    required this.state,
    required this.reviewHash,
    required this.eligibleForApply,
    required this.counts,
    required this.rows,
    required this.evidenceRows,
    required this.excludedRowIds,
    this.result,
  });

  factory HostRosterIntakeReview.fromCallableData(Object? value) {
    final root = _map(value);
    final draft = _map(root['draft']);
    final previewValue = root['preview'];
    final preview = previewValue == null
        ? const <String, Object?>{}
        : _map(previewValue);
    final resultValue = root['result'];
    return HostRosterIntakeReview(
      sessionId: draft['sessionId'] as String,
      revision: (draft['revision'] as num).toInt(),
      fileName: draft['fileName'] as String,
      state: draft['state'] as String,
      reviewHash: preview['reviewHash'] as String? ?? '',
      eligibleForApply: preview['eligibleForApply'] as bool? ?? false,
      counts:
          (preview['counts'] == null
                  ? const <String, Object?>{}
                  : _map(preview['counts']))
              .map((key, count) => MapEntry(key, (count as num).toInt())),
      rows: (preview['rows'] as List<Object?>? ?? const [])
          .map((row) => HostRosterIntakePreviewRow.fromJson(_map(row)))
          .toList(growable: false),
      evidenceRows: (draft['rows'] as List<Object?>)
          .map(_map)
          .toList(growable: false),
      excludedRowIds: (draft['excludedRowIds'] as List<Object?>)
          .cast<String>()
          .toList(growable: false),
      result: resultValue == null
          ? null
          : EventAttendeeImportResult.fromCallableData(resultValue),
    );
  }

  final String sessionId;
  final int revision;
  final String fileName;
  final String state;
  final String reviewHash;
  final bool eligibleForApply;
  final Map<String, int> counts;
  final List<HostRosterIntakePreviewRow> rows;
  final List<Map<String, Object?>> evidenceRows;
  final List<String> excludedRowIds;
  final EventAttendeeImportResult? result;

  Iterable<String> get unresolvedRowIds => rows
      .where(
        (row) => row.kind == 'needsReview' || row.kind == 'identityConflict',
      )
      .map((row) => row.rowId);
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
        fieldChanges: (json['fieldChanges'] as List<Object?>)
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
