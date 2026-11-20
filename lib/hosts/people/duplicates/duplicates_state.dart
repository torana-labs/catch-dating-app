import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:flutter/foundation.dart';

/// The duplicate review's two lists: pairs waiting for a decision, and
/// pairs a teammate marked as different people.
enum HostDuplicatesView { open, markedDifferent }

/// Where the duplicate review is: still reading, showing pairs, or unable
/// to read them.
enum HostDuplicatesStatus { loading, ready, error }

/// What the People list's Possible duplicates row shows: how many pairs
/// wait for review, and whether any pair is marked different.
@immutable
class HostPeopleDuplicateSummary {
  const HostPeopleDuplicateSummary({
    required this.openCount,
    required this.markedCount,
    required this.atLeast,
  });

  /// Pairs to review on the pages read so far.
  final int openCount;

  /// Pairs marked as different people on the pages read so far.
  final int markedCount;

  /// More pages follow, so [openCount] is a lower bound.
  final bool atLeast;

  /// The row is worth showing: a pair to review or one to show again.
  bool get visible => openCount > 0 || markedCount > 0;
}

/// Everything the duplicate review page shows, as plain values.
@immutable
class HostDuplicatesState {
  const HostDuplicatesState({
    required this.status,
    this.view = HostDuplicatesView.open,
    this.pairs = const <HostContactMergeCandidate>[],
    this.openCount = 0,
    this.markedCount = 0,
    this.atLeast = false,
    this.truncated = false,
    this.canLoadMore = false,
    this.loadingMore = false,
    this.loadMoreError,
    this.error,
  });

  const HostDuplicatesState.loading({
    HostDuplicatesView view = HostDuplicatesView.open,
  }) : this(status: HostDuplicatesStatus.loading, view: view);

  final HostDuplicatesStatus status;
  final HostDuplicatesView view;

  /// The pairs [view] lists, in the review's order.
  final List<HostContactMergeCandidate> pairs;
  final int openCount;
  final int markedCount;

  /// More pages follow, so the counts are lower bounds.
  final bool atLeast;

  /// The review stopped before checking every record.
  final bool truncated;
  final bool canLoadMore;
  final bool loadingMore;

  /// Why the next page failed; Show more retries it.
  final Object? loadMoreError;
  final Object? error;
}

/// A difference the merge asks the host to confirm: both records hold a
/// phone, or an email, and they are not the same.
enum HostMergeConflict { phone, email }

/// The differences between the pair's phones and emails, from what the
/// review returns. The server checks them again when the merge runs.
Set<HostMergeConflict> hostMergeConflicts(HostContactMergeCandidate pair) {
  final [first, second] = pair.contacts;
  return {
    if (first.phoneE164 != null &&
        second.phoneE164 != null &&
        first.phoneE164 != second.phoneE164)
      HostMergeConflict.phone,
    if (first.email != null &&
        second.email != null &&
        first.email!.toLowerCase() != second.email!.toLowerCase())
      HostMergeConflict.email,
  };
}

/// The record a merge keeps unless the host picks the other: the one with a
/// Catch account, else the first the review lists.
String hostDefaultSurvivorId(HostContactMergeCandidate pair) =>
    pair.contacts
        .where((contact) => contact.linkedAccount)
        .firstOrNull
        ?.contactId ??
    pair.contacts.first.contactId;
