import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_card.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostPaymentAccountSection,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostPaymentAccountSectionCatalogStates(BuildContext context) {
  const focus = 'HostPaymentAccountSection';
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId: 'component.host.club.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostComponentFrame(
          child: HostPaymentAccountSection(
            accounts: const [HostOperationsFixtures.readyPaymentAccount],
            recommendedProvider: HostPaymentProvider.razorpay,
            actionErrorMessage: null,
            onboardingPending: false,
            refreshPending: false,
            onShowPayoutsHandoff: (_, _, _) async {},
            onRefresh: (_) async {},
          ),
        ),
      ),
    ],
  );
}
