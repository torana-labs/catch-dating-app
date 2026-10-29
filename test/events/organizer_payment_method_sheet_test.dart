import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/events/presentation/widgets/organizer_payment_method_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

const _key = ValueKey('payment-method-capture');

void main() {
  setUpAll(loadCatchTestFonts);

  for (final (dark, textScale) in [(false, 1.0), (true, 1.0), (false, 2.0)]) {
    final name = '${dark ? 'dark' : 'light'}-${textScale}x';
    testWidgets('payment page shows the quote and every method $name', (
      tester,
    ) async {
      OrganizerPaymentMethod? chosen;
      await _pump(
        tester,
        dark: dark,
        textScale: textScale,
        onChosen: (method) => chosen = method,
        sheet: OrganizerPaymentMethodSheet(
          amountPaise: 50000,
          currency: 'INR',
          refundDeadline: DateTime(2026, 11, 1, 19),
        ),
      );
      expect(find.text('Pay ₹500'), findsOneWidget);
      expect(
        find.textContaining('goes to the event’s organiser'),
        findsOneWidget,
      );
      expect(
        find.textContaining('Full refund if you cancel by'),
        findsOneWidget,
      );
      expect(find.textContaining('never in Catch'), findsOneWidget);
      for (final label in [
        'Google Pay',
        'PhonePe',
        'Paytm',
        'Other UPI app or UPI ID',
        'Credit or debit card',
        'Net banking',
      ]) {
        expect(find.text(label), findsOneWidget, reason: label);
      }
      _readable(tester);
      await _capture(tester, name);

      await tester.ensureVisible(find.text('Credit or debit card'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Credit or debit card'));
      await pumpFeatureUi(tester);
      expect(chosen, OrganizerPaymentMethod.card);
    });
  }

  testWidgets('without a refund deadline the page omits the refund line', (
    tester,
  ) async {
    await _pump(
      tester,
      onChosen: (_) {},
      sheet: const OrganizerPaymentMethodSheet(
        amountPaise: 12550,
        currency: 'INR',
      ),
    );
    expect(find.text('Pay ₹125.50'), findsOneWidget);
    expect(find.textContaining('Full refund if you cancel by'), findsNothing);
    await tester.tap(find.text('Google Pay'));
    await pumpFeatureUi(tester);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  required Widget sheet,
  required ValueChanged<OrganizerPaymentMethod?> onChosen,
  bool dark = false,
  double textScale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    RepaintBoundary(
      key: _key,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: dark ? AppTheme.dark : AppTheme.light,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) => CatchRouteScaffold(
            topBarBuilder: (_, _) => const CatchTopBar.route(title: 'Event'),
            body: CatchRouteBody.standard(
              child: CatchButton(
                label: 'Book',
                onPressed: () async => onChosen(
                  await showCatchBottomSheet<OrganizerPaymentMethod>(
                    context: context,
                    builder: (_) => sheet,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  await tester.tap(find.text('Book'));
  await pumpFeatureUi(tester);
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
  final directory = Platform.environment['CATCH_PAYMENT_PAGE_CAPTURE_DIR'];
  if (directory == null) return;
  await tester.runAsync(() async {
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(_key),
    );
    final image = await boundary.toImage();
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
