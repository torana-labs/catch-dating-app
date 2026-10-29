import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:meta/meta.dart';

enum HostFormConsequenceCoverage { exact, identityOnly, unavailable }

@immutable
class HostFormListRequest {
  const HostFormListRequest({
    required this.organizerId,
    this.accountUid,
    this.accountGeneration = 0,
    this.statuses = const {},
    this.purposes = const {},
    this.query,
    this.cursor,
    this.limit = 25,
  });

  final String organizerId;
  // Client-only provider identity. The callable payload never includes these.
  final String? accountUid;
  final int accountGeneration;
  final Set<HostFormLifecycleStatus> statuses;
  final Set<HostFormPurpose> purposes;
  final String? query;
  final String? cursor;
  final int limit;

  HostFormListRequest copyWith({String? cursor}) => HostFormListRequest(
    organizerId: organizerId,
    accountUid: accountUid,
    accountGeneration: accountGeneration,
    statuses: statuses,
    purposes: purposes,
    query: query,
    cursor: cursor,
    limit: limit,
  );

  @override
  bool operator ==(Object other) =>
      other is HostFormListRequest &&
      organizerId == other.organizerId &&
      accountUid == other.accountUid &&
      accountGeneration == other.accountGeneration &&
      formDefinitionSetEquals(statuses, other.statuses) &&
      formDefinitionSetEquals(purposes, other.purposes) &&
      query == other.query &&
      cursor == other.cursor &&
      limit == other.limit;

  @override
  int get hashCode => Object.hash(
    organizerId,
    accountUid,
    accountGeneration,
    Object.hashAllUnordered(statuses),
    Object.hashAllUnordered(purposes),
    query,
    cursor,
    limit,
  );
}

@immutable
class HostFormSummary {
  const HostFormSummary({
    required this.organizerId,
    required this.formId,
    required this.title,
    required this.description,
    required this.purpose,
    required this.status,
    required this.templateId,
    required this.publicFormId,
    required this.defaultTargetKind,
    required this.defaultTargetId,
    required this.activeVersionId,
    required this.draftRevision,
    required this.publishedVersion,
    required this.submittedResponseCount,
    required this.consequences,
    required this.updatedAt,
    required this.publishedAt,
    required this.lastResponseAt,
  });

  factory HostFormSummary.fromMap(Map<Object?, Object?> map) => HostFormSummary(
    organizerId: formDefinitionRequiredString(map, 'organizerId'),
    formId: formDefinitionRequiredString(map, 'formId'),
    title: formDefinitionRequiredString(map, 'title'),
    description: formDefinitionNullableString(map['description']),
    purpose: formDefinitionEnumByName(
      HostFormPurpose.values,
      formDefinitionRequiredString(map, 'purpose'),
      'form purpose',
    ),
    status: formDefinitionEnumByName(
      HostFormLifecycleStatus.values,
      formDefinitionRequiredString(map, 'status'),
      'form lifecycle',
    ),
    templateId: formDefinitionNullableString(map['templateId']),
    publicFormId: formDefinitionRequiredString(map, 'publicFormId'),
    defaultTargetKind: formDefinitionEnumByName(
      HostFormTargetKind.values,
      formDefinitionRequiredString(map, 'defaultTargetKind'),
      'form target kind',
    ),
    defaultTargetId: formDefinitionNullableString(map['defaultTargetId']),
    activeVersionId: formDefinitionNullableString(map['activeVersionId']),
    draftRevision: formDefinitionRequiredInt(map, 'draftRevision'),
    publishedVersion: formDefinitionRequiredInt(map, 'publishedVersion'),
    submittedResponseCount: formDefinitionRequiredInt(
      map,
      'submittedResponseCount',
    ),
    consequences: HostFormConsequences.fromMap(
      formDefinitionRequiredMap(map['consequences'], 'form consequences'),
    ),
    updatedAt: formDefinitionDateTimeFromMillis(map, 'updatedAtMillis'),
    publishedAt: formDefinitionNullableDateTimeFromMillis(
      map['publishedAtMillis'],
    ),
    lastResponseAt: formDefinitionNullableDateTimeFromMillis(
      map['lastResponseAtMillis'],
    ),
  );

  final String organizerId;
  final String formId;
  final String title;
  final String? description;
  final HostFormPurpose purpose;
  final HostFormLifecycleStatus status;
  final String? templateId;
  final String publicFormId;
  final HostFormTargetKind defaultTargetKind;
  final String? defaultTargetId;
  final String? activeVersionId;
  final int draftRevision;
  final int publishedVersion;
  final int submittedResponseCount;
  final HostFormConsequences consequences;
  final DateTime updatedAt;
  final DateTime? publishedAt;
  final DateTime? lastResponseAt;

  bool get canDeleteDraft =>
      status == HostFormLifecycleStatus.draft && publishedVersion == 0;
  bool get canPublish => status != HostFormLifecycleStatus.archived;
  bool get canPause => status == HostFormLifecycleStatus.published;
  bool get canResume => status == HostFormLifecycleStatus.paused;
}

@immutable
class HostFormConsequences {
  const HostFormConsequences({
    required this.coverage,
    required this.identityPolicy,
    required this.enabledAutomationActionKinds,
  });

  const HostFormConsequences.unavailable()
    : coverage = HostFormConsequenceCoverage.unavailable,
      identityPolicy = null,
      enabledAutomationActionKinds = const {};

  factory HostFormConsequences.fromMap(Map<Object?, Object?> map) {
    final rawKinds = map['enabledAutomationActionKinds'];
    if (rawKinds is! List<Object?>) {
      throw const FormatException('Invalid form consequence actions.');
    }
    return HostFormConsequences(
      coverage: formDefinitionEnumByName(
        HostFormConsequenceCoverage.values,
        formDefinitionRequiredString(map, 'coverage'),
        'form consequence coverage',
      ),
      identityPolicy: map['identityPolicy'] == null
          ? null
          : formDefinitionEnumByName(
              HostFormIdentityPolicy.values,
              formDefinitionStringValue(map['identityPolicy']),
              'form consequence identity policy',
            ),
      enabledAutomationActionKinds: Set.unmodifiable(
        rawKinds.map(
          (kind) => formDefinitionEnumByName(
            HostFormAutomationActionKind.values,
            formDefinitionStringValue(kind),
            'form consequence action',
          ),
        ),
      ),
    );
  }

  final HostFormConsequenceCoverage coverage;
  final HostFormIdentityPolicy? identityPolicy;
  final Set<HostFormAutomationActionKind> enabledAutomationActionKinds;

  bool get isExact => coverage == HostFormConsequenceCoverage.exact;
}

@immutable
class HostFormPage {
  const HostFormPage({
    required this.organizerId,
    required this.items,
    required this.nextCursor,
  });

  factory HostFormPage.fromCallableData(Object? data) {
    final map = formDefinitionRequiredMap(data, 'organizer forms');
    return HostFormPage(
      organizerId: formDefinitionRequiredString(map, 'organizerId'),
      items: formDefinitionMapList(
        map['items'],
        'organizer forms',
      ).map(HostFormSummary.fromMap).toList(growable: false),
      nextCursor: formDefinitionNullableString(map['nextCursor']),
    );
  }

  final String organizerId;
  final List<HostFormSummary> items;
  final String? nextCursor;
}
