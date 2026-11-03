import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_organizer_bills_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../test_pump_helpers.dart';

HostOrganizerBill _bill({
  HostOrganizerBillStatus status = HostOrganizerBillStatus.sent,
  String month = '2026-10',
  DateTime? dueAt,
  String? paymentUrl = 'https://rzp.io/l/bill',
}) => HostOrganizerBill(
  billId: 'lantern_$month',
  month: DateTime(
    int.parse(month.split('-')[0]),
    int.parse(month.split('-')[1]),
  ),
  status: status,
  paymentCount: 412,
  eventCount: 9,
  grossMinor: 16150000,
  refundedMinor: 150000,
  providerFeeMinor: 377600,
  commissionMinor: 640000,
  capMinor: 1000000,
  capped: false,
  trialWaivedMinor: 0,
  gstRegistered: false,
  gstMinor: 0,
  totalMinor: 640000,
  invoiceNumber: '2026-27/031',
  dueAt: dueAt ?? DateTime(2026, 11, 15),
  paymentUrl: paymentUrl,
  paidAt: null,
  paidMinor: null,
);

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  List<Uri>? opened,
  bool openSucceeds = true,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          opened?.add(uri);
          return openSucceeds;
        }),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(body: child),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('a month shows what it costs and where it stands', (
    tester,
  ) async {
    HostOrganizerBill? tapped;
    final overdue = _bill();
    await _pump(
      tester,
      HostOrganizerBillList(
        bills: [
          overdue,
          _bill(status: HostOrganizerBillStatus.free, month: '2026-08'),
        ],
        now: DateTime(2026, 11, 18),
        onOpenBill: (bill) => tapped = bill,
      ),
    );
    expect(find.text('BILLS FROM CATCH'), findsOneWidget);
    expect(find.text('October 2026: ₹6,400'), findsOneWidget);
    expect(find.text('Overdue'), findsOneWidget);
    expect(find.text('August 2026: free'), findsOneWidget);
    expect(find.text('Free'), findsOneWidget);

    await tester.tap(find.text('October 2026: ₹6,400'));
    await pumpFeatureUi(tester);
    expect(tapped, overdue);
  });

  testWidgets('no bills says so', (tester) async {
    await _pump(
      tester,
      HostOrganizerBillList(
        bills: const [],
        now: DateTime(2026, 11, 18),
        onOpenBill: (_) => fail('Nothing to open'),
      ),
    );
    expect(find.text('No bills yet'), findsOneWidget);
  });

  testWidgets('the section reads the organizer\'s bills', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostOrganizerBillsProvider(
            'lantern',
          ).overrideWith((ref) async => [_bill()]),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const Scaffold(
            body: HostOrganizerBillsSection(organizerId: 'lantern'),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('October 2026: ₹6,400'), findsOneWidget);
  });

  testWidgets('an unpaid statement adds up and pays from its link', (
    tester,
  ) async {
    final opened = <Uri>[];
    await _pump(tester, HostOrganizerBillSheet(bill: _bill()), opened: opened);
    expect(find.text('Invoice 2026-27/031'), findsOneWidget);
    expect(find.text('₹160,000'), findsNWidgets(2));
    expect(find.text('-₹3,776'), findsOneWidget);
    expect(find.text('-₹6,400'), findsOneWidget);
    expect(find.text('₹149,824'), findsOneWidget);
    expect(find.text('GST'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('host-bill-pay')));
    await pumpFeatureUi(tester);
    expect(opened, [Uri.parse('https://rzp.io/l/bill')]);
  });

  testWidgets('a closed statement has nothing to pay', (tester) async {
    await _pump(
      tester,
      HostOrganizerBillSheet(
        bill: _bill(
          status: HostOrganizerBillStatus.writtenOff,
          paymentUrl: null,
        ),
      ),
    );
    expect(find.byKey(const ValueKey('host-bill-pay')), findsNothing);
    expect(find.text('Written off, so nothing to pay'), findsWidgets);
    expect(find.text('₹156,224'), findsOneWidget);
  });
}
