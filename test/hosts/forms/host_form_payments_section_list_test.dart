import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_detail_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_section_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

const _captureKey = ValueKey('payment-history-capture');
HostFormPaymentRecord _record(HostFormPaymentStatus status) =>
    HostFormPaymentRecord(
      paymentId: 'fp_${status.name}',
      status: status,
      mode: HostFormPaymentMode.test,
      amountPaise: 20000,
      refundedAmountPaise: status == HostFormPaymentStatus.refunded ? 20000 : 0,
      createdAt: DateTime(2026, 9, 23, 11, 5),
      updatedAt: DateTime(2026, 9, 23, 11, 6),
      receipt: 'cfp_1234567890abcdef1234567890abcdef',
      providerOrderId: 'order_demo123',
      responseId: status == HostFormPaymentStatus.submitted
          ? 'response_demo'
          : null,
    );

class _Repository extends Fake implements HostFormsRepository {
  final filters = <HostFormPaymentFilter>[];
  bool empty = false;
  @override
  Future<HostFormPaymentPage> listPayments({
    required String organizerId,
    required String formId,
    HostFormPaymentFilter filter = HostFormPaymentFilter.all,
    String? cursor,
  }) async {
    expect((organizerId, formId), ('org', 'form'));
    filters.add(filter);
    final statuses = filter.statuses.isEmpty
        ? [
            HostFormPaymentStatus.submitted,
            HostFormPaymentStatus.captured,
            HostFormPaymentStatus.refundPending,
          ]
        : filter.statuses;
    return HostFormPaymentPage(
      items: empty ? [] : statuses.map(_record).toList(),
      nextCursor: null,
    );
  }
}

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    testWidgets('payment stages and test money are explicit $dark', (
      tester,
    ) async {
      final repository = _Repository();
      await _pump(tester, repository: repository, dark: dark);
      expect(find.textContaining('Test mode'), findsWidgets);
      expect(find.textContaining('Paid · submission pending'), findsOneWidget);
      _readable(tester);
      await _capture(tester, 'history-${dark ? 'dark' : 'light'}');
      await tester.tap(find.textContaining('Paid · submission pending'));
      await pumpFeatureUi(tester);
      expect(find.textContaining('Catch is still completing'), findsOneWidget);
      expect(find.text('Open submitted response'), findsNothing);
      _readable(tester);
      await _capture(tester, 'pending-detail-${dark ? 'dark' : 'light'}');
    });
  }
  testWidgets('filter uses authoritative scoped query and can refresh', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository: repository);
    final choice = tester.widget<CatchChoiceInput<HostFormPaymentFilter>>(
      find.byType(CatchChoiceInput<HostFormPaymentFilter>),
    );
    choice.onChanged!({HostFormPaymentFilter.refunds});
    await pumpFeatureUi(tester);
    expect(repository.filters.last, HostFormPaymentFilter.refunds);
    expect(find.byKey(const ValueKey('fp_submitted')), findsNothing);
    expect(find.textContaining('Refund pending'), findsOneWidget);
    await tester.tap(find.text('Refresh payments'));
    await pumpFeatureUi(tester);
    expect(
      repository.filters
          .where((f) => f == HostFormPaymentFilter.refunds)
          .length,
      2,
    );
  });
  testWidgets(
    'empty records explain checkout rather than implying payment setup',
    (tester) async {
      final repository = _Repository()..empty = true;
      await _pump(tester, repository: repository);
      expect(find.text('No payment records'), findsOneWidget);
      _readable(tester);
    },
  );
  for (final status in HostFormPaymentStatus.values) {
    testWidgets(
      'large-text detail is readable and response is evidence based: ${status.name}',
      (tester) async {
        var opened = false;
        await _pump(
          tester,
          repository: _Repository(),
          dark: true,
          textScale: 2,
          detail: HostFormPaymentDetailSheet(
            payment: _record(status),
            onOpenResponse: () => opened = true,
          ),
        );
        _readable(tester);
        if (status == HostFormPaymentStatus.submitted) {
          await tester.ensureVisible(find.text('Open submitted response'));
          await pumpFeatureUi(tester);
          await tester.tap(find.text('Open submitted response'));
          expect(opened, isTrue);
          await _capture(tester, 'submitted-detail-large-dark');
        } else {
          expect(find.text('Open submitted response'), findsNothing);
        }
      },
    );
  }
}

Future<void> _pump(
  WidgetTester tester, {
  required _Repository repository,
  bool dark = false,
  double textScale = 1,
  Widget? detail,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [hostFormsRepositoryProvider.overrideWithValue(repository)],
      child: RepaintBoundary(
        key: _captureKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: dark ? AppTheme.dark : AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(textScale)),
            child: child!,
          ),
          home: CatchRouteScaffold(
            topBarBuilder: (_, _) => const CatchTopBar.route(title: 'Payments'),
            body: CatchRouteBody.fullBleed(
              child: detail != null
                  ? Builder(
                      builder: (context) => CatchButton(
                        label: 'Open detail',
                        onPressed: () => showCatchBottomSheet<void>(
                          context: context,
                          builder: (_) => detail,
                        ),
                      ),
                    )
                  : const CustomScrollView(
                      slivers: [
                        HostFormPaymentsSectionList(
                          organizerId: 'org',
                          formId: 'form',
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  if (detail != null) {
    await tester.tap(find.text('Open detail'));
    await pumpFeatureUi(tester);
  }
}

void _readable(WidgetTester tester) {
  expect(tester.takeException(), isNull);
  for (final paragraph in tester.renderObjectList<RenderParagraph>(
    find.byType(RichText),
  )) {
    expect(
      paragraph.didExceedMaxLines,
      isFalse,
      reason: paragraph.text.toPlainText(),
    );
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  final directory = Platform.environment['CATCH_FORM_PAYMENT_CAPTURE_DIR'];
  if (directory == null) return;
  await tester.runAsync(() async {
    final image = await tester
        .renderObject<RenderRepaintBoundary>(find.byKey(_captureKey))
        .toImage();
    try {
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      await Directory(directory).create(recursive: true);
      await File(
        '$directory/$name.png',
      ).writeAsBytes(bytes!.buffer.asUint8List());
    } finally {
      image.dispose();
    }
  });
}
