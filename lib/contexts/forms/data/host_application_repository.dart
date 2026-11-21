import 'package:catch_dating_app/contexts/forms/data/host_application_detail_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_community_membership.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
export 'package:catch_dating_app/contexts/forms/domain/host_community_membership.dart';

part 'host_application_repository.g.dart';

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
    this.communityMembership,
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
      communityMembership: HostCommunityMembership.fromNullableMap(
        map['communityMembership'],
      ),
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

  /// The applicant's community membership; null when this application
  /// cannot carry one.
  final HostCommunityMembership? communityMembership;
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

class HostApplicationRepository {
  const HostApplicationRepository(
    this._functions, {
    HostApplicationDetailReads? detail,
  }) : _detailReads = detail;

  final FirebaseFunctions _functions;

  /// The application review listener; reads of one application need it.
  final HostApplicationDetailReads? _detailReads;

  /// One application as its managers review it, kept live by the server's
  /// read model: a review, a withdrawal or a merge reaches it without a
  /// reread.
  Stream<HostApplicationDetail> watchApplicationDetail(
    String organizerId,
    String applicationId,
  ) {
    final reads = _detailReads;
    if (reads == null) {
      throw StateError('An application needs the review listener.');
    }
    return reads
        .watch(organizerId, applicationId)
        .map(HostApplicationDetail.fromCallableData);
  }

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

  /// Grants or revokes the applicant's community membership. A grant cites
  /// this approved application; a revoke cites none.
  Future<HostCommunityMembershipDecision> decideCommunityMembership({
    required String organizerId,
    required HostApplicationDetail application,
    required HostCommunityMembership membership,
    required HostCommunityMembershipAction action,
    required String reason,
    required String requestId,
  }) {
    final grant = action == HostCommunityMembershipAction.grant;
    return _call(
      name: 'decideOrganizerCommunityMembership',
      payload: DecideOrganizerCommunityMembershipCallableRequest(
        organizerId: organizerId,
        uid: membership.uid,
        requestId: requestId,
        action: action.name,
        expectedRevision: membership.revision,
        applicationId: grant ? application.applicationId : null,
        expectedApplicationRevision: grant ? application.revision : null,
        reason: reason.trim(),
      ).toJson(),
      action: 'decide organizer community membership',
      parse: HostCommunityMembershipDecision.fromCallableData,
    );
  }

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

// keepalive: account-free: this stateless repository is shared across Host
// application routes.
@Riverpod(keepAlive: true)
HostApplicationRepository hostApplicationRepository(Ref ref) =>
    HostApplicationRepository(
      ref.watch(firebaseFunctionsProvider),
      detail: HostApplicationDetailReads(ref.watch(firebaseFirestoreProvider)),
    );

@riverpod
/// One application's review, as a Firestore listener on its read model:
/// writes never invalidate it, the server's triggers deliver them.
@riverpod
Stream<HostApplicationDetail> hostApplicationDetail(
  Ref ref,
  String organizerId,
  String applicationId,
) => ref
    .watch(hostApplicationRepositoryProvider)
    .watchApplicationDetail(organizerId, applicationId);

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
