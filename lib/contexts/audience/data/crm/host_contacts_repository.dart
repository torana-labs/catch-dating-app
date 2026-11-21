import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_roster_insight_reads.dart';
import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_detail_reads.dart';
import 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_summary_reads.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_detail_reads.dart'
    show HostContactNotes, HostContactSummaryRow;
export 'package:catch_dating_app/contexts/audience/data/read_models/host_contact_summary_reads.dart'
    show HostContactDirectory;

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
  const HostContactsRepository(
    this._functions, {
    required this.summaries,
    this.rosterInsights,
    HostContactDetailReads? detail,
  }) : _detailReads = detail;

  /// The directory read model, name searches included. Only queries it
  /// cannot serve (intersecting filter groups) use a callable.
  final HostContactSummaryReads summaries;

  /// One person's page listeners: directory row, detail facts and notes.
  final HostContactDetailReads? _detailReads;

  HostContactDetailReads get _detail {
    final reads = _detailReads;
    if (reads == null) {
      throw StateError('A person needs the contact detail listeners.');
    }
    return reads;
  }

  /// The door's roster label listeners; reads need them.
  final HostRosterInsightReads? rosterInsights;

  final FirebaseFunctions _functions;

  /// The organizer's directory document (everyone's summary and segment
  /// counts) while it is listened to.
  Stream<HostContactDirectory> watchDirectory(String organizerId) =>
      summaries.watchDirectory(organizerId);

  /// The contacts of [query], [pageSize] at a time, every row shown kept
  /// live. Every query the People list makes is one the directory serves.
  LivePager<HostAudienceContact> watchContacts(
    String organizerId, {
    required HostAudienceQuery query,
    int pageSize = ReadLimitPolicy.directoryPage,
  }) => summaries.watchPages(organizerId, query: query, pageSize: pageSize);

  /// The event's roster labels as the server last evaluated them, with the
  /// member label shown, updated while it is listened to.
  Stream<HostEventRosterInsights> watchEventRosterInsights(String eventId) {
    final reads = rosterInsights;
    if (reads == null) {
      throw StateError('Roster labels need the roster insight listeners.');
    }
    return reads.watch(eventId);
  }

  Future<HostAudiencePage> listContacts(
    String organizerId, {
    HostAudienceQuery query = const HostAudienceQuery(),
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    if (HostContactSummaryReads.supports(query)) {
      return summaries.list(organizerId, query: query, limit: limit);
    }
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
    final count = await summaries.count(organizerId, query);
    if (count != null) {
      return (count: count, coverage: HostAudienceMatchCountCoverage.exact);
    }
    final page = await listContacts(organizerId, query: query, limit: 1);
    return (count: page.matchCount, coverage: page.matchCountCoverage);
  }

  /// One person's directory row, while it is listened to.
  Stream<HostContactSummaryRow> watchContactSummary(
    String organizerId,
    String contactId,
  ) => _detail.watchSummary(organizerId, contactId);

  /// Up to [ReadLimitPolicy.multiIdChunk] people's directory rows by id,
  /// while listened to; an id with no row is left out.
  Stream<Map<String, HostContactSummaryRow>> watchContactSummaries(
    String organizerId,
    List<String> contactIds,
  ) => _detail.watchSummaries(organizerId, contactIds);

  /// One person's traits, revenue and newest event rows, while listened to.
  Stream<HostContactDetailFacts> watchContactFacts(
    String organizerId,
    String contactId,
  ) => _detail.watchFacts(organizerId, contactId);

  /// The team's newest note on one person, while it is listened to.
  Stream<HostContactNotes> watchContactNotes(
    String organizerId,
    String contactId,
  ) => _detail.watchNotes(organizerId, contactId);

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

  /// One page of the duplicate review: pairs with the evidence for each,
  /// the pairs marked as different people, and the cursor to the next page.
  /// The server never lists a pair from a name match alone.
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

  /// Merges the pair into [survivorContactId], fenced by both records'
  /// revisions; returns the receipt an undo names.
  Future<HostContactMergeReceipt> mergeContacts({
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
    return callHostCrm(
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
      parse: HostContactMergeReceipt.fromCallableData,
    );
  }

  /// Reverses one merge receipt: the facts it moved go back to the record
  /// they came from.
  Future<HostContactMergeReceipt> unmergeContacts({
    required String organizerId,
    required String mergeReceiptId,
    required String idempotencyKey,
  }) => callHostCrm(
    _functions,
    name: 'unmergeOrganizerContacts',
    payload: UnmergeOrganizerContactsCallableRequest(
      organizerId: organizerId,
      mergeReceiptId: mergeReceiptId,
      idempotencyKey: idempotencyKey,
    ).toJson(),
    action: 'undo organizer contact merge',
    parse: HostContactMergeReceipt.fromCallableData,
  );
}

// keepalive: account-free: Reuse the callable client for the contacts
// subdomain.
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
    rosterInsights: HostRosterInsightReads(
      ref.watch(firebaseFirestoreProvider),
    ),
    detail: HostContactDetailReads(ref.watch(firebaseFirestoreProvider)),
  );
}

/// The organizer's contact directory document, as a listener.
@riverpod
Stream<HostContactDirectory> hostContactDirectory(
  Ref ref,
  String organizerId,
) => ref.watch(hostContactsRepositoryProvider).watchDirectory(organizerId);

/// Everyone's summary, kept current by the directory listener.
@riverpod
Future<HostCrmSummary> hostCrmSummary(Ref ref, String organizerId) async =>
    (await ref.watch(hostContactDirectoryProvider(organizerId).future)).summary;

/// The door's roster label read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// attendee writes the door makes reach it through the server's triggers.
@riverpod
Stream<HostEventRosterInsights> hostEventRosterInsights(
  Ref ref,
  String eventId,
) =>
    ref.watch(hostContactsRepositoryProvider).watchEventRosterInsights(eventId);

@riverpod
Future<HostAudiencePage> hostAudience(
  Ref ref,
  String organizerId,
  HostAudienceQuery query,
) => ref
    .watch(hostContactsRepositoryProvider)
    .listContacts(organizerId, query: query);

/// One person's directory row: name, endpoints, tags and revision. It is a
/// Firestore listener: writes never invalidate it, the server's projector
/// delivers them.
@riverpod
Stream<HostContactSummaryRow> hostContactSummaryRow(
  Ref ref,
  String organizerId,
  String contactId,
) => ref
    .watch(hostContactsRepositoryProvider)
    .watchContactSummary(organizerId, contactId);

/// One person's traits, revenue and newest event rows, as a listener on
/// the contact detail read model.
@riverpod
Stream<HostContactDetailFacts> hostContactDetailFacts(
  Ref ref,
  String organizerId,
  String contactId,
) => ref
    .watch(hostContactsRepositoryProvider)
    .watchContactFacts(organizerId, contactId);

/// The team's newest note on one person, as a listener.
@riverpod
Stream<HostContactNotes> hostContactNotes(
  Ref ref,
  String organizerId,
  String contactId,
) => ref
    .watch(hostContactsRepositoryProvider)
    .watchContactNotes(organizerId, contactId);
