import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_payment_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_payments_controller.g.dart';

class HostFormPaymentsState {
  const HostFormPaymentsState({
    required this.items,
    required this.hasMore,
    this.loadingMore = false,
    this.loadMoreError,
  });
  final List<HostFormPaymentRecord> items;

  /// Whether older payments follow; stays true after a failed page so
  /// asking again retries it.
  final bool hasMore;
  final bool loadingMore;
  final Object? loadMoreError;
}

/// One form's fee payments in one filter, a page at a time and live: a
/// checkout that completes, fails or is refunded moves at once.
@riverpod
class HostFormPaymentsController extends _$HostFormPaymentsController {
  late LivePager<HostFormPaymentRecord> _pager;

  @override
  Stream<HostFormPaymentsState> build(
    String organizerId,
    String formId,
    HostFormPaymentFilter filter,
  ) {
    _pager = ref
        .watch(hostFormPaymentReadsProvider)
        .watchPages(organizerId: organizerId, formId: formId, filter: filter);
    return _pager.pages.map(
      (pages) => HostFormPaymentsState(
        items: pages.items,
        hasMore: pages.hasMore,
        loadingMore: pages.loadingMore,
        loadMoreError: pages.nextPageError,
      ),
    );
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}
