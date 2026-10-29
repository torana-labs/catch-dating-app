import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_send.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';

enum HostCustomerHistoryCoverage { exact, unavailable }

class HostAudienceContactDetail {
  const HostAudienceContactDetail({
    required this.organizerId,
    required this.contactId,
    required this.displayName,
    required this.sourceDisplayName,
    required this.displayNameOverride,
    required this.phoneE164,
    required this.email,
    required this.linkedAccount,
    required this.identityState,
    required this.identityConfidence,
    this.contactDetailsEditable = false,
    required this.ambiguousCandidateCount,
    required this.whatsappAdminSuppressed,
    required this.whatsappPermission,
    required this.origins,
    required this.originsTruncated,
    required this.traits,
    required this.revenue,
    required this.events,
    required this.eventsTruncated,
    this.manualTags = const [],
    this.manualTagVocabulary = const [],
    this.notes = const [],
    this.notesTruncated = false,
    this.notesCoverage = HostCustomerHistoryCoverage.exact,
    this.sends = const [],
    this.sendsTruncated = false,
    this.sendsCoverage = HostCustomerHistoryCoverage.exact,
    this.historyLoaded = true,
    required this.timeline,
    required this.timelineTruncated,
    required this.timelineCoverage,
    this.activeMerges = const [],
    required this.revision,
  });

  factory HostAudienceContactDetail.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'organizer contact detail');
    return HostAudienceContactDetail(
      organizerId: crmRequiredString(map, 'organizerId'),
      contactId: crmRequiredString(map, 'contactId'),
      displayName: crmRequiredString(map, 'displayName'),
      sourceDisplayName: crmRequiredString(map, 'sourceDisplayName'),
      displayNameOverride: crmNullableString(map['displayNameOverride']),
      phoneE164: crmNullableString(map['phoneE164']),
      email: crmNullableString(map['email']),
      linkedAccount: crmRequiredBool(map, 'linkedAccount'),
      identityState: crmEnumByName(
        HostAudienceIdentityState.values,
        crmRequiredString(map, 'identityState'),
        'identityState',
      ),
      identityConfidence: crmRequiredString(map, 'identityConfidence'),
      contactDetailsEditable: map['contactDetailsEditable'] == null
          ? false
          : crmRequiredBool(map, 'contactDetailsEditable'),
      ambiguousCandidateCount: crmStringList(
        map['ambiguousCandidateContactIds'],
      ).length,
      whatsappAdminSuppressed: crmRequiredBool(map, 'whatsappAdminSuppressed'),
      whatsappPermission: HostCustomerWhatsappPermission.fromMap(
        crmRequiredMap(map['whatsappPermission'], 'WhatsApp permission'),
      ),
      origins: crmMapList(
        map['origins'],
        'contact origins',
      ).map(HostCustomerOrigin.fromMap).toList(growable: false),
      originsTruncated: crmRequiredBool(map, 'originsTruncated'),
      traits: HostCustomerTraits.fromMap(
        crmRequiredMap(map['traits'], 'customer traits'),
      ),
      revenue: HostCustomerRevenue.fromMap(
        crmRequiredMap(map['revenue'], 'customer revenue'),
      ),
      events: crmMapList(
        map['events'],
        'contact events',
      ).map(HostAudienceEventFact.fromMap).toList(growable: false),
      eventsTruncated: crmRequiredBool(map, 'eventsTruncated'),
      manualTags: crmOptionalMapList(
        map['manualTags'],
        'manual tags',
      ).map(HostManualTag.fromMap).toList(growable: false),
      manualTagVocabulary: crmOptionalMapList(
        map['manualTagVocabulary'],
        'manual tag vocabulary',
      ).map(HostManualTag.fromMap).toList(growable: false),
      notes: crmOptionalMapList(
        map['notes'],
        'contact notes',
      ).map(HostCustomerNote.fromMap).toList(growable: false),
      notesTruncated: map['notesTruncated'] == null
          ? false
          : crmRequiredBool(map, 'notesTruncated'),
      notesCoverage: map['notesCoverage'] == null
          ? HostCustomerHistoryCoverage.exact
          : crmEnumByName(
              HostCustomerHistoryCoverage.values,
              crmRequiredString(map, 'notesCoverage'),
              'notes coverage',
            ),
      sends: crmOptionalMapList(
        map['sends'],
        'contact sends',
      ).map(HostCustomerSend.fromMap).toList(growable: false),
      sendsTruncated: map['sendsTruncated'] == null
          ? false
          : crmRequiredBool(map, 'sendsTruncated'),
      sendsCoverage: map['sendsCoverage'] == null
          ? HostCustomerHistoryCoverage.exact
          : crmEnumByName(
              HostCustomerHistoryCoverage.values,
              crmRequiredString(map, 'sendsCoverage'),
              'sends coverage',
            ),
      historyLoaded: map['historyLoaded'] == null
          ? true
          : crmRequiredBool(map, 'historyLoaded'),
      timeline: crmMapList(
        map['timeline'],
        'customer timeline',
      ).map(HostCustomerTimelineEntry.fromMap).toList(growable: false),
      timelineTruncated: crmRequiredBool(map, 'timelineTruncated'),
      timelineCoverage: HostCustomerTimelineCoverage.fromMap(
        crmRequiredMap(map['timelineCoverage'], 'customer timeline coverage'),
      ),
      activeMerges: crmOptionalMapList(
        map['activeMerges'],
        'active contact merges',
      ).map(HostActiveContactMerge.fromMap).toList(growable: false),
      revision: crmRequiredInt(map, 'revision'),
    );
  }

  final String organizerId;
  final String contactId;
  final String displayName;
  final String sourceDisplayName;
  final String? displayNameOverride;
  final String? phoneE164;
  final String? email;
  final bool linkedAccount;
  final HostAudienceIdentityState identityState;
  final String identityConfidence;

  bool get isIdentityVerified => identityConfidence == 'verified';
  final bool contactDetailsEditable;
  final int ambiguousCandidateCount;
  final bool whatsappAdminSuppressed;
  final HostCustomerWhatsappPermission whatsappPermission;
  final List<HostCustomerOrigin> origins;
  final bool originsTruncated;
  final HostCustomerTraits traits;
  final HostCustomerRevenue revenue;
  final List<HostAudienceEventFact> events;
  final bool eventsTruncated;
  final List<HostManualTag> manualTags;
  final List<HostManualTag> manualTagVocabulary;
  final List<HostCustomerNote> notes;
  final bool notesTruncated;
  final HostCustomerHistoryCoverage notesCoverage;
  final List<HostCustomerSend> sends;
  final bool sendsTruncated;
  final HostCustomerHistoryCoverage sendsCoverage;
  final bool historyLoaded;
  final List<HostCustomerTimelineEntry> timeline;
  final bool timelineTruncated;
  final HostCustomerTimelineCoverage timelineCoverage;
  final List<HostActiveContactMerge> activeMerges;
  final int revision;
}
