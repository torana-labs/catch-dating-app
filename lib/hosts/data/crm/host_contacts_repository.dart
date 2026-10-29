import 'package:catch_dating_app/auth/data/authenticated_session.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/hosts/data/read_models/host_contact_summary_reads.dart';
import 'package:catch_dating_app/hosts/data/read_models/host_summary_reader.dart';
import 'package:catch_dating_app/hosts/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_event_roster_insights.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_contacts_repository.g.dart';

// firestore-index: hostContactSummaries (organizerId:ASCENDING, lastSeenAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, row.segmentIds:CONTAINS, lastSeenAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, manualTagIds:CONTAINS, lastSeenAtMillis:DESCENDING, __name__:DESCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, row.attendedEventCount:DESCENDING, __name__:DESCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, row.segmentIds:CONTAINS, row.attendedEventCount:DESCENDING, __name__:DESCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, manualTagIds:CONTAINS, row.attendedEventCount:DESCENDING, __name__:DESCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, searchName:ASCENDING, __name__:ASCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, row.segmentIds:CONTAINS, searchName:ASCENDING, __name__:ASCENDING)
// firestore-index: hostContactSummaries (organizerId:ASCENDING, manualTagIds:CONTAINS, searchName:ASCENDING, __name__:ASCENDING)
class HostContactsRepository {
  const HostContactsRepository(this._functions, {this.summaries});

  final HostContactSummaryReads? summaries;

  final FirebaseFunctions _functions;

  Future<HostCrmSummary> getSummary(String organizerId) async {
    final summary = await summaries?.summary(organizerId);
    if (summary != null) return summary;
    return callHostCrm(
      _functions,
      name: 'getOrganizerCrmSummary',
      payload: GetOrganizerCrmSummaryCallableRequest(
        organizerId: organizerId,
      ).toJson(),
      action: 'load organizer CRM summary',
      parse: HostCrmSummary.fromCallableData,
    );
  }

  Future<HostEventRosterInsights> getEventRosterInsights(String eventId) =>
      callHostCrm(
        _functions,
        name: 'getEventRosterInsights',
        payload: GetEventRosterInsightsCallableRequest(
          eventId: eventId,
          includeHostMembership: true,
        ).toJson(),
        action: 'load event roster customer labels',
        parse: HostEventRosterInsights.fromCallableData,
      );

  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    final page = await summaries?.list(organizerId, query: query, limit: limit);
    if (page != null) return page;
    return callHostCrm(
      _functions,
      name: 'listOrganizerContacts',
      payload: ListOrganizerContactsCallableRequest(
        organizerId: organizerId,
        limit: limit,
        cursor: query.cursor,
        query: query.search?.trim().isEmpty ?? true
            ? null
            : query.search?.trim(),
        // The callable's canonical default is lastSeen. Omitting it keeps the
        // default directory compatible during a rolling client/server rollout.
        sort: query.sort == HostAudienceSort.lastSeen
            ? null
            : query.sort.wireValue,
        segmentIds: query.segments.isEmpty
            ? null
            : (query.segments.map((s) => s.wireValue).toList()..sort()),
        manualTagIds: query.manualTagIds.isEmpty
            ? null
            : (query.manualTagIds.toList()..sort()),
        segmentId: query.segment?.wireValue,
        manualTagId: query.manualTagId,
      ).toJson(),
      action: 'load organizer audience',
      parse: HostAudiencePage.fromCallableData,
    );
  }

  Future<({int count, HostAudienceMatchCountCoverage coverage})> countContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
  }) async {
    final count = await summaries?.count(organizerId, query);
    if (count != null) {
      return (count: count, coverage: HostAudienceMatchCountCoverage.exact);
    }
    final page = await listContacts(organizerId, query: query, limit: 1);
    return (count: page.matchCount, coverage: page.matchCountCoverage);
  }

  Future<HostAudienceContactDetail> getContactDetail(
    String organizerId,
    String contactId,
  ) => callHostCrm(
    _functions,
    name: 'getOrganizerContactDetail',
    payload: GetOrganizerContactDetailCallableRequest(
      organizerId: organizerId,
      contactId: contactId,
    ).toJson(),
    action: 'load organizer contact detail',
    parse: HostAudienceContactDetail.fromCallableData,
  );

  Future<HostAudienceContactDetail> getContactOverview(
    String organizerId,
    String contactId,
  ) => withBackendErrorContext(
    () async {
      try {
        final result = await _functions
            .httpsCallable('getOrganizerContactDetail')
            .call<Object?>(
              GetOrganizerContactDetailCallableRequest(
                organizerId: organizerId,
                contactId: contactId,
                includeHistory: false,
              ).toJson(),
            );
        return HostAudienceContactDetail.fromCallableData(result.data);
      } on FirebaseFunctionsException catch (error) {
        // A rolling deployment may still serve the previous request schema.
        // Only its exact unknown-property diagnostic authorizes a full read.
        if (error.code != 'invalid-argument' ||
            error.message !=
                'includeHistory: must NOT have additional properties') {
          rethrow;
        }
        return getContactDetail(organizerId, contactId);
      }
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load organizer contact overview',
      resource: 'getOrganizerContactDetail',
    ),
  );

  Future<HostCreatedCustomer> createContact({
    required String organizerId,
    required String displayName,
    String? phoneE164,
    String? email,
    String? initialNote,
  }) => callHostCrm(
    _functions,
    name: 'createOrganizerContact',
    payload: CreateOrganizerContactCallableRequest(
      organizerId: organizerId,
      displayName: displayName,
      phoneE164: phoneE164,
      email: email,
      initialNote: initialNote,
    ).toJson(),
    action: 'create organizer customer',
    parse: HostCreatedCustomer.fromCallableData,
  );

  Future<String> startContactConversation({
    required String organizerId,
    required String contactId,
  }) => callHostCrm(
    _functions,
    name: 'startOrganizerContactConversation',
    payload: StartOrganizerContactConversationCallableRequest(
      organizerId: organizerId,
      contactId: contactId,
    ).toJson(),
    action: 'start organizer customer conversation',
    parse: (data) => crmRequiredString(
      crmRequiredMap(data, 'customer conversation'),
      'matchId',
    ),
  );

  Future<void> mutateContact({
    required String organizerId,
    required String contactId,
    required int expectedRevision,
    String? displayNameOverride,
    bool clearDisplayNameOverride = false,
    String? phoneE164,
    bool updatePhoneE164 = false,
    String? email,
    bool updateEmail = false,
    bool? whatsappAdminSuppressed,
    bool? hidden,
    List<String>? manualTags,
  }) => callHostCrm<Object?>(
    _functions,
    name: 'mutateOrganizerContact',
    payload: {
      'organizerId': organizerId,
      'contactId': contactId,
      'expectedRevision': expectedRevision,
      if (displayNameOverride != null || clearDisplayNameOverride)
        'displayNameOverride': displayNameOverride,
      if (updatePhoneE164) 'phoneE164': phoneE164,
      if (updateEmail) 'email': email,
      'whatsappAdminSuppressed': ?whatsappAdminSuppressed,
      'hidden': ?hidden,
      'manualTags': ?manualTags,
    },
    action: 'update organizer contact controls',
    parse: (value) => value,
  );

  Future<HostCustomerNote> createContactNote({
    required String organizerId,
    required String contactId,
    required String body,
  }) => callHostCrm(
    _functions,
    name: 'createOrganizerContactNote',
    payload: CreateOrganizerContactNoteCallableRequest(
      organizerId: organizerId,
      contactId: contactId,
      body: body,
    ).toJson(),
    action: 'add organizer contact note',
    parse: HostCustomerNote.fromCallableData,
  );

  Future<HostCustomerNote> mutateContactNote({
    required String organizerId,
    required String contactId,
    required String noteId,
    required int expectedRevision,
    required String body,
  }) => callHostCrm(
    _functions,
    name: 'mutateOrganizerContactNote',
    payload: MutateOrganizerContactNoteCallableRequest(
      organizerId: organizerId,
      contactId: contactId,
      noteId: noteId,
      expectedRevision: expectedRevision,
      body: body,
    ).toJson(),
    action: 'edit organizer contact note',
    parse: HostCustomerNote.fromCallableData,
  );

  Future<HostCustomerOutreach> recordContactOutreach({
    required String organizerId,
    required String contactId,
    required HostCustomerOutreachChannel channel,
    required HostCustomerOutreachOutcome outcome,
    String? note,
    DateTime? occurredAt,
  }) => callHostCrm(
    _functions,
    name: 'recordOrganizerContactOutreach',
    payload: RecordOrganizerContactOutreachCallableRequest(
      organizerId: organizerId,
      contactId: contactId,
      channel: channel.wireValue,
      outcome: outcome.wireValue,
      note: note,
      occurredAtMillis: occurredAt?.millisecondsSinceEpoch,
    ).toJson(),
    action: 'record organizer contact outreach',
    parse: HostCustomerOutreach.fromCallableData,
  );

  Future<HostAudienceExport> exportContacts(
    String organizerId, {
    HostAudienceSegment? segment,
    HostAudienceQuery query = const HostAudienceQuery(),
  }) => callHostCrm(
    _functions,
    name: 'exportOrganizerContacts',
    payload: ExportOrganizerContactsCallableRequest(
      organizerId: organizerId,
      segmentId: (segment ?? query.segment)?.wireValue,
      query: query.search,
      manualTagId: query.manualTagId,
      segmentIds: query.segments.isEmpty
          ? null
          : (query.segments.map((s) => s.wireValue).toList()..sort()),
      manualTagIds: query.manualTagIds.isEmpty
          ? null
          : (query.manualTagIds.toList()..sort()),
    ).toJson(),
    action: 'export organizer audience',
    parse: HostAudienceExport.fromCallableData,
  );

  Future<HostContactMergeCandidatePage> listMergeCandidates(
    String organizerId, {
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
  }) => callHostCrm(
    _functions,
    name: 'listOrganizerContactMergeCandidates',
    payload: ListOrganizerContactMergeCandidatesCallableRequest(
      organizerId: organizerId,
      limit: limit > 50 ? 50 : limit,
      cursor: cursor,
    ).toJson(),
    action: 'load organizer contact merge candidates',
    parse: HostContactMergeCandidatePage.fromCallableData,
  );

  Future<void> reviewMergeCandidate({
    required String organizerId,
    required HostContactMergeCandidate candidate,
    required bool differentPeople,
  }) => callHostCrm<Object?>(
    _functions,
    name: 'reviewOrganizerContactMergeCandidate',
    payload: ReviewOrganizerContactMergeCandidateCallableRequest(
      organizerId: organizerId,
      candidateId: candidate.candidateId,
      contactIds: candidate.contacts
          .map((contact) => contact.contactId)
          .toList(),
      decision: differentPeople ? 'differentPeople' : 'reopen',
      expectedRevision: candidate.decisionRevision,
    ).toJson(),
    action: 'review organizer contact merge candidate',
    parse: (value) => value,
  );

  Future<void> mergeContacts({
    required String organizerId,
    required HostContactMergeCandidate candidate,
    required String survivorContactId,
    required bool confirmConflicts,
    required String idempotencyKey,
  }) {
    final survivor = candidate.contacts.singleWhere(
      (contact) => contact.contactId == survivorContactId,
    );
    final source = candidate.contacts.singleWhere(
      (contact) => contact.contactId != survivorContactId,
    );
    return callHostCrm<Object?>(
      _functions,
      name: 'mergeOrganizerContacts',
      payload: MergeOrganizerContactsCallableRequest(
        organizerId: organizerId,
        survivorContactId: survivor.contactId,
        sourceContactId: source.contactId,
        survivorRevision: survivor.revision,
        sourceRevision: source.revision,
        confirmConflicts: confirmConflicts,
        idempotencyKey: idempotencyKey,
      ).toJson(),
      action: 'merge organizer contacts',
      parse: (value) => value,
    );
  }

  Future<void> unmergeContacts({
    required String organizerId,
    required String mergeReceiptId,
    required String idempotencyKey,
  }) => callHostCrm<Object?>(
    _functions,
    name: 'unmergeOrganizerContacts',
    payload: UnmergeOrganizerContactsCallableRequest(
      organizerId: organizerId,
      mergeReceiptId: mergeReceiptId,
      idempotencyKey: idempotencyKey,
    ).toJson(),
    action: 'undo organizer contact merge',
    parse: (value) => value,
  );
}

// keepalive: Reuse the callable client for the contacts subdomain.
@Riverpod(keepAlive: true)
HostContactsRepository hostContactsRepository(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostContactsRepository(
    ref.watch(firebaseFunctionsProvider),
    summaries: HostContactSummaryReads(
      HostSummaryReader(
        ref.watch(firebaseFirestoreProvider),
        actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
      ),
    ),
  );
}

@riverpod
Future<HostCrmSummary> hostCrmSummary(Ref ref, String organizerId) =>
    ref.watch(hostContactsRepositoryProvider).getSummary(organizerId);

@riverpod
Future<HostEventRosterInsights> hostEventRosterInsights(
  Ref ref,
  String eventId,
) => ref.watch(hostContactsRepositoryProvider).getEventRosterInsights(eventId);

@riverpod
Future<HostAudiencePage> hostAudience(
  Ref ref,
  String organizerId,
  HostAudienceQuery query,
) => ref
    .watch(hostContactsRepositoryProvider)
    .listContacts(organizerId, query: query);

@riverpod
Future<HostAudienceContactDetail> hostAudienceContactDetail(
  Ref ref,
  String organizerId,
  String contactId,
) => ref
    .watch(hostContactsRepositoryProvider)
    .getContactOverview(organizerId, contactId);

@riverpod
Future<HostAudienceContactDetail> hostAudienceContactHistory(
  Ref ref,
  String organizerId,
  String contactId,
) => ref
    .watch(hostContactsRepositoryProvider)
    .getContactDetail(organizerId, contactId);
