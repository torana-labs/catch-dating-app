import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_payment_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_controller.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

String _id(int index) => 'fp_${index.toRadixString(16).padLeft(32, '0')}';

Map<String, Object?> _view(
  int index, {
  String organizerId = 'org',
  String formId = 'form',
  String status = 'refunded',
}) => {
  'organizerId': organizerId,
  'paymentId': _id(index),
  'formId': formId,
  'status': status,
  'createdAtMillis': 100000 - index,
  'version': 1,
  'row': {
    'paymentId': _id(index),
    'status': status,
    'mode': 'test',
    'amountPaise': 20000,
    'currency': 'INR',
    'refundedAmountPaise': status == 'refunded' ? 20000 : 0,
    'createdAtMillis': 100000 - index,
    'updatedAtMillis': 100000 - index,
    'capturedAtMillis': null,
    'submittedAtMillis': null,
    'responseId': null,
    'providerOrderId': 'order_$index',
    'providerPaymentId': null,
    'providerRefundId': null,
    'receipt': 'cfp_$index',
  },
};

void main() {
  final provider = hostFormPaymentsControllerProvider(
    'org',
    'form',
    HostFormPaymentFilter.refunds,
  );

  Future<(ProviderContainer, FakeFirebaseFirestore)> setup() async {
    final db = FakeFirebaseFirestore();
    final views = db.collection('hostFormPaymentViews');
    for (var index = 0; index < 51; index++) {
      await views.doc(_id(index)).set(_view(index));
    }
    await views.doc(_id(60)).set(_view(60, status: 'submitted'));
    await views.doc(_id(61)).set(_view(61, formId: 'other'));
    await views.doc(_id(62)).set(_view(62, organizerId: 'elsewhere'));
    final container = ProviderContainer(
      overrides: [
        hostFormPaymentReadsProvider.overrideWithValue(
          HostFormPaymentReads(
            ScopedReadModelReader(
              db,
              family: hostReadModels,
              actorId: () => 'host',
            ),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    container.listen(provider, (_, _) {});
    return (container, db);
  }

  test('one form and filter read a page at a time, and more opens the next '
      'page', () async {
    final (container, _) = await setup();
    var state = await container.read(provider.future);
    expect(state.items, hasLength(50));
    expect(state.items.first.paymentId, _id(0));
    expect(state.hasMore, isTrue);
    container.read(provider.notifier).loadMore();
    await flushTestEventQueue();
    state = container.read(provider).requireValue;
    expect(state.items, hasLength(51));
    expect(state.items.last.paymentId, _id(50));
    expect(state.hasMore, isFalse);
    expect(state.loadMoreError, isNull);
    // Another status, form or organizer never shows.
    expect(
      state.items.map((item) => item.paymentId),
      isNot(anyOf(contains(_id(60)), contains(_id(61)), contains(_id(62)))),
    );
  });

  test('a refund moves its row at once', () async {
    final (container, db) = await setup();
    await container.read(provider.future);
    await db
        .collection('hostFormPaymentViews')
        .doc(_id(0))
        .set(_view(0, status: 'refundPending'));
    await flushTestEventQueue();
    expect(
      container.read(provider).requireValue.items.first.status,
      HostFormPaymentStatus.refundPending,
    );
    await db
        .collection('hostFormPaymentViews')
        .doc(_id(0))
        .set(_view(0, status: 'failed'));
    await flushTestEventQueue();
    expect(container.read(provider).requireValue.items.first.paymentId, _id(1));
  });
}
