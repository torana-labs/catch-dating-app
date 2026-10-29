import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_detail_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_section_list.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

const _ready = HostFormPaymentConnection(
  connectionId: 'rpc_demo',
  status: HostFormPaymentConnectionStatus.ready,
  mode: HostFormPaymentMode.test,
  accountId: 'acc_rsvp_demo',
  webhookVerified: true,
);

@widgetbook.UseCase(
  name: 'Unconfigured and connected account',
  type: HostFormPaymentSetupSection,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormPaymentSetupPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Form payment setup',
      catalogId: 'host.form_payment_setup',
      children: [
        for (final available in [false, true])
          WidgetbookPageStateCard(
            label: available
                ? 'Ready test account'
                : 'Partner setup unavailable',
            child: WidgetbookContentFrame(
              child: HostFormPaymentSetupSection(
                state: HostFormPaymentSetupState(
                  setup: HostFormPaymentSetup(
                    available: available,
                    connections: available ? [_ready] : [],
                  ),
                ),
                definition: HostFormDefinition.fromMap(const {
                  'identityPolicy': 'phoneVerified',
                }),
                onChanged: (_) {},
                onConnect: () {},
                onRefresh: () {},
                onDisconnect: (_) {},
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Manager connection boundary',
  type: HostFormPaymentSection,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormPaymentSectionPreview(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: [
        hostFormPaymentControllerProvider(
          'org_demo',
        ).overrideWith(_PaymentSetup.new),
      ],
      child: WidgetbookScrollCatalogFrame(
        title: 'Form payment',
        catalogId: 'host.form_payment',
        children: [
          WidgetbookContentFrame(
            child: HostFormPaymentSection(
              organizerId: 'org_demo',
              definition: HostFormDefinition.fromMap(const {
                'identityPolicy': 'phoneVerified',
              }),
              onChanged: (_) {},
            ),
          ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Amount and mandatory refund policy',
  type: HostFormPaymentSheet,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormPaymentSheetPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Form payment fee',
      catalogId: 'host.form_payment_sheet',
      children: [
        Builder(
          builder: (context) => CatchButton(
            label: 'Set a submission fee',
            onPressed: () => showCatchBottomSheet<HostFormPayment>(
              context: context,
              builder: (_) => const HostFormPaymentSheet(
                payment: null,
                connections: [_ready],
              ),
            ),
          ),
        ),
      ],
    );

class _PaymentSetup extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: false, connections: []),
      );
}

@widgetbook.UseCase(
  name: 'Verified fee stages and test money',
  type: HostFormPaymentsSectionList,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormPaymentsPreview(BuildContext context) => WidgetbookFixtureScope(
  overrides: [
    for (final filter in HostFormPaymentFilter.values)
      hostFormPaymentsControllerProvider(
        'org_demo',
        'form_demo',
        filter,
      ).overrideWith(_Payments.new),
  ],
  child: CatchRouteScaffold(
    topBarBuilder: (_, _) => const CatchTopBar.route(title: 'Payments'),
    body: const CatchRouteBody.fullBleed(
      child: CustomScrollView(
        slivers: [
          HostFormPaymentsSectionList(
            organizerId: 'org_demo',
            formId: 'form_demo',
          ),
        ],
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Captured payment awaiting submission',
  type: HostFormPaymentDetailSheet,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormPaymentDetailPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Payment detail',
      catalogId: 'host.form_payment_detail',
      children: [
        Builder(
          builder: (context) => CatchButton(
            label: 'Open payment',
            onPressed: () => showCatchBottomSheet<void>(
              context: context,
              builder: (_) => HostFormPaymentDetailSheet(
                payment: _payment(HostFormPaymentStatus.captured),
                onOpenResponse: null,
              ),
            ),
          ),
        ),
      ],
    );

HostFormPaymentRecord _payment(HostFormPaymentStatus status) =>
    HostFormPaymentRecord(
      paymentId: 'fp_${status.name}',
      status: status,
      mode: HostFormPaymentMode.test,
      amountPaise: 20000,
      refundedAmountPaise: status == HostFormPaymentStatus.refunded ? 20000 : 0,
      createdAt: DateTime(2026, 9, 23, 11),
      updatedAt: DateTime(2026, 9, 23, 11, 5),
      receipt: 'cfp_1234567890abcdef1234567890abcdef',
      providerOrderId: 'order_demo123',
    );

class _Payments extends HostFormPaymentsController {
  @override
  Future<HostFormPaymentsState> build(
    String organizerId,
    String formId,
    HostFormPaymentFilter filter,
  ) async => HostFormPaymentsState(
    items:
        (filter.statuses.isEmpty
                ? HostFormPaymentStatus.values
                : filter.statuses)
            .map(_payment)
            .toList(),
    nextCursor: null,
  );
}
