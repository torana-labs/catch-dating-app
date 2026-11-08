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
    this.canLoadMore = false,
    this.loadingMore = false,
    this.loadMoreError,
    this.error,
  });

  const HostFormsState.loading() : this(status: HostFormsStatus.loading);

  final HostFormsStatus status;

  /// The organizer's forms, most recently updated first.
  final List<HostFormSummary> forms;

  /// Another page of forms exists.
  final bool canLoadMore;
  final bool loadingMore;
  final Object? loadMoreError;
  final Object? error;
}
