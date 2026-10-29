import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';

class HostAudienceReachSummary {
  const HostAudienceReachSummary({
    required this.inCatch,
    required this.automatic,
    required this.byHand,
    required this.unavailable,
  });

  factory HostAudienceReachSummary.fromMap(Map<Object?, Object?> map) =>
      HostAudienceReachSummary(
        inCatch: crmRequiredInt(map, 'inCatch'),
        automatic: crmRequiredInt(map, 'automatic'),
        byHand: crmRequiredInt(map, 'byHand'),
        unavailable: crmRequiredInt(map, 'unavailable'),
      );

  final int inCatch;
  final int automatic;
  final int byHand;
  final int unavailable;

  int get total => inCatch + automatic + byHand + unavailable;
}

class HostSavedAudience {
  const HostSavedAudience({
    required this.organizerId,
    required this.audienceId,
    required this.name,
    required this.status,
    required this.definition,
    required this.definitionHash,
    required this.definitionVersion,
    required this.revision,
    required this.lastPreviewMatchCount,
    this.lastPreviewReachSummary,
    required this.lastPreviewAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory HostSavedAudience.fromMap(Map<Object?, Object?> map) {
    if (crmRequiredString(map, 'scope') != 'organizerCrm') {
      throw const FormatException('Saved audience had an event-scoped owner.');
    }
    return HostSavedAudience(
      organizerId: crmRequiredString(map, 'organizerId'),
      audienceId: crmRequiredString(map, 'audienceId'),
      name: crmRequiredString(map, 'name'),
      status: crmRequiredString(map, 'status'),
      definition: HostSavedAudienceDefinition.fromMap(
        crmRequiredMap(map['definition'], 'saved audience definition'),
      ),
      definitionHash: crmRequiredString(map, 'definitionHash'),
      definitionVersion: crmRequiredInt(map, 'definitionVersion'),
      revision: crmRequiredInt(map, 'revision'),
      lastPreviewMatchCount: map['lastPreviewMatchCount'] == null
          ? null
          : crmRequiredInt(map, 'lastPreviewMatchCount'),
      lastPreviewReachSummary: map['lastPreviewReachSummary'] == null
          ? null
          : HostAudienceReachSummary.fromMap(
              crmRequiredMap(
                map['lastPreviewReachSummary'],
                'saved audience reach summary',
              ),
            ),
      lastPreviewAt: crmDateTimeFromMillis(map['lastPreviewAtMillis']),
      createdAt: crmRequiredDateTimeFromMillis(map, 'createdAtMillis'),
      updatedAt: crmRequiredDateTimeFromMillis(map, 'updatedAtMillis'),
    );
  }

  final String organizerId;
  final String audienceId;
  final String name;
  final String status;
  final HostSavedAudienceDefinition definition;
  final String definitionHash;
  final int definitionVersion;
  final int revision;
  final int? lastPreviewMatchCount;
  final HostAudienceReachSummary? lastPreviewReachSummary;
  final DateTime? lastPreviewAt;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class HostSavedAudiencePage {
  const HostSavedAudiencePage({
    required this.audiences,
    required this.nextCursor,
  });

  factory HostSavedAudiencePage.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'saved audience page');
    return HostSavedAudiencePage(
      audiences: crmMapList(
        map['audiences'],
        'saved audiences',
      ).map(HostSavedAudience.fromMap).toList(growable: false),
      nextCursor: crmNullableString(map['nextCursor']),
    );
  }

  final List<HostSavedAudience> audiences;
  final String? nextCursor;
}

class HostSavedAudiencePreviewContact {
  const HostSavedAudiencePreviewContact({
    required this.contactId,
    required this.displayName,
  });

  factory HostSavedAudiencePreviewContact.fromMap(Map<Object?, Object?> map) =>
      HostSavedAudiencePreviewContact(
        contactId: crmRequiredString(map, 'contactId'),
        displayName: crmRequiredString(map, 'displayName'),
      );

  final String contactId;
  final String displayName;
}

class HostSavedAudiencePreview {
  const HostSavedAudiencePreview({
    required this.audience,
    this.nextCursor,
    required this.matchCount,
    required this.reachSummary,
    required this.sample,
    required this.evaluatedAt,
  });

  factory HostSavedAudiencePreview.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'saved audience preview');
    if (crmRequiredString(map, 'coverage') != 'exact') {
      throw const FormatException('Saved audience preview was not exact.');
    }
    return HostSavedAudiencePreview(
      nextCursor: crmNullableString(map['nextCursor']),
      audience: HostSavedAudience.fromMap(
        crmRequiredMap(map['audience'], 'saved audience'),
      ),
      matchCount: crmRequiredInt(map, 'matchCount'),
      reachSummary: HostAudienceReachSummary.fromMap(
        crmRequiredMap(map['reachSummary'], 'saved audience reach summary'),
      ),
      sample: crmMapList(
        map['sample'],
        'saved audience sample',
      ).map(HostSavedAudiencePreviewContact.fromMap).toList(growable: false),
      evaluatedAt: crmRequiredDateTimeFromMillis(map, 'evaluatedAtMillis'),
    );
  }

  final HostSavedAudience audience;
  final String? nextCursor;
  final int matchCount;
  final HostAudienceReachSummary reachSummary;
  final List<HostSavedAudiencePreviewContact> sample;
  final DateTime evaluatedAt;
}

enum HostSavedAudienceMembershipMode { rules, selectedPeople }

class HostStaticAudienceMember {
  const HostStaticAudienceMember({
    required this.selectedContactId,
    required this.contactId,
    required this.displayName,
    required this.available,
  });
  factory HostStaticAudienceMember.fromMap(Map<Object?, Object?> map) =>
      HostStaticAudienceMember(
        selectedContactId: crmRequiredString(map, 'selectedContactId'),
        contactId: crmNullableString(map['contactId']),
        displayName: crmNullableString(map['displayName']),
        available: crmRequiredBool(map, 'available'),
      );
  final String selectedContactId;
  final String? contactId;
  final String? displayName;
  final bool available;
}
