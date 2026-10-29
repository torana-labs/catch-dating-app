import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('campaign bridge fails closed while customer history is incomplete', () {
    expect(
      hostCampaignBridgeBlocker(
        hasPersistableAudience: true,
        messagingSetup: null,
        audienceCoverageComplete: false,
      ),
      HostCampaignBlockers.audienceCoveragePartial,
    );
  });

  testWidgets('filter summary enables the exact-count campaign bridge', (
    tester,
  ) async {
    var messagesStarted = 0;

    await tester.pumpWidget(
      _app(
        HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.atRisk,
          count: 12,
          countCoverage: HostCustomerMatchCountCoverage.exact,
          campaignBlocker: null,
          onMessage: () => messagesStarted += 1,
          onReviewSenderSetup: null,
        ),
      ),
    );

    await tester.tap(find.text('Message these 12 people'));

    expect(messagesStarted, 1);
  });

  testWidgets('filter summary qualifies counts and explains a blocked bridge', (
    tester,
  ) async {
    var setupOpens = 0;

    await tester.pumpWidget(
      _app(
        HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.atRisk,
          count: 12,
          countCoverage: HostCustomerMatchCountCoverage.atLeast,
          campaignBlocker: HostCampaignBlockers.senderInactive,
          onMessage: null,
          onReviewSenderSetup: () => setupOpens += 1,
        ),
      ),
    );

    final button = tester.widget<CatchButton>(
      find.byKey(const ValueKey('host-customers-sender-setup-action')),
    );
    expect(button.label, 'Set up WhatsApp Business');
    expect(button.onPressed, isNotNull);
    expect(find.text('Sender verification is incomplete'), findsOneWidget);

    await tester.tap(find.text('Set up WhatsApp Business'));
    expect(setupOpens, 1);
  });

  testWidgets('all customers renders no redundant messaging handoff', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        const HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.all,
          count: 2,
          countCoverage: HostCustomerMatchCountCoverage.exact,
          campaignBlocker: null,
          onMessage: null,
          onReviewSenderSetup: null,
        ),
      ),
    );

    expect(find.text('All · 2 people'), findsOneWidget);
    expect(find.text('Message these 2'), findsNothing);
    expect(find.byType(CatchButton), findsNothing);
  });

  testWidgets('provider unavailability explains the blocker without a CTA', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        const HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.atRisk,
          count: 12,
          countCoverage: HostCustomerMatchCountCoverage.exact,
          campaignBlocker: HostCampaignBlockers.providerSetupRequired,
          onMessage: null,
          onReviewSenderSetup: null,
        ),
      ),
    );

    expect(find.text('WhatsApp provider setup is incomplete'), findsOneWidget);
    expect(find.byType(CatchButton), findsNothing);
  });

  testWidgets('manual tag summary can become its own saved audience', (
    tester,
  ) async {
    var messagesStarted = 0;

    await tester.pumpWidget(
      _app(
        HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.all,
          manualTag: const HostCustomerManualTag(
            tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            label: 'Brings friends',
          ),
          count: 4,
          countCoverage: HostCustomerMatchCountCoverage.exact,
          campaignBlocker: null,
          onMessage: () => messagesStarted += 1,
          onReviewSenderSetup: null,
        ),
      ),
    );

    expect(find.text('Brings friends · 4 people'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('host-customers-messaging-action')),
      findsOneWidget,
    );
    await tester.tap(find.text('Message these 4 people'));
    expect(messagesStarted, 1);
  });
}

Widget _app(Widget child) => MaterialApp(
  theme: AppTheme.light,
  home: Scaffold(body: child),
);
