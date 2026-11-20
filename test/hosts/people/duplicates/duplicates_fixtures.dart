import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:flutter_test/flutter_test.dart';

/// One side of a fixture pair.
Map<String, Object?> duplicatePersonMap(
  String contactId,
  String name, {
  String? phone,
  String? email,
  bool linkedAccount = false,
  String source = 'hostImport',
  int revision = 1,
}) => {
  'contactId': contactId,
  'displayName': name,
  'phoneE164': phone,
  'email': email,
  'linkedAccount': linkedAccount,
  'primarySource': source,
  'revision': revision,
};

/// A pair as the duplicate review returns it.
Map<String, Object?> duplicatePairMap(
  String candidateId, {
  List<Map<String, Object?>>? contacts,
  List<String> matchKinds = const ['sameVerifiedPhone'],
  int sharedEventCount = 2,
  bool marked = false,
  bool canReopen = true,
}) => {
  'candidateId': candidateId,
  'contacts':
      contacts ??
      [
        duplicatePersonMap(
          'rk',
          'Rhea Kapoor',
          phone: '+919800000001',
          email: 'rhea@example.com',
          linkedAccount: true,
          source: 'catchBooking',
          revision: 3,
        ),
        duplicatePersonMap('rk-import', 'Rhea K', phone: '+919800000001'),
      ],
  'matchKinds': matchKinds,
  'confidence': 'verified',
  'sourceKinds': ['catchBooking', 'hostImport'],
  'sharedEventIds': ['e1', 'e2'],
  'sharedEventCount': sharedEventCount,
  'updatedAtMillis': 1790000000000,
  'decisionState': marked ? 'differentPeople' : 'none',
  'decisionRevision': marked ? 2 : null,
  'canReopen': marked && canReopen,
};

HostContactMergeCandidate duplicatePair(
  String candidateId, {
  List<Map<String, Object?>>? contacts,
  List<String> matchKinds = const ['sameVerifiedPhone'],
  int sharedEventCount = 2,
  bool marked = false,
  bool canReopen = true,
}) => HostContactMergeCandidate.fromMap(
  duplicatePairMap(
    candidateId,
    contacts: contacts,
    matchKinds: matchKinds,
    sharedEventCount: sharedEventCount,
    marked: marked,
    canReopen: canReopen,
  ),
);

/// A review page as listOrganizerContactMergeCandidates returns it.
HostContactMergeCandidatePage duplicatePage({
  List<Map<String, Object?>> open = const [],
  List<Map<String, Object?>> marked = const [],
  String? nextCursor,
  bool truncated = false,
}) => HostContactMergeCandidatePage.fromCallableData({
  'organizerId': 'organizer-1',
  'candidates': open,
  'dismissedCandidates': marked,
  'nextCursor': nextCursor,
  'truncated': truncated,
});

/// A merge receipt as mergeOrganizerContacts returns it.
HostContactMergeReceipt duplicateReceipt(String receiptId) =>
    HostContactMergeReceipt.fromCallableData({
      'receiptId': receiptId,
      'operation': 'merge',
      'survivorContactId': 'rk',
      'sourceContactId': 'rk-import',
      'movedEdgeCount': 2,
      'movedIdentityEvidenceCount': 1,
      'movedClaimCount': 0,
      'movedOriginCount': 1,
      'replayed': false,
    });

/// The duplicate review and the merge commands, recorded.
class FakeDuplicateContacts extends Fake implements HostContactsRepository {
  FakeDuplicateContacts(this.pages);

  /// Pages by cursor; the first page has the null cursor.
  final Map<String?, Object> pages;
  final listCursors = <String?>[];
  final merges = <({String candidateId, String survivor, bool confirm})>[];
  final reviews = <({String candidateId, bool differentPeople})>[];
  final undos = <String>[];

  @override
  Future<HostContactMergeCandidatePage> listMergeCandidates(
    String organizerId, {
    String? cursor,
    int limit = 50,
  }) async {
    listCursors.add(cursor);
    final page = pages[cursor];
    if (page is HostContactMergeCandidatePage) return page;
    throw page ?? StateError('No page for $cursor');
  }

  @override
  Future<HostContactMergeReceipt> mergeContacts({
    required String organizerId,
    required HostContactMergeCandidate candidate,
    required String survivorContactId,
    required bool confirmConflicts,
    required String idempotencyKey,
  }) async {
    merges.add((
      candidateId: candidate.candidateId,
      survivor: survivorContactId,
      confirm: confirmConflicts,
    ));
    return duplicateReceipt('receipt-1');
  }

  @override
  Future<void> reviewMergeCandidate({
    required String organizerId,
    required HostContactMergeCandidate candidate,
    required bool differentPeople,
  }) async {
    reviews.add((
      candidateId: candidate.candidateId,
      differentPeople: differentPeople,
    ));
  }

  @override
  Future<HostContactMergeReceipt> unmergeContacts({
    required String organizerId,
    required String mergeReceiptId,
    required String idempotencyKey,
  }) async {
    undos.add(mergeReceiptId);
    return duplicateReceipt('receipt-undo');
  }
}
