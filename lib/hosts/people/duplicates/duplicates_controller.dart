import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'duplicates_controller.g.dart';

/// The duplicate review pages opened so far for one organizer.
@immutable
class HostDuplicateReview {
  const HostDuplicateReview({
    required this.open,
    required this.marked,
    required this.hasMore,
    this.loadingMore = false,
    this.loadMoreError,
  });

  /// The pairs of the opened pages, split by their review decision.
  factory HostDuplicateReview.fromPages(
    LivePages<HostContactMergeCandidate> pages,
  ) => HostDuplicateReview(
    open: List.unmodifiable(
      pages.items.where(
        (pair) =>
            pair.decisionState != HostContactMergeDecisionState.differentPeople,
      ),
    ),
    marked: List.unmodifiable(
      pages.items.where(
        (pair) =>
            pair.decisionState == HostContactMergeDecisionState.differentPeople,
      ),
    ),
    hasMore: pages.hasMore,
    loadingMore: pages.loadingMore,
    loadMoreError: pages.nextPageError,
  );

  /// Pairs waiting for a decision.
  final List<HostContactMergeCandidate> open;

  /// Pairs a teammate marked as different people.
  final List<HostContactMergeCandidate> marked;

  /// Whether more pairs follow the opened pages.
  final bool hasMore;
  final bool loadingMore;

  /// Why the next page failed; the pairs shown stay.
  final Object? loadMoreError;
}

/// The organizer's duplicate review from `hostContactMergeCandidateViews`,
/// a page at a time, every pair kept live: a merge, a decision or new
/// evidence shows once its trigger rewrites the pair, so commands never
/// refresh it.
@riverpod
class HostDuplicateReviewPages extends _$HostDuplicateReviewPages {
  LivePager<HostContactMergeCandidate>? _pager;

  @override
  Stream<HostDuplicateReview> build(String organizerId) {
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value;
    if (uid == null || uid.isEmpty) {
      _pager = null;
      return Stream.error(
        const SignInRequiredException('read the duplicate review'),
      );
    }
    final pager = ref
        .watch(hostContactsRepositoryProvider)
        .watchMergeCandidates(organizerId, readerUid: uid);
    _pager = pager;
    return pager.pages.map(HostDuplicateReview.fromPages);
  }

  /// Opens the next page, or retries the one that failed; the pairs shown
  /// stay meanwhile.
  void loadMore() => _pager?.loadMore();
}

/// The duplicate review page for one of its two lists.
@riverpod
HostDuplicatesState hostDuplicatesController(
  Ref ref,
  String organizerId,
  HostDuplicatesView view,
) {
  final review = catchAsyncStateFromAsyncValue(
    ref.watch(hostDuplicateReviewPagesProvider(organizerId)),
  );
  final pages = review.value;
  if (pages == null) {
    return review.hasError
        ? HostDuplicatesState(
            status: HostDuplicatesStatus.error,
            view: view,
            error: review.error,
          )
        : HostDuplicatesState.loading(view: view);
  }
  return HostDuplicatesState(
    status: HostDuplicatesStatus.ready,
    view: view,
    pairs: switch (view) {
      HostDuplicatesView.open => pages.open,
      HostDuplicatesView.markedDifferent => pages.marked,
    },
    openCount: pages.open.length,
    markedCount: pages.marked.length,
    atLeast: pages.hasMore,
    canLoadMore: pages.hasMore,
    loadingMore: pages.loadingMore,
    loadMoreError: pages.loadMoreError,
  );
}

/// The People list's Possible duplicates row; null while the review is
/// read or when it cannot be, so the row never stands in for an error.
@riverpod
HostPeopleDuplicateSummary? hostPeopleDuplicateSummary(
  Ref ref,
  String organizerId,
) {
  final pages = catchAsyncStateFromAsyncValue(
    ref.watch(hostDuplicateReviewPagesProvider(organizerId)),
  ).value;
  if (pages == null) return null;
  return HostPeopleDuplicateSummary(
    openCount: pages.open.length,
    markedCount: pages.marked.length,
    atLeast: pages.hasMore,
  );
}

/// Opens the duplicate review again after it failed to load.
void retryHostDuplicates(WidgetRef ref, String organizerId) =>
    ref.invalidate(hostDuplicateReviewPagesProvider(organizerId));

/// The merge commands the People pages run: merge a pair, mark it as
/// different people, show it again, and undo a merge.
@riverpod
HostDuplicateCommands hostDuplicateCommands(Ref ref) =>
    HostDuplicateCommands(ref.watch(hostContactsRepositoryProvider));

class HostDuplicateCommands {
  const HostDuplicateCommands(this._contacts);

  static final mergeMutation = Mutation<HostContactMergeReceipt>();
  static final differentMutation = Mutation<void>();
  static final reopenMutation = Mutation<void>();
  static final undoMutation = Mutation<HostContactMergeReceipt>();

  final HostContactsRepository _contacts;

  /// Merges [pair] into [survivorContactId], fenced by both records'
  /// revisions. The host confirmed the merge, the differences included.
  Future<HostContactMergeReceipt> merge({
    required String organizerId,
    required HostContactMergeCandidate pair,
    required String survivorContactId,
  }) => _contacts.mergeContacts(
    organizerId: organizerId,
    candidate: pair,
    survivorContactId: survivorContactId,
    confirmConflicts: true,
    idempotencyKey: _idempotencyKey('merge', pair.candidateId),
  );

  /// Records that the pair are different people; it leaves the review
  /// until the teammate who marked it shows it again.
  Future<void> markDifferent({
    required String organizerId,
    required HostContactMergeCandidate pair,
  }) => _contacts.reviewMergeCandidate(
    organizerId: organizerId,
    candidate: pair,
    differentPeople: true,
  );

  /// Puts a pair marked different back to review.
  Future<void> reopen({
    required String organizerId,
    required HostContactMergeCandidate pair,
  }) => _contacts.reviewMergeCandidate(
    organizerId: organizerId,
    candidate: pair,
    differentPeople: false,
  );

  /// Reverses one merge: what it moved goes back to the merged record.
  Future<HostContactMergeReceipt> undo({
    required String organizerId,
    required String mergeReceiptId,
  }) => _contacts.unmergeContacts(
    organizerId: organizerId,
    mergeReceiptId: mergeReceiptId,
    idempotencyKey: _idempotencyKey('unmerge', mergeReceiptId),
  );
}

String _idempotencyKey(String operation, String subjectId) =>
    '$operation-$subjectId-${DateTime.now().microsecondsSinceEpoch}';
