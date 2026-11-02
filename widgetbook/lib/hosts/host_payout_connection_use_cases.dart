import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_organizer_bills_section.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_razorpay_connection_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

const _ready = HostFormPaymentConnection(
  connectionId: 'rpc_demo',
  status: HostFormPaymentConnectionStatus.ready,
  mode: HostFormPaymentMode.live,
  accountId: 'acc_organiser_demo',
  webhookVerified: true,
);

const _needsReconnect = HostFormPaymentConnection(
  connectionId: 'rpc_demo_stale',
  status: HostFormPaymentConnectionStatus.ready,
  mode: HostFormPaymentMode.live,
  accountId: 'acc_organiser_demo',
  webhookVerified: true,
  lastErrorCode: 'refreshRejected',
);

@widgetbook.UseCase(
  name: 'Unavailable, connect, ready and needs reconnect',
  type: HostRazorpayConnectionSection,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostRazorpayConnectionSectionPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Payouts: connect your own Razorpay',
      catalogId: 'host.payout_razorpay_connection',
      children: [
        for (final (label, setup) in const [
          (
            'Partner setup unavailable',
            HostFormPaymentSetup(available: false, connections: []),
          ),
          (
            'Ready to connect',
            HostFormPaymentSetup(available: true, connections: []),
          ),
          (
            'Connected live account',
            HostFormPaymentSetup(available: true, connections: [_ready]),
          ),
          (
            'Needs reconnect',
            HostFormPaymentSetup(
              available: true,
              connections: [_needsReconnect],
            ),
          ),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostRazorpayConnectionSection(
                state: HostFormPaymentSetupState(setup: setup),
                onConnect: () {},
                onReconnect: () {},
                onRefresh: () {},
                onDisconnect: (_) {},
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Organiser connection boundary',
  type: HostRazorpayConnectionCard,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostRazorpayConnectionCardPreview(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: [
        hostFormPaymentControllerProvider(
          'org_demo',
        ).overrideWith(_ConnectedSetup.new),
      ],
      child: const WidgetbookScrollCatalogFrame(
        title: 'Payouts',
        catalogId: 'host.payout_razorpay_connection_card',
        children: [
          WidgetbookContentFrame(
            child: HostRazorpayConnectionCard(organizerId: 'org_demo'),
          ),
        ],
      ),
    );

class _ConnectedSetup extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: true, connections: [_ready]),
      );
}

HostOrganizerBill _previewBill(
  HostOrganizerBillStatus status,
  int month, {
  int totalMinor = 640000,
}) => HostOrganizerBill(
  billId: 'lantern_$month',
  month: DateTime(2026, month),
  status: status,
  paymentCount: 412,
  eventCount: 9,
  grossMinor: 16150000,
  refundedMinor: 150000,
  providerFeeMinor: 377600,
  commissionMinor: totalMinor,
  capMinor: 1000000,
  capped: false,
  trialWaivedMinor: status == HostOrganizerBillStatus.free ? 640000 : 0,
  gstRegistered: false,
  gstMinor: 0,
  totalMinor: totalMinor,
  invoiceNumber: status == HostOrganizerBillStatus.free ? null : '2026-27/031',
  dueAt: status == HostOrganizerBillStatus.free
      ? null
      : DateTime(2026, month + 1, 15),
  paymentUrl: status == HostOrganizerBillStatus.sent
      ? 'https://rzp.io/l/demo'
      : null,
  paidAt: status == HostOrganizerBillStatus.paid
      ? DateTime(2026, month + 1, 12)
      : null,
  paidMinor: status == HostOrganizerBillStatus.paid ? totalMinor : null,
);

@widgetbook.UseCase(
  name: 'Bills, overdue to free, and no bills',
  type: HostOrganizerBillList,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostOrganizerBillListPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Payments: bills from Catch',
      catalogId: 'host.organizer_bills',
      children: [
        WidgetbookPageStateCard(
          label: 'Every state',
          child: WidgetbookContentFrame(
            child: HostOrganizerBillList(
              now: DateTime(2026, 11, 18),
              onOpenBill: (_) {},
              bills: [
                _previewBill(HostOrganizerBillStatus.sent, 10),
                _previewBill(HostOrganizerBillStatus.paid, 9),
                _previewBill(HostOrganizerBillStatus.writtenOff, 8),
                _previewBill(HostOrganizerBillStatus.free, 7, totalMinor: 0),
              ],
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'No bills yet',
          child: WidgetbookContentFrame(
            child: HostOrganizerBillList(
              now: DateTime(2026, 11, 18),
              onOpenBill: (_) {},
              bills: const [],
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Unpaid statement',
  type: HostOrganizerBillSheet,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostOrganizerBillSheetPreview(BuildContext context) =>
    HostOrganizerBillSheet(
      bill: _previewBill(HostOrganizerBillStatus.sent, 10),
    );

@widgetbook.UseCase(
  name: 'Reads the bills of one organizer',
  type: HostOrganizerBillsSection,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostOrganizerBillsSectionPreview(BuildContext context) => ProviderScope(
  overrides: [
    hostOrganizerBillsProvider('lantern').overrideWith(
      (ref) async => [_previewBill(HostOrganizerBillStatus.sent, 10)],
    ),
  ],
  child: const WidgetbookContentFrame(
    child: HostOrganizerBillsSection(organizerId: 'lantern'),
  ),
);
