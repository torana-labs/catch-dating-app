import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

HostFormPaymentRecord _record(
  String id, {
  HostFormPaymentStatus status = HostFormPaymentStatus.checkoutReady,
}) => HostFormPaymentRecord(
  paymentId: id,
  status: status,
  mode: HostFormPaymentMode.test,
  amountPaise: 20000,
  refundedAmountPaise: 0,
  createdAt: DateTime(2026, 9, 23),
  updatedAt: DateTime(2026, 9, 23),
  receipt: 'cfp_$id',
);

class _Repository extends Fake implements HostFormsRepository {
  final calls =
      <
        ({
          String organizerId,
          String formId,
          HostFormPaymentFilter filter,
          String? cursor,
        })
      >[];
  final pending = <Completer<HostFormPaymentPage>>[];
  @override
  Future<HostFormPaymentPage> listPayments({
    required String organizerId,
    required String formId,
    HostFormPaymentFilter filter = HostFormPaymentFilter.all,
    String? cursor,
  }) {
    calls.add((
      organizerId: organizerId,
      formId: formId,
      filter: filter,
      cursor: cursor,
    ));
    final completer = Completer<HostFormPaymentPage>();
    pending.add(completer);
    return completer.future;
  }
}

void main() {
  final provider = hostFormPaymentsControllerProvider(
    'org',
    'form',
    HostFormPaymentFilter.refunds,
  );
  ProviderContainer setup(_Repository repository) {
    final container = ProviderContainer(
      overrides: [hostFormsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    container.listen(provider, (_, _) {});
    return container;
  }

  Future<void> initial(
    ProviderContainer container,
    _Repository repository,
  ) async {
    final future = container.read(provider.future);
    repository.pending.last.complete(
      HostFormPaymentPage(items: [_record('one')], nextCursor: 'page-2'),
    );
    await future;
  }

  test(
    'pagination is scoped, single flight, deduplicated and retryable',
    () async {
      final repository = _Repository();
      final container = setup(repository);
      await initial(container, repository);
      final notifier = container.read(provider.notifier);
      final failed = notifier.loadMore();
      await notifier.loadMore();
      expect(repository.calls.length, 2);
      expect(repository.calls.last, (
        organizerId: 'org',
        formId: 'form',
        filter: HostFormPaymentFilter.refunds,
        cursor: 'page-2',
      ));
      repository.pending.last.completeError(StateError('offline'));
      await failed;
      expect(
        container.read(provider).requireValue.items.single.paymentId,
        'one',
      );
      expect(container.read(provider).requireValue.loadMoreError, isNotNull);
      final retry = notifier.loadMore();
      repository.pending.last.complete(
        HostFormPaymentPage(
          items: [
            _record('one', status: HostFormPaymentStatus.refunded),
            _record('two'),
          ],
          nextCursor: null,
        ),
      );
      await retry;
      final state = container.read(provider).requireValue;
      expect(state.items.map((row) => row.paymentId), ['one', 'two']);
      expect(state.items.first.status, HostFormPaymentStatus.refunded);
      expect(state.loadMoreError, isNull);
      await notifier.loadMore();
      expect(repository.calls.length, 3);
    },
  );

  test('refresh ignores a stale page completion', () async {
    final repository = _Repository();
    final container = setup(repository);
    await initial(container, repository);
    final loading = container.read(provider.notifier).loadMore();
    final stale = repository.pending.last;
    container.invalidate(provider);
    final refreshed = container.read(provider.future);
    repository.pending.last.complete(
      HostFormPaymentPage(items: [_record('fresh')], nextCursor: null),
    );
    await refreshed;
    stale.complete(
      HostFormPaymentPage(items: [_record('stale')], nextCursor: 'wrong'),
    );
    await loading;
    expect(
      container.read(provider).requireValue.items.single.paymentId,
      'fresh',
    );
    expect(container.read(provider).requireValue.nextCursor, isNull);
  });

  test('disposing a filtered query safely ignores its late result', () async {
    final repository = _Repository();
    final container = setup(repository);
    await initial(container, repository);
    final loading = container.read(provider.notifier).loadMore();
    container.invalidate(provider);
    repository.pending.last.completeError(StateError('late failure'));
    await loading;
  });
}
