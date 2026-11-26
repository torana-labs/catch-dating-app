import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/read_models/host_form_payment_reads.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_screen.dart';
import 'package:catch_dating_app/hosts/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

HostFormPaymentRecord _record(HostFormPaymentStatus status) =>
    HostFormPaymentRecord(
      paymentId: 'fp_${status.name}',
      status: status,
      mode: HostFormPaymentMode.test,
      amountPaise: 20000,
      refundedAmountPaise: status == HostFormPaymentStatus.refunded ? 5000 : 0,
      createdAt: DateTime(2026, 9, 23, 11, 5),
      updatedAt: DateTime(2026, 9, 23, 11, 6),
      receipt: 'cfp_1234567890abcdef',
      providerOrderId: 'order_demo123',
      responseId: status == HostFormPaymentStatus.submitted
          ? 'response_demo'
          : null,
    );

class _Reads extends Fake implements HostFormPaymentReads {
  final filters = <HostFormPaymentFilter>[];
  bool empty = false;

  @override
  LivePager<HostFormPaymentRecord> watchPages({
    required String organizerId,
    required String formId,
    HostFormPaymentFilter filter = HostFormPaymentFilter.all,
    int pageSize = 50,
  }) {
    filters.add(filter);
    final statuses = filter.statuses.isEmpty
        ? [
            HostFormPaymentStatus.submitted,
            HostFormPaymentStatus.captured,
            HostFormPaymentStatus.refunded,
          ]
        : filter.statuses;
    return _OnePage(empty ? const [] : statuses.map(_record).toList());
  }
}

class _OnePage implements LivePager<HostFormPaymentRecord> {
  _OnePage(this.items);

  final List<HostFormPaymentRecord> items;

  @override
  Stream<LivePages<HostFormPaymentRecord>> get pages =>
      Stream.value(LivePages(items: items, hasMore: false));

  @override
  void loadMore() {}
}

class _Editor extends HostFormEditorController {
  @override
  Future<HostFormEditorState> build(String organizerId, String formId) =>
      Completer<HostFormEditorState>().future;
}

Future<(_Reads, List<String>, List<String>)> _pump(
  WidgetTester tester, {
  bool empty = false,
}) async {
  final reads = _Reads()..empty = empty;
  final opened = <String>[];
  final copied = <String>[];
  tester.view.physicalSize = const Size(390, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) =>
            const HostFormPaymentsScreen(organizerId: 'org', formId: 'form'),
      ),
      GoRoute(
        path: '/response/:responseId',
        name: Routes.hostFormResponseDetailScreen.name,
        builder: (_, state) {
          opened.add(state.pathParameters['responseId']!);
          return const SizedBox.shrink();
        },
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostFormPaymentReadsProvider.overrideWithValue(reads),
        hostFormEditorControllerProvider(
          'org',
          'form',
        ).overrideWith(_Editor.new),
        clipboardSetterProvider.overrideWithValue((data) async {
          copied.add(data.text ?? '');
        }),
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        routerConfig: router,
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return (reads, opened, copied);
}

void main() {
  testWidgets('lists every payment, filters by status and refreshes', (
    tester,
  ) async {
    final (reads, _, _) = await _pump(tester);

    expect(find.text('₹200.00 · Test mode — no real money'), findsNWidgets(3));
    final refunds = find.descendant(
      of: find.byKey(const ValueKey('host-form-payments-filter')),
      matching: find.text('Refunds'),
    );
    await tester.ensureVisible(refunds);
    await pumpFeatureUi(tester);
    await tester.tap(refunds);
    await pumpFeatureUi(tester);
    expect(reads.filters.last, HostFormPaymentFilter.refunds);
    final reads0 = reads.filters.length;
    await tester.tap(find.byKey(const ValueKey('host-form-payments-refresh')));
    await pumpFeatureUi(tester);
    expect(reads.filters.length, greaterThan(reads0));
  });

  testWidgets('a payment shows its details, copies a reference and opens '
      'its response', (tester) async {
    final (_, opened, copied) = await _pump(tester);

    await tester.tap(
      find.byKey(const ValueKey('host-form-payment-fp_submitted')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('order_demo123'), findsOneWidget);
    expect(find.text('cfp_1234567890abcdef'), findsOneWidget);
    await tester.tap(
      find.descendant(
        of: find.ancestor(
          of: find.text('order_demo123'),
          matching: find.byType(CatchField),
        ),
        matching: find.byTooltip('Copy'),
      ),
    );
    await pumpFeatureUi(tester);
    expect(copied, ['order_demo123']);
    await tester.tap(
      find.byKey(const ValueKey('host-form-payment-open-response')),
    );
    await pumpFeatureUi(tester);
    expect(opened, ['response_demo']);
  });

  testWidgets('a refund shows its amount', (tester) async {
    await _pump(tester);

    await tester.tap(
      find.byKey(const ValueKey('host-form-payment-fp_refunded')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('₹50.00'), findsOneWidget);
  });

  testWidgets('no payments says so', (tester) async {
    await _pump(tester, empty: true);

    expect(
      find.byKey(const ValueKey('host-form-payments-empty')),
      findsOneWidget,
    );
  });
}
