import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_card.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller_card.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/misc.dart' show Override;

const _hostUid = 'host-1';

/// The payout card's states, moved from the retired organiser workspace test
/// library.
void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  testWidgets('Host payment card shows loading while uid resolves', (
    tester,
  ) async {
    await _pump(
      tester,
      HostPaymentAccountControllerCard(
        organizer: buildOrganizer(id: 'owned-club', ownerUserId: _hostUid),
      ),
      overrides: [uidProvider.overrideWithValue(const AsyncLoading<String?>())],
    );

    expect(find.byType(HostPaymentAccountLoadingCard), findsOneWidget);
    expect(find.text('Connect payouts to get paid'), findsNothing);
  });

  testWidgets('Host payout states each own one canonical field-row section', (
    tester,
  ) async {
    final organizer = buildOrganizer(id: 'owned-club', ownerUserId: _hostUid);
    HostPaymentAccount account({
      required HostPaymentOnboardingStatus status,
      bool chargesEnabled = false,
      bool payoutsEnabled = false,
      String? disabledReason,
    }) => HostPaymentAccount(
      userId: _hostUid,
      provider: HostPaymentProvider.razorpay,
      country: 'IN',
      defaultCurrency: 'INR',
      providerAccountId: 'acc_test',
      razorpayAccountId: 'acc_test',
      chargesEnabled: chargesEnabled,
      payoutsEnabled: payoutsEnabled,
      detailsSubmitted: status != HostPaymentOnboardingStatus.notStarted,
      onboardingStatus: status,
      disabledReason: disabledReason,
    );

    await _pump(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          child: Column(
            children: [
              HostPaymentAccountCard(organizer: organizer, loading: true),
              HostPaymentAccountCard(
                organizer: organizer,
                error: StateError('payout query failed'),
              ),
              HostPaymentAccountCard(organizer: organizer),
              HostPaymentAccountCard(
                organizer: organizer,
                account: account(status: HostPaymentOnboardingStatus.pending),
              ),
              HostPaymentAccountCard(
                organizer: organizer,
                account: account(
                  status: HostPaymentOnboardingStatus.restricted,
                  disabledReason: 'Identity document required',
                ),
              ),
              HostPaymentAccountCard(
                organizer: organizer,
                account: account(
                  status: HostPaymentOnboardingStatus.complete,
                  chargesEnabled: true,
                  payoutsEnabled: true,
                ),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    final sections = tester.widgetList<CatchSection>(find.byType(CatchSection));
    expect(sections, hasLength(6));
    expect(sections.every((section) => section.title == 'Payouts'), isTrue);
    expect(
      tester
          .widgetList<CatchDivider>(
            find.descendant(
              of: find.byType(CatchSection),
              matching: find.byType(CatchDivider),
            ),
          )
          .where((divider) => divider.variant == CatchDividerVariant.section),
      hasLength(6),
    );
    final headers = tester.widgetList<CatchSectionHeader>(
      find.byType(CatchSectionHeader),
    );
    expect(headers, hasLength(6));
    expect(
      headers.every(
        (header) => header.variant == CatchSectionHeaderVariant.kicker,
      ),
      isTrue,
    );
    expect(find.byType(CatchField), findsWidgets);
    expect(find.text('Set up international payouts'), findsOneWidget);
    expect(find.text('Razorpay'), findsWidgets);
    expect(find.text('Stripe'), findsWidgets);
    expect(find.textContaining('Recommended'), findsWidgets);
    expect(find.text('Identity document required'), findsOneWidget);
    expect(find.text('Razorpay payout account is ready'), findsOneWidget);
  });

  testWidgets('India payout setup recommends Razorpay and exposes Route form', (
    tester,
  ) async {
    final organizer = buildOrganizer(
      id: 'owned-club',
      ownerUserId: _hostUid,
      location: 'mumbai',
    );

    await _pump(tester, HostPaymentAccountCard(organizer: organizer));
    await tester.pump();

    final razorpay = find.text('Razorpay');
    final stripe = find.text('Stripe');
    expect(razorpay, findsOneWidget);
    expect(stripe, findsOneWidget);
    expect(
      tester.getTopLeft(razorpay).dy,
      lessThan(tester.getTopLeft(stripe).dy),
    );
    expect(find.textContaining('Recommended'), findsOneWidget);

    await tester.tap(razorpay);
    await pumpFeatureUi(tester);
    expect(find.text('Powered by Razorpay Route'), findsOneWidget);
    await tester.tap(find.text('Set up Razorpay'));
    await pumpFeatureUi(tester);

    expect(find.text('Legal business name'), findsOneWidget);
    expect(find.text('Business type'), findsOneWidget);
    expect(find.text('Submit to Razorpay'), findsOneWidget);
  });
}

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  List<Override> overrides = const [],
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        firebaseFirestoreProvider.overrideWithValue(FakeFirebaseFirestore()),
        ...overrides,
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: child,
        builder: (context, child) =>
            CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}
