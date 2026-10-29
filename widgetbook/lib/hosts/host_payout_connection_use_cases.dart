import 'package:catch_dating_app/hosts/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_razorpay_connection_section.dart';
import 'package:flutter/material.dart';
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

@widgetbook.UseCase(
  name: 'Unavailable, connect and ready',
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
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostRazorpayConnectionSection(
                state: HostFormPaymentSetupState(setup: setup),
                onConnect: () {},
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
