import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:flutter/foundation.dart';

/// Where Responses is: reading the answers, or showing them.
enum HostResponsesStatus { loading, content }

/// The form views at the top of Responses.
enum HostResponsesView { responses, questions, results }

/// The filters an application form offers, in board order: the review
/// statuses, then Offered (a live event offer, not a review status).
enum HostResponsesFilter {
  submitted(HostApplicationReviewStatus.submitted),
  inReview(HostApplicationReviewStatus.inReview),
  approved(HostApplicationReviewStatus.approved),
  offered(null),
  waitlisted(HostApplicationReviewStatus.waitlisted),
  declined(HostApplicationReviewStatus.declined);

  const HostResponsesFilter(this.reviewStatus);

  /// The review status this filter lists; null for Offered.
  final HostApplicationReviewStatus? reviewStatus;
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
  });

  final HostResponsesStatus status;
  final HostResponsesView view;

  /// One form's answers; false lists every form's answers, with no form
  /// views.
  final bool forForm;

  /// The filter; null on a form whose answers are not reviewed.
  final HostResponsesFilter? filter;

  /// How many answers each filter holds; empty until they are counted.
  final Map<HostResponsesFilter, int> counts;

  /// The answers, newest first.
  final List<HostFormInboxEntry> entries;
  final bool canLoadMore;
  final bool loadingMore;
  final Object? loadMoreError;

  /// Per-question results of the published version.
  final List<HostFormQuestionAggregate> results;
  final bool resultsPending;
}
