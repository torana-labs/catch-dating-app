import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:flutter/foundation.dart';

/// Where Responses is: reading the answers, or showing them.
enum HostResponsesStatus { loading, content }

/// The form views at the top of Responses.
enum HostResponsesView { responses, questions, results }

/// The status filters, in board order: All, the review statuses, Offered
/// (a live event offer, not a review status), then Withdrawn.
enum HostResponsesFilter {
  all(null),
  submitted(HostApplicationReviewStatus.submitted),
  inReview(HostApplicationReviewStatus.inReview),
  approved(HostApplicationReviewStatus.approved),
  offered(null),
  waitlisted(HostApplicationReviewStatus.waitlisted),
  declined(HostApplicationReviewStatus.declined),
  withdrawn(HostApplicationReviewStatus.withdrawn);

  const HostResponsesFilter(this.reviewStatus);

  /// The review status this filter lists; null for All and Offered.
  final HostApplicationReviewStatus? reviewStatus;
}

/// Where an opened answer sits in the filtered list it was opened from, so
/// its page can step to the answer before or after it.
@immutable
class HostResponsesQueue {
  const HostResponsesQueue({
    required this.request,
    required this.entryId,
    required this.index,
  });

  /// The list request the answer was opened from.
  final HostFormResponseListRequest request;
  final String entryId;

  /// Where the answer sat when it was opened.
  final int index;

  /// The place of the answer [direction] steps away (-1 before, 1 after).
  /// When the answer has left the list, it steps from where it was.
  int targetIndex(
    List<HostFormInboxEntry> entries,
    int direction, {
    bool hasMore = true,
  }) {
    final current = entries.indexWhere((entry) => entry.entryId == entryId);
    if (current >= 0) return current + direction;
    final target = index + (direction > 0 ? 0 : -1);
    if (direction < 0 && !hasMore && target >= entries.length) {
      return entries.length - 1;
    }
    return target;
  }
}

/// Everything Responses shows, as plain values.
@immutable
class HostResponsesState {
  const HostResponsesState({
    required this.status,
    this.view = HostResponsesView.responses,
    this.forForm = true,
    this.filter,
    this.counts = const <HostResponsesFilter, int>{},
    this.entries = const <HostFormInboxEntry>[],
    this.canLoadMore = false,
    this.loadingMore = false,
    this.loadMoreError,
    this.results = const <HostFormQuestionAggregate>[],
    this.resultsPending = false,
    this.oldestFirst = false,
    this.canFilter = false,
    this.filterCount = 0,
    this.filterSummary,
    this.version,
  });

  final HostResponsesStatus status;
  final HostResponsesView view;

  /// One form's answers; false lists every form's answers, with no form
  /// views.
  final bool forForm;

  /// The status filter; null hides the filter bar.
  final HostResponsesFilter? filter;

  /// How many answers each filter holds; empty until they are counted.
  final Map<HostResponsesFilter, int> counts;

  /// The answers, newest first unless [oldestFirst].
  final List<HostFormInboxEntry> entries;
  final bool canLoadMore;
  final bool loadingMore;
  final Object? loadMoreError;

  /// Per-question results of the published version.
  final List<HostFormQuestionAggregate> results;
  final bool resultsPending;

  final bool oldestFirst;

  /// The form has versions or answer filters to narrow the list by.
  final bool canFilter;

  /// How many version and answer filters narrow the list.
  final int filterCount;

  /// The narrowing filters in one line, as in "Version 2 · Pace: Easy".
  final String? filterSummary;

  /// The published version listed; null lists every version, and the line
  /// is hidden on a form with no published version.
  final HostResponsesVersion? version;

  /// A status, version or answer filter narrows the list.
  bool get filtered =>
      filterCount > 0 || (filter != null && filter != HostResponsesFilter.all);
}

/// Which published versions Responses lists.
@immutable
class HostResponsesVersion {
  const HostResponsesVersion({required this.published, this.selected});

  /// The form's newest published version number.
  final int published;

  /// The version listed; null lists every version.
  final int? selected;
}
