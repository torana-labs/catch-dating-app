import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_card.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Canonical payout section states',
  type: HostPaymentAccountCard,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostPaymentAccountSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostPaymentAccountCard',
    contractId: 'section.host.clubs_payouts',
    children: const [
      WidgetbookPageStateCard(
        label: 'loading / error / setup / ready / light',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(child: _HostPaymentSectionStates()),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading / error / setup / ready / dark',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            themeMode: ThemeMode.dark,
            child: _HostPaymentSectionStates(),
          ),
        ),
      ),
    ],
  );
}

class _HostPaymentSectionStates extends StatelessWidget {
  const _HostPaymentSectionStates();

  @override
  Widget build(BuildContext context) {
    final organizer = HostOperationsFixtures.primaryOrganizer;
    return SingleChildScrollView(
      padding: CatchInsets.pageBody,
      child: Column(
        children: [
          HostPaymentAccountCard(organizer: organizer, loading: true),
          HostPaymentAccountCard(
            organizer: organizer,
            error: StateError('Widgetbook payout status failed'),
          ),
          HostPaymentAccountCard(organizer: organizer),
          HostPaymentAccountCard(
            organizer: organizer,
            account: HostOperationsFixtures.readyPaymentAccount,
          ),
        ],
      ),
    );
  }
}
