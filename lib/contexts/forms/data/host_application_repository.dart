import 'package:catch_dating_app/contexts/forms/domain/host_application_import.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';

part '../../../hosts/data/host_application_repository.g.dart';

enum HostApplicationSort {
  newest,
  oldest,
  name;

  String get wireValue => switch (this) {
    HostApplicationSort.newest => 'newest',
    HostApplicationSort.oldest => 'oldest',
    HostApplicationSort.name => 'name',
  };
}

@immutable
class HostApplicationListRequest {
  const HostApplicationListRequest({
    required this.organizerId,
    this.contactId,
    this.formId,
    this.targetId,
    this.reviewStatus,
    this.query,
    this.sort = HostApplicationSort.newest,
    this.cursor,
  });

  final String organizerId;
  final String? contactId;
  final String? formId;
  final String? targetId;
  final HostApplicationReviewStatus? reviewStatus;
  final String? query;
  final HostApplicationSort sort;
  final String? cursor;

  HostApplicationListRequest copyWith({String? cursor}) =>
      HostApplicationListRequest(
        organizerId: organizerId,
        contactId: contactId,
        formId: formId,
        targetId: targetId,
        reviewStatus: reviewStatus,
        query: query,
        sort: sort,
        cursor: cursor,
      );

  @override
  bool operator ==(Object other) =>
      other is HostApplicationListRequest &&
      other.organizerId == organizerId &&
      other.contactId == contactId &&
      other.formId == formId &&
      other.targetId == targetId &&
      other.reviewStatus == reviewStatus &&
      other.query == query &&
      other.sort == sort &&
      other.cursor == cursor;

  @override
  int get hashCode => Object.hash(
    organizerId,
    contactId,
    formId,
    targetId,
    reviewStatus,
    query,
    sort,
    cursor,
  );
}

class HostApplicationPage {
  const HostApplicationPage({
    required this.organizerId,
    required this.applications,
    required this.nextCursor,
  });

  factory HostApplicationPage.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'organizer applications');
    return HostApplicationPage(
      organizerId: _requiredString(map, 'organizerId'),
      applications: _mapList(
        map['applications'],
        'applications',
      ).map(HostApplicationSummary.fromMap).toList(growable: false),
      nextCursor: _nullableString(map['nextCursor']),
    );
  }

  final String organizerId;
  final List<HostApplicationSummary> applications;
  final String? nextCursor;
}

class HostApplicationAnswerValue {
  const HostApplicationAnswerValue({
    required this.valueKind,
    required this.textValue,
    required this.numberValue,
    required this.booleanValue,
    required this.dateValue,
    required this.optionValues,
    required this.assetIds,
  });

  factory HostApplicationAnswerValue.fromMap(Map<Object?, Object?> map) =>
      HostApplicationAnswerValue(
        valueKind: _requiredString(map, 'valueKind'),
        textValue: _nullableString(map['textValue']),
        numberValue: _nullableNumber(map['numberValue']),
        booleanValue: _nullableBool(map['booleanValue']),
        dateValue: _nullableString(map['dateValue']),
        optionValues: _stringList(map['optionValues']),
        assetIds: _stringList(map['assetIds']),
      );

  final String valueKind;
  final String? textValue;
  final num? numberValue;
  final bool? booleanValue;
  final String? dateValue;
  final List<String> optionValues;
  final List<String> assetIds;
}

class HostApplicationAnswer {
  const HostApplicationAnswer({
    required this.questionId,
    required this.questionKey,
    required this.questionLabel,
    required this.questionKind,
    required this.canonicalFieldId,
    required this.privacyClass,
    required this.hostPresentation,
    required this.value,
  });

  factory HostApplicationAnswer.fromMap(Map<Object?, Object?> map) =>
      HostApplicationAnswer(
        questionId: _requiredString(map, 'questionId'),
        questionKey: _requiredString(map, 'questionKey'),
        questionLabel: _requiredString(map, 'questionLabel'),
        questionKind: _requiredString(map, 'questionKind'),
        canonicalFieldId: _nullableString(map['canonicalFieldId']),
        privacyClass: _requiredString(map, 'privacyClass'),
        hostPresentation: _requiredString(map, 'hostPresentation'),
        value: HostApplicationAnswerValue.fromMap(
          _requiredMap(map['value'], 'application answer value'),
        ),
      );

  final String questionId;
  final String questionKey;
  final String questionLabel;
  final String questionKind;
  final String? canonicalFieldId;
  final String privacyClass;
  final String hostPresentation;
  final HostApplicationAnswerValue value;
}

class HostApplicationOutreach {
  const HostApplicationOutreach({
    required this.phoneE164,
    required this.email,
    required this.instagramUrl,
    required this.linkedinUrl,
  });

  factory HostApplicationOutreach.fromMap(Map<Object?, Object?> map) =>
      HostApplicationOutreach(
        phoneE164: _nullableString(map['phoneE164']),
        email: _nullableString(map['email']),
        instagramUrl: _nullableString(map['instagramUrl']),
        linkedinUrl: _nullableString(map['linkedinUrl']),
      );

  final String? phoneE164;
  final String? email;
  final String? instagramUrl;
  final String? linkedinUrl;
}

class HostApplicationDetail {
  const HostApplicationDetail({
    required this.organizerId,
    required this.applicationId,
    required this.formId,
    required this.formVersionId,
    required this.targetKind,
    required this.targetId,
    required this.applicantDisplayName,
    required this.reviewStatus,
    required this.answers,
    required this.outreach,
    required this.reviewNote,
    required this.assignedReviewerUid,
    required this.submittedAt,
    required this.reviewedAt,
    required this.revision,
    this.contactId,
    this.sourceResponseId,
    this.dataAccessState,
  });

  factory HostApplicationDetail.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'organizer application detail');
    return HostApplicationDetail(
      organizerId: _requiredString(map, 'organizerId'),
      applicationId: _requiredString(map, 'applicationId'),
      formId: _requiredString(map, 'formId'),
      formVersionId: _requiredString(map, 'formVersionId'),
      targetKind: _requiredString(map, 'targetKind'),
      targetId: _nullableString(map['targetId']),
      applicantDisplayName: _requiredString(map, 'applicantDisplayName'),
      reviewStatus: _enumByName(
        HostApplicationReviewStatus.values,
        _requiredString(map, 'reviewStatus'),
        'application review status',
      ),
      answers: _mapList(
        map['answers'],
        'application answers',
      ).map(HostApplicationAnswer.fromMap).toList(growable: false),
      outreach: HostApplicationOutreach.fromMap(
        _requiredMap(map['outreach'], 'application outreach'),
      ),
      reviewNote: _nullableString(map['reviewNote']),
      assignedReviewerUid: _nullableString(map['assignedReviewerUid']),
      submittedAt: _requiredDateTimeFromMillis(map, 'submittedAtMillis'),
      reviewedAt: _dateTimeFromMillis(map['reviewedAtMillis']),
      revision: _requiredInt(map, 'revision'),
      contactId: _nullableString(map['contactId']),
      sourceResponseId: _nullableString(map['sourceResponseId']),
      dataAccessState: _nullableString(map['dataAccessState']),
    );
  }

  final String organizerId;
  final String applicationId;
  final String formId;
  final String formVersionId;
  final String targetKind;
  final String? targetId;
  final String applicantDisplayName;
  final HostApplicationReviewStatus reviewStatus;
  final List<HostApplicationAnswer> answers;
  final HostApplicationOutreach outreach;
  final String? reviewNote;
  final String? assignedReviewerUid;
  final DateTime submittedAt;
  final DateTime? reviewedAt;
  final int revision;
  final String? contactId;
  final String? sourceResponseId;
  final String? dataAccessState;
}

class HostApplicationReviewResult {
  const HostApplicationReviewResult({
    required this.organizerId,
    required this.applicationId,
    required this.reviewStatus,
    required this.reviewedAt,
    required this.revision,
    this.contactId,
  });

  factory HostApplicationReviewResult.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'application review result');
    return HostApplicationReviewResult(
      organizerId: _requiredString(map, 'organizerId'),
      applicationId: _requiredString(map, 'applicationId'),
      reviewStatus: _enumByName(
        HostApplicationReviewStatus.values,
        _requiredString(map, 'reviewStatus'),
        'application review status',
      ),
      reviewedAt: _requiredDateTimeFromMillis(map, 'reviewedAtMillis'),
      revision: _requiredInt(map, 'revision'),
      contactId: _nullableString(map['contactId']),
    );
  }

  final String organizerId;
  final String applicationId;
  final HostApplicationReviewStatus reviewStatus;
  final DateTime reviewedAt;
  final int revision;
  final String? contactId;
}

class HostPublishedApplicationForm {
  const HostPublishedApplicationForm({
    required this.organizerId,
    required this.formId,
    required this.formVersionId,
    required this.version,
    required this.revision,
  });

  factory HostPublishedApplicationForm.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'published application form');
    return HostPublishedApplicationForm(
      organizerId: _requiredString(map, 'organizerId'),
      formId: _requiredString(map, 'formId'),
      formVersionId: _requiredString(map, 'formVersionId'),
      version: _requiredInt(map, 'version'),
      revision: _requiredInt(map, 'revision'),
    );
  }

  final String organizerId;
  final String formId;
  final String formVersionId;
  final int version;
  final int revision;
}

class HostApplicationImportPreview {
  const HostApplicationImportPreview({
    required this.rowCount,
    required this.validRowCount,
    required this.invalidRowCount,
  });

  factory HostApplicationImportPreview.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'application import preview');
    return HostApplicationImportPreview(
      rowCount: _requiredInt(map, 'rowCount'),
      validRowCount: _requiredInt(map, 'validRowCount'),
      invalidRowCount: _requiredInt(map, 'invalidRowCount'),
    );
  }

  final int rowCount;
  final int validRowCount;
  final int invalidRowCount;
}

class HostApplicationImportResult {
  const HostApplicationImportResult({
    required this.receiptId,
    required this.status,
    required this.rowCount,
    required this.createdCount,
    required this.skippedCount,
    required this.replayed,
  });

  factory HostApplicationImportResult.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'application import result');
    return HostApplicationImportResult(
      receiptId: _requiredString(map, 'receiptId'),
      status: _requiredString(map, 'status'),
      rowCount: _requiredInt(map, 'rowCount'),
      createdCount: _requiredInt(map, 'createdCount'),
      skippedCount: _requiredInt(map, 'skippedCount'),
      replayed: _requiredBool(map, 'replayed'),
    );
  }

  final String receiptId;
  final String status;
  final int rowCount;
  final int createdCount;
  final int skippedCount;
  final bool replayed;
}

class HostApplicationRepository {
  const HostApplicationRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostPublishedApplicationForm> publishImportedForm({
    required String organizerId,
    required HostApplicationImportDraft draft,
    required String consentCopy,
    required String consentVersion,
    required String retentionCopy,
  }) => _call(
    name: 'publishOrganizerApplicationForm',
    payload: PublishOrganizerApplicationFormCallableRequest(
      organizerId: organizerId,
      formId: draft.importKey,
      expectedRevision: null,
      title: draft.title,
      description: null,
      defaultTargetKind: 'organizer',
      questions: draft.questionJson,
      consentCopy: consentCopy,
      consentVersion: consentVersion,
      retentionCopy: retentionCopy,
    ).toJson(),
    action: 'publish imported organizer application form',
    parse: HostPublishedApplicationForm.fromCallableData,
  );

  Future<HostApplicationImportPreview> previewImport({
    required String organizerId,
    required String formVersionId,
    required HostApplicationImportDraft draft,
  }) => _call(
    name: 'previewOrganizerApplicationImport',
    payload: PreviewOrganizerApplicationImportCallableRequest(
      organizerId: organizerId,
      formVersionId: formVersionId,
      headers: draft.headers,
      mappings: draft.mappingJson,
      rows: draft.rowJson,
    ).toJson(),
    action: 'preview organizer application import',
    parse: HostApplicationImportPreview.fromCallableData,
  );

  Future<HostApplicationImportResult> importApplications({
    required String organizerId,
    required HostPublishedApplicationForm form,
    required HostApplicationImportDraft draft,
  }) => _call(
    name: 'importOrganizerApplications',
    payload: ImportOrganizerApplicationsCallableRequest(
      organizerId: organizerId,
      formId: form.formId,
      formVersionId: form.formVersionId,
      targetKind: 'organizer',
      targetId: null,
      mappingId: null,
      importKey: draft.importKey,
      fileName: draft.fileName,
      format: draft.format,
      headers: draft.headers,
      mappings: draft.mappingJson,
      rows: draft.rowJson,
    ).toJson(),
    action: 'import organizer applications',
    parse: HostApplicationImportResult.fromCallableData,
  );

  Future<HostApplicationPage> listApplications(
    HostApplicationListRequest request, {
    int limit = ReadLimitPolicy.historyPage,
  }) => _call(
    name: 'listOrganizerApplications',
    payload: ListOrganizerApplicationsCallableRequest(
      organizerId: request.organizerId,
      contactId: request.contactId,
      formId: request.formId,
      targetId: request.targetId,
      reviewStatus: request.reviewStatus?.name,
      query: request.query?.trim().isEmpty ?? true
          ? null
          : request.query?.trim(),
      sort: request.sort.wireValue,
      limit: limit,
      cursor: request.cursor,
    ).toJson(),
    action: 'load organizer applications',
    parse: HostApplicationPage.fromCallableData,
  );

  Future<HostApplicationDetail> getApplicationDetail(
    String organizerId,
    String applicationId,
  ) => _call(
    name: 'getOrganizerApplicationDetail',
    payload: GetOrganizerApplicationDetailCallableRequest(
      organizerId: organizerId,
      applicationId: applicationId,
    ).toJson(),
    action: 'load organizer application detail',
    parse: HostApplicationDetail.fromCallableData,
  );

  Future<HostApplicationReviewResult> reviewApplication({
    required String organizerId,
    required String applicationId,
    required int expectedRevision,
    required HostApplicationReviewStatus reviewStatus,
    String? reviewNote,
  }) => _call(
    name: 'reviewOrganizerApplication',
    payload: ReviewOrganizerApplicationCallableRequest(
      organizerId: organizerId,
      applicationId: applicationId,
      expectedRevision: expectedRevision,
      reviewStatus: reviewStatus.name,
      reviewNote: reviewNote?.trim().isEmpty ?? true
          ? null
          : reviewNote?.trim(),
    ).toJson(),
    action: 'review organizer application',
    parse: HostApplicationReviewResult.fromCallableData,
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
  );
}

// keepalive: this stateless repository is shared across Host application routes.
@Riverpod(keepAlive: true)
HostApplicationRepository hostApplicationRepository(Ref ref) =>
    HostApplicationRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<HostApplicationPage> hostApplications(
  Ref ref,
  HostApplicationListRequest request,
) => ref.read(hostApplicationRepositoryProvider).listApplications(request);

@riverpod
Future<HostApplicationDetail> hostApplicationDetail(
  Ref ref,
  String organizerId,
  String applicationId,
) => ref
    .read(hostApplicationRepositoryProvider)
    .getApplicationDetail(organizerId, applicationId);

Map<Object?, Object?> _requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Map<Object?, Object?>> _mapList(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('Invalid $label.');
  return value.map((item) => _requiredMap(item, label)).toList(growable: false);
}

List<String> _stringList(Object? value) {
  if (value is! List<Object?> || value.any((item) => item is! String)) {
    throw const FormatException('Expected a string list.');
  }
  return value.cast<String>();
}

String _requiredString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Response was missing $key.');
}

String? _nullableString(Object? value) {
  if (value == null) return null;
  if (value is String) return value;
  throw const FormatException('Expected a nullable string.');
}

int _requiredInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num && value >= 0) return value.toInt();
  throw FormatException('Response was missing $key.');
}

num? _nullableNumber(Object? value) {
  if (value == null) return null;
  if (value is num) return value;
  throw const FormatException('Expected a nullable number.');
}

bool? _nullableBool(Object? value) {
  if (value == null) return null;
  if (value is bool) return value;
  throw const FormatException('Expected a nullable boolean.');
}

bool _requiredBool(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is bool) return value;
  throw FormatException('Response was missing $key.');
}

DateTime? _dateTimeFromMillis(Object? value) {
  if (value == null) return null;
  if (value is num && value >= 0) {
    return DateTime.fromMillisecondsSinceEpoch(value.toInt());
  }
  throw const FormatException('Expected epoch milliseconds.');
}

DateTime _requiredDateTimeFromMillis(Map<Object?, Object?> map, String key) {
  final value = _dateTimeFromMillis(map[key]);
  if (value != null) return value;
  throw FormatException('Response was missing $key.');
}

T _enumByName<T extends Enum>(List<T> values, String name, String label) {
  for (final value in values) {
    if (value.name == name) return value;
  }
  throw FormatException('Response had invalid $label.');
}
