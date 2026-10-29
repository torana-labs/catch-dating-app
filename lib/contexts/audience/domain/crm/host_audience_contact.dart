import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';

enum HostAudienceSourceCoverage { exact, partial, insufficientData }

enum HostAudienceMatchCountCoverage { exact, atLeast }

enum HostAudienceIdentityState { unlinked, verified, ambiguous }

enum HostAudiencePermissionStatus { unknown, optedIn, optedOut }

class HostManualTag {
  const HostManualTag({required this.tagId, required this.label});

  factory HostManualTag.fromMap(Map<Object?, Object?> map) => HostManualTag(
    tagId: crmRequiredString(map, 'tagId'),
    label: crmRequiredString(map, 'label'),
  );

  final String tagId;
  final String label;

  @override
  bool operator ==(Object other) =>
      other is HostManualTag && other.tagId == tagId && other.label == label;

  @override
  int get hashCode => Object.hash(tagId, label);
}

class HostAudienceContact {
  const HostAudienceContact({
    required this.contactId,
    required this.displayName,
    required this.phoneE164,
    required this.email,
    required this.identityState,
    required this.identityConfidence,
    required this.ambiguousCandidateCount,
    required this.attendedEventCount,
    required this.expectedEventCount,
    required this.lastAttendedAt,
    required this.segments,
    this.manualTags = const [],
    required this.whatsappStatus,
    required this.whatsappAdminSuppressed,
    required this.smsStatus,
    required this.sourceCoverage,
    required this.revision,
  });

  factory HostAudienceContact.fromMap(Map<Object?, Object?> map) =>
      HostAudienceContact(
        contactId: crmRequiredString(map, 'contactId'),
        displayName: crmRequiredString(map, 'displayName'),
        phoneE164: crmNullableString(map['phoneE164']),
        email: crmNullableString(map['email']),
        identityState: crmEnumByName(
          HostAudienceIdentityState.values,
          crmRequiredString(map, 'identityState'),
          'identityState',
        ),
        identityConfidence: crmRequiredString(map, 'identityConfidence'),
        ambiguousCandidateCount: crmRequiredInt(map, 'ambiguousCandidateCount'),
        attendedEventCount: crmRequiredInt(map, 'attendedEventCount'),
        expectedEventCount: crmRequiredInt(map, 'expectedEventCount'),
        lastAttendedAt: crmDateTimeFromMillis(map['lastAttendedAtMillis']),
        segments: crmStringList(map['segmentIds'])
            .map(HostAudienceSegment.fromWireValue)
            .whereType<HostAudienceSegment>()
            .toSet(),
        manualTags: crmOptionalMapList(
          map['manualTags'],
          'manual tags',
        ).map(HostManualTag.fromMap).toList(growable: false),
        whatsappStatus: crmEnumByName(
          HostAudiencePermissionStatus.values,
          crmRequiredString(map, 'whatsappStatus'),
          'whatsappStatus',
        ),
        whatsappAdminSuppressed: crmRequiredBool(
          map,
          'whatsappAdminSuppressed',
        ),
        smsStatus: crmEnumByName(
          HostAudiencePermissionStatus.values,
          crmRequiredString(map, 'smsStatus'),
          'smsStatus',
        ),
        sourceCoverage: crmEnumByName(
          HostAudienceSourceCoverage.values,
          crmRequiredString(map, 'sourceCoverage'),
          'sourceCoverage',
        ),
        revision: crmRequiredInt(map, 'revision'),
      );

  final String contactId;
  final String displayName;
  final String? phoneE164;
  final String? email;
  final HostAudienceIdentityState identityState;
  final String identityConfidence;
  final int ambiguousCandidateCount;
  final int attendedEventCount;
  final int expectedEventCount;
  final DateTime? lastAttendedAt;
  final Set<HostAudienceSegment> segments;
  final List<HostManualTag> manualTags;
  final HostAudiencePermissionStatus whatsappStatus;
  final bool whatsappAdminSuppressed;
  final HostAudiencePermissionStatus smsStatus;
  final HostAudienceSourceCoverage sourceCoverage;
  final int revision;
}

class HostCreatedCustomer {
  const HostCreatedCustomer({
    required this.organizerId,
    required this.contactId,
    required this.displayName,
    required this.revision,
  });

  factory HostCreatedCustomer.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'created organizer customer');
    return HostCreatedCustomer(
      organizerId: crmRequiredString(map, 'organizerId'),
      contactId: crmRequiredString(map, 'contactId'),
      displayName: crmRequiredString(map, 'displayName'),
      revision: crmRequiredInt(map, 'revision'),
    );
  }

  final String organizerId;
  final String contactId;
  final String displayName;
  final int revision;
}

class HostAudienceExport {
  const HostAudienceExport({
    required this.fileName,
    required this.csv,
    required this.rowCount,
    required this.truncated,
  });

  factory HostAudienceExport.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer audience export');
    return HostAudienceExport(
      fileName: crmRequiredString(map, 'fileName'),
      csv: crmRequiredString(map, 'csv'),
      rowCount: crmRequiredInt(map, 'rowCount'),
      truncated: crmRequiredBool(map, 'truncated'),
    );
  }

  final String fileName;
  final String csv;
  final int rowCount;
  final bool truncated;
}

class HostAudiencePage {
  const HostAudiencePage({
    required this.organizerId,
    required this.contacts,
    required this.nextCursor,
    required this.matchCount,
    required this.matchCountCoverage,
    this.manualTagVocabulary = const [],
    required this.sourceCoverage,
    required this.projectionVersion,
  });

  factory HostAudiencePage.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer audience response');
    return HostAudiencePage(
      organizerId: crmRequiredString(map, 'organizerId'),
      contacts: crmMapList(
        map['contacts'],
        'contacts',
      ).map(HostAudienceContact.fromMap).toList(growable: false),
      nextCursor: crmNullableString(map['nextCursor']),
      matchCount: crmRequiredInt(map, 'matchCount'),
      matchCountCoverage: crmEnumByName(
        HostAudienceMatchCountCoverage.values,
        crmRequiredString(map, 'matchCountCoverage'),
        'matchCountCoverage',
      ),
      manualTagVocabulary: crmOptionalMapList(
        map['manualTagVocabulary'],
        'manual tag vocabulary',
      ).map(HostManualTag.fromMap).toList(growable: false),
      sourceCoverage: crmEnumByName(
        HostAudienceSourceCoverage.values,
        crmRequiredString(map, 'sourceCoverage'),
        'sourceCoverage',
      ),
      projectionVersion: crmRequiredInt(map, 'projectionVersion'),
    );
  }

  final String organizerId;
  final List<HostAudienceContact> contacts;
  final String? nextCursor;
  final int matchCount;
  final HostAudienceMatchCountCoverage matchCountCoverage;
  final List<HostManualTag> manualTagVocabulary;
  final HostAudienceSourceCoverage sourceCoverage;
  final int projectionVersion;
}
