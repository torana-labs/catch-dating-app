import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:meta/meta.dart';

/// Polling cadence for a durable server export receipt, not a UI animation.
const hostFormExportReceiptPollingInterval = Duration(seconds: 2);

enum HostFormExportFormat { csv, xlsx }

enum HostFormExportStatus { pending, running, completed, failed, expired }

@immutable
class HostFormExportReceipt {
  const HostFormExportReceipt({
    required this.exportId,
    required this.status,
    required this.format,
    required this.rowCount,
    required this.downloadUrl,
    required this.expiresAt,
    required this.errorMessage,
    this.errorCode,
  });

  factory HostFormExportReceipt.fromCallableData(Object? data) {
    final map = formOperationRequiredMap(data, 'form export');
    return HostFormExportReceipt(
      exportId: formOperationRequiredString(map, 'exportId'),
      status: formOperationEnumByName(
        HostFormExportStatus.values,
        formOperationRequiredString(map, 'status'),
      ),
      format: formOperationEnumByName(
        HostFormExportFormat.values,
        formOperationRequiredString(map, 'format'),
      ),
      rowCount: formOperationRequiredInt(map, 'rowCount'),
      downloadUrl: formOperationNullableString(map['downloadUrl']),
      expiresAt: formOperationDateTime(map, 'expiresAtMillis'),
      errorMessage: formOperationNullableString(map['errorMessage']),
      errorCode: formOperationNullableString(map['errorCode']),
    );
  }

  final String exportId;
  final HostFormExportStatus status;
  final HostFormExportFormat format;
  final int rowCount;
  final String? downloadUrl;
  final DateTime expiresAt;
  final String? errorMessage;
  final String? errorCode;
}

/// Immutable command persisted before the first export callable attempt.
/// The backend uses requestId to return the same receipt after an uncertain
/// response; a later query is a new command only after this one resolves.
@immutable
class HostResponseExportCommand {
  HostResponseExportCommand({
    required this.accountId,
    required this.organizerId,
    required this.formId,
    required this.versionId,
    required this.requestId,
    required this.format,
    required List<String> statuses,
    required Map<String, Object?> responseQuery,
    required this.expectedQueryHash,
    required this.expectedResultHash,
    required this.createdAtMillis,
  }) : statuses = List<String>.unmodifiable(statuses),
       responseQuery = _freezeExportQuery(responseQuery);

  factory HostResponseExportCommand.fromJson(Map<String, Object?> map) {
    final rawQuery = map['responseQuery'];
    final rawStatuses = map['statuses'];
    if (rawQuery is! Map ||
        rawStatuses is! List ||
        rawStatuses.any((value) => value is! String)) {
      throw const FormatException('Saved response export is invalid.');
    }
    return HostResponseExportCommand(
      accountId: map['accountId']! as String,
      organizerId: map['organizerId']! as String,
      formId: map['formId']! as String,
      versionId: map['versionId']! as String,
      requestId: map['clientOperationId']! as String,
      format: HostFormExportFormat.values.byName(map['format']! as String),
      statuses: rawStatuses.cast<String>(),
      responseQuery: rawQuery.cast<String, Object?>(),
      expectedQueryHash: map['expectedQueryHash']! as String,
      expectedResultHash: map['expectedResultHash']! as String,
      createdAtMillis: map['createdAtMillis']! as int,
    );
  }

  final String accountId;
  final String organizerId;
  final String formId;
  final String versionId;
  final String requestId;
  final HostFormExportFormat format;
  final List<String> statuses;
  final Map<String, Object?> responseQuery;
  final String expectedQueryHash;
  final String expectedResultHash;
  final int createdAtMillis;

  String get scope => '$organizerId|$formId';

  bool matches(
    HostResponseQueryRequest request,
    String queryHash,
    String resultHash,
  ) =>
      organizerId == request.organizerId &&
      formId == request.formId &&
      versionId == request.versionId &&
      expectedQueryHash == queryHash &&
      expectedResultHash == resultHash;

  Map<String, Object?> toJson() => {
    'clientOperationId': requestId,
    'createdAtMillis': createdAtMillis,
    'status': 'pending',
    'accountId': accountId,
    'organizerId': organizerId,
    'formId': formId,
    'versionId': versionId,
    'format': format.name,
    'statuses': statuses,
    'responseQuery': responseQuery,
    'expectedQueryHash': expectedQueryHash,
    'expectedResultHash': expectedResultHash,
  };
}

Map<String, Object?> _freezeExportQuery(Map<String, Object?> value) =>
    _freezeExportValue(value) as Map<String, Object?>;

Object? _freezeExportValue(Object? value) {
  if (value is Map) {
    if (value.keys.any((key) => key is! String)) {
      throw const FormatException('Response export query keys are invalid.');
    }
    return Map<String, Object?>.unmodifiable(
      value.map<String, Object?>(
        (key, item) => MapEntry(key as String, _freezeExportValue(item)),
      ),
    );
  }
  if (value is List) {
    return List<Object?>.unmodifiable(value.map(_freezeExportValue));
  }
  if (value == null || value is String || value is num || value is bool) {
    return value;
  }
  throw const FormatException('Response export query value is invalid.');
}

/// Data-layer adapter owns durable request identity and callable replay.
abstract interface class HostResponseExportGateway {
  Future<HostResponseExportCommand?> pending({
    required String accountId,
    required String organizerId,
    required String formId,
  });
  Future<HostFormExportReceipt> execute(HostResponseExportCommand command);
}
