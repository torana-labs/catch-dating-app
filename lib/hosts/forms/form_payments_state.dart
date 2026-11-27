import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:flutter/foundation.dart';

/// Everything a form's payments page shows, as plain values.
@immutable
class HostFormPaymentsViewState {
  const HostFormPaymentsViewState({
    required this.filter,
    this.items = const <HostFormPaymentRecord>[],
    this.loading = false,
    this.refreshing = false,
    this.hasMore = false,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final HostFormPaymentFilter filter;

  /// The payments in this filter, newest first.
  final List<HostFormPaymentRecord> items;

  /// The first page is still on its way.
  final bool loading;

  /// The list is being read again after Refresh.
  final bool refreshing;

  /// Older payments follow.
  final bool hasMore;
  final bool loadingMore;
  final Object? loadMoreError;
}
