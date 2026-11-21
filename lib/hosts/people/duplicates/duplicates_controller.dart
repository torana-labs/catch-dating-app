import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'duplicates_controller.g.dart';

/// The duplicate review pages read so far for one organizer.
@immutable
class HostDuplicateReview {
  const HostDuplicateReview({
    required this.open,
    required this.marked,
    required this.nextCursor,
    required this.truncated,
    this.loadingMore = false,
    this.loadMoreError,
  });

  factory HostDuplicateReview.firstPage(HostContactMergeCandidatePage page) =>
      HostDuplicateReview(
        open: page.candidates,
        marked: page.dismissedCandidates,
        nextCursor: page.nextCursor,
        truncated: page.truncated,
      );

  /// Pairs waiting for a decision.
  final List<HostContactMergeCandidate> open;

  /// Pairs a teammate marked as different people.
  final List<HostContactMergeCandidate> marked;

  /// The review's cursor to the next page; null on the last page.
  final String? nextCursor;
  final bool truncated;
  final bool loadingMore;

  /// Why the next page failed; the pairs shown stay.
  final Object? loadMoreError;
}

/// The organizer's duplicate review, a page at a time. Each command
/// refreshes it with [refreshHostDuplicates]; the people it names update
/// through their own listeners.
@riverpod
class HostDuplicateReviewPages extends _$HostDuplicateReviewPages {
  int _generation = 0;

  @override
  Future<HostDuplicateReview> build(String organizerId) async {
    ++_generation;
    ref.onDispose(() => ++_generation);
    final page = await ref
        .watch(hostContactsRepositoryProvider)
        .listMergeCandidates(organizerId);
    return HostDuplicateReview.firstPage(page);
  }

  /// Reads the next page with the review's cursor, or retries the one that
  /// failed; the pairs shown stay meanwhile.
  Future<void> loadMore() async {
    final generation = _generation;
    final current = catchAsyncStateFromAsyncValue(state).value;
    final cursor = current?.nextCursor;
    if (current == null || cursor == null || current.loadingMore) return;
    state = AsyncData(_copy(current, loadingMore: true));
    try {
      final page = await ref
          .read(hostContactsRepositoryProvider)
          .listMergeCandidates(organizerId, cursor: cursor);
      if (!ref.mounted || generation != _generation) return;
      state = AsyncData(
        HostDuplicateReview(
          open: _byId(current.open, page.candidates),
          marked: _byId(current.marked, page.dismissedCandidates),
          nextCursor: page.nextCursor,
          truncated: current.truncated || page.truncated,
        ),
      );
    } on Object catch (error) {
      if (!ref.mounted || generation != _generation) return;
      state = AsyncData(_copy(current, loadMoreError: error));
    }
  }
}

HostDuplicateReview _copy(
  HostDuplicateReview review, {
  bool loadingMore = false,
  Object? loadMoreError,
}) => HostDuplicateReview(
  open: review.open,
  marked: review.marked,
  nextCursor: review.nextCursor,
  truncated: review.truncated,
  loadingMore: loadingMore,
  loadMoreError: loadMoreError,
);

/// Keeps the first copy of each pair: a pair that moved between pages while
/// the host read them shows once.
List<HostContactMergeCandidate> _byId(
  List<HostContactMergeCandidate> shown,
  List<HostContactMergeCandidate> next,
) => List.unmodifiable(
  {
    for (final pair in [...shown, ...next]) pair.candidateId: pair,
  }.values,
);

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
    atLeast: pages.nextCursor != null,
    truncated: pages.truncated,
    canLoadMore: pages.nextCursor != null,
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
    atLeast: pages.nextCursor != null,
  );
}

/// Reads the duplicate review again: after a failure, and after every merge,
/// undo, different-people or show-again command.
void refreshHostDuplicates(WidgetRef ref, String organizerId) =>
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
