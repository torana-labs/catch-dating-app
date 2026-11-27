import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_payment_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/forms/form_payment_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_body.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_state.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'operations/preview.dart';

const _path = '[P1 product surfaces]/Host operations/Forms';

final _payments = [
  for (final status in [
    HostFormPaymentStatus.submitted,
    HostFormPaymentStatus.captured,
    HostFormPaymentStatus.refunded,
  ])
    HostFormPaymentRecord(
      paymentId: 'preview-${status.name}',
      status: status,
      mode: HostFormPaymentMode.live,
      amountPaise: 49900,
      refundedAmountPaise: status == HostFormPaymentStatus.refunded ? 49900 : 0,
      createdAt: DateTime(2026, 11, 20, 9, 30),
      updatedAt: DateTime(2026, 11, 20, 9, 31),
      receipt: 'cfp_preview_receipt',
      providerOrderId: 'order_preview',
      responseId: status == HostFormPaymentStatus.submitted
          ? 'preview-response'
          : null,
    ),
];

class _PreviewReads implements HostFormPaymentReads {
  @override
  LivePager<HostFormPaymentRecord> watchPages({
    required String organizerId,
    required String formId,
    HostFormPaymentFilter filter = HostFormPaymentFilter.all,
    int pageSize = 50,
  }) => _PreviewPager();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PreviewPager implements LivePager<HostFormPaymentRecord> {
  @override
  Stream<LivePages<HostFormPaymentRecord>> get pages =>
      Stream.value(LivePages(items: _payments, hasMore: false));

  @override
  void loadMore() {}
}

@widgetbook.UseCase(name: 'Payments', type: HostFormPaymentsScreen, path: _path)
Widget hostFormPaymentsScreenPreview(BuildContext context) => ProviderScope(
  overrides: [hostFormPaymentReadsProvider.overrideWithValue(_PreviewReads())],
  child: const WidgetbookHostDeviceFrame(
    child: HostFormPaymentsScreen(
      organizerId: 'preview-organizer',
      formId: 'preview-form',
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Payments list',
  type: HostFormPaymentsBody,
  path: _path,
)
Widget hostFormPaymentsBodyPreview(BuildContext context) =>
    WidgetbookHostDeviceFrame(
      child: CatchRoot(
        child: CatchScreen(
          body: HostFormPaymentsBody(
            state: HostFormPaymentsViewState(
              filter: HostFormPaymentFilter.all,
              items: _payments,
            ),
            onFilter: (_) {},
            onRefresh: () {},
            onOpen: (_) {},
            onLoadMore: () {},
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Payment details',
  type: HostFormPaymentSheet,
  path: _path,
)
Widget hostFormPaymentSheetPreview(BuildContext context) =>
    WidgetbookHostDeviceFrame(
      child: CatchRoot(
        child: CatchScreen(
          body: CatchPageBody.screen(
            child: HostFormPaymentSheet(
              payment: _payments.first,
              onOpenResponse: () {},
              onCopy: (_) {},
            ),
          ),
        ),
      ),
    );
