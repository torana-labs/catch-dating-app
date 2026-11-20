import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:flutter/foundation.dart';

/// Where the forms list is: reading, showing the forms (perhaps none), or
/// unable to read them.
enum HostFormsStatus { loading, content, error }

/// Everything the Forms tab shows, as plain values.
@immutable
class HostFormsState {
  const HostFormsState({
    required this.status,
    this.forms = const <HostFormSummary>[],
    this.newResponseCounts = const <String, int>{},
    this.canLoadMore = false,
    this.loadingMore = false,
    this.loadMoreError,
    this.error,
  });

  const HostFormsState.loading() : this(status: HostFormsStatus.loading);

  final HostFormsStatus status;

  /// The organizer's forms, most recently updated first.
  final List<HostFormSummary> forms;

  /// Answers waiting for a first look, by form id. A form without an entry
  /// has not been counted yet.
  final Map<String, int> newResponseCounts;

  /// Answers waiting across the listed forms, or null until every listed
  /// form has been counted.
  int? get newResponseTotal =>
      forms.every((form) => newResponseCounts.containsKey(form.formId))
      ? forms.fold<int>(
          0,
          (total, form) => total + newResponseCounts[form.formId]!,
        )
      : null;

  /// Listed forms with answers waiting.
  int get formsWithNewResponses =>
      forms.where((form) => (newResponseCounts[form.formId] ?? 0) > 0).length;

  /// Another page of forms exists.
  final bool canLoadMore;
  final bool loadingMore;
  final Object? loadMoreError;
  final Object? error;
}
