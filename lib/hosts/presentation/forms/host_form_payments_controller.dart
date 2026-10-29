import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_payments_controller.g.dart';

class HostFormPaymentsState {
  const HostFormPaymentsState({
    required this.items,
    required this.nextCursor,
    this.loadingMore = false,
    this.loadMoreError,
  });
  final List<HostFormPaymentRecord> items;
  final String? nextCursor;
  final bool loadingMore;
  final Object? loadMoreError;
}

@riverpod
class HostFormPaymentsController extends _$HostFormPaymentsController {
  int _generation = 0;

  @override
  Future<HostFormPaymentsState> build(
    String organizerId,
    String formId,
    HostFormPaymentFilter filter,
  ) async {
    _generation++;
    final page = await ref
        .read(hostFormsRepositoryProvider)
        .listPayments(organizerId: organizerId, formId: formId, filter: filter);
    return HostFormPaymentsState(
      items: page.items,
      nextCursor: page.nextCursor,
    );
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || current.loadingMore || current.nextCursor == null) {
      return;
    }
    final generation = _generation;
    state = AsyncData(
      HostFormPaymentsState(
        items: current.items,
        nextCursor: current.nextCursor,
        loadingMore: true,
      ),
    );
    try {
      final page = await ref
          .read(hostFormsRepositoryProvider)
          .listPayments(
            organizerId: organizerId,
            formId: formId,
            filter: filter,
            cursor: current.nextCursor,
          );
      if (!ref.mounted || generation != _generation) return;
      final byId = {
        for (final item in current.items) item.paymentId: item,
        for (final item in page.items) item.paymentId: item,
      };
      state = AsyncData(
        HostFormPaymentsState(
          items: List.unmodifiable(byId.values),
          nextCursor: page.nextCursor,
        ),
      );
    } on Object catch (error) {
      if (!ref.mounted || generation != _generation) return;
      state = AsyncData(
        HostFormPaymentsState(
          items: current.items,
          nextCursor: current.nextCursor,
          loadMoreError: error,
        ),
      );
    }
  }
}
