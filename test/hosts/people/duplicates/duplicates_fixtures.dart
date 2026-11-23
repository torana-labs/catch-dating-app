import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_platform/firebase/live_pages.dart';
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

/// A pair as the duplicate review delivers it.
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
  FakeDuplicateContacts(this.pages, {this.firstError});

  /// The pairs each page adds, in order; an [Object] that is not a list is
  /// the error that page fails with.
  final List<Object> pages;

  /// The error the review fails with before any page opens.
  final Object? firstError;

  /// The reader each pager was opened for, and how many pages it opened.
  final readers = <String>[];
  int opened = 0;
  final merges = <({String candidateId, String survivor, bool confirm})>[];
  final reviews = <({String candidateId, bool differentPeople})>[];
  final undos = <String>[];

  @override
  LivePager<HostContactMergeCandidate> watchMergeCandidates(
    String organizerId, {
    required String readerUid,
    int pageSize = 50,
  }) {
    readers.add(readerUid);
    return _FakePager(this);
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

class _FakePager implements LivePager<HostContactMergeCandidate> {
  _FakePager(this._contacts);

  final FakeDuplicateContacts _contacts;
  final _controller = StreamController<LivePages<HostContactMergeCandidate>>();
  final _items = <String, HostContactMergeCandidate>{};
  int _next = 0;

  @override
  Stream<LivePages<HostContactMergeCandidate>> get pages {
    final error = _contacts.firstError;
    if (error != null) {
      _controller.addError(error);
    } else {
      _open();
    }
    return _controller.stream;
  }

  @override
  void loadMore() => _open();

  void _open() {
    if (_next >= _contacts.pages.length) return;
    final page = _contacts.pages[_next];
    _contacts.opened += 1;
    if (page is! List<Map<String, Object?>>) {
      _controller.add(
        LivePages(
          items: List.unmodifiable(_items.values),
          hasMore: true,
          nextPageError: page,
        ),
      );
      return;
    }
    _next += 1;
    for (final map in page) {
      final pair = HostContactMergeCandidate.fromMap(map);
      _items.putIfAbsent(pair.candidateId, () => pair);
    }
    _controller.add(
      LivePages(
        items: List.unmodifiable(_items.values),
        hasMore: _next < _contacts.pages.length,
      ),
    );
  }
}
