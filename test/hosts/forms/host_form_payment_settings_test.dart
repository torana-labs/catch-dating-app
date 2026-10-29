import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

const _key = ValueKey('form-payment-capture');
const _connection = HostFormPaymentConnection(
  connectionId: 'rpc_example',
  status: HostFormPaymentConnectionStatus.ready,
  mode: HostFormPaymentMode.test,
  accountId: 'acc_rsvp_demo',
  webhookVerified: true,
);

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    testWidgets(
      'payment setup is honest when partner setup is unavailable $dark',
      (tester) async {
        final definition = HostFormDefinition.fromMap(const {
          'identityPolicy': 'phoneVerified',
        });
        await _pump(
          tester,
          dark: dark,
          child: HostFormPaymentSetupSection(
            state: const HostFormPaymentSetupState(
              setup: HostFormPaymentSetup(available: false, connections: []),
            ),
            definition: definition,
            onChanged: (_) => fail('Cannot configure while unavailable'),
            onConnect: () => fail('Cannot connect while unavailable'),
            onRefresh: () {},
            onDisconnect: (_) {},
          ),
        );
        expect(
          find.textContaining('Catch must finish its Razorpay'),
          findsOneWidget,
        );
        final feeAction = tester.widget<CatchField>(
          find.byWidgetPredicate(
            (w) => w is CatchField && w.title == 'Set a submission fee',
          ),
        );
        expect(feeAction.onTap, isNull);
        _readable(tester);
        await _capture(tester, 'unavailable-${dark ? 'dark' : 'light'}');
      },
    );
  }

  for (final ready in [false, true]) {
    testWidgets(
      'Catch collection works independently of OAuth readiness $ready',
      (tester) async {
        HostFormPayment? saved;
        await _pump(
          tester,
          textScale: 2,
          child: HostFormPaymentSetupSection(
            state: HostFormPaymentSetupState(
              setup: HostFormPaymentSetup(
                available: false,
                connections: const [],
                collection: HostFormPaymentCollection(
                  route: HostFormCollectionRoute.razorpayRoute,
                  mode: HostFormPaymentMode.test,
                  ready: ready,
                ),
              ),
            ),
            definition:
                HostFormDefinition.fromMap(const {
                  'identityPolicy': 'phoneVerified',
                }).withPayment(
                  const HostFormPayment(
                    connectionId: null,
                    amountPaise: 12550,
                    description: 'Application fee',
                    refundPolicy: 'Refunded if declined.',
                  ),
                ),
            onChanged: (value) => saved = value,
            onConnect: () => fail('Route must not require OAuth'),
            onRefresh: () {},
            onDisconnect: (_) {},
          ),
        );
        expect(find.text('Catch collects payments'), findsOneWidget);
        expect(
          find.textContaining('Catch must finish its Razorpay'),
          findsNothing,
        );
        final action = find.byWidgetPredicate(
          (w) => w is CatchField && w.title == 'Edit submission fee',
        );
        final field = tester.widget<CatchField>(action);
        expect(field.onTap, ready ? isNotNull : isNull);
        _readable(tester);
        await _capture(tester, 'catch-collection-$ready-large-light');
        if (ready) {
          field.onTap!();
          await pumpFeatureUi(tester);
          _readable(tester);
          await _capture(tester, 'catch-fee-large-light');
          await tester.ensureVisible(find.text('Save fee'));
          await pumpFeatureUi(tester);
          await tester.tap(find.text('Save fee'));
          await pumpFeatureUi(tester);
          expect(saved?.connectionId, isNull);
          expect(saved?.amountPaise, 12550);
        }
      },
    );
  }

  testWidgets(
    'unverified identity cannot configure even with a ready merchant',
    (tester) async {
      await _pump(
        tester,
        child: HostFormPaymentSetupSection(
          state: const HostFormPaymentSetupState(
            setup: HostFormPaymentSetup(
              available: true,
              connections: [_connection],
            ),
          ),
          definition: HostFormDefinition.fromMap(const {
            'identityPolicy': 'anonymous',
          }),
          onChanged: (_) => fail('Must require phone identity'),
          onConnect: () {},
          onRefresh: () {},
          onDisconnect: (_) {},
        ),
      );
      final field = tester.widget<CatchField>(
        find.byWidgetPredicate(
          (w) => w is CatchField && w.title == 'Set a submission fee',
        ),
      );
      expect(field.onTap, isNull);
      expect(
        find.textContaining('Choose verified phone in Access'),
        findsOneWidget,
      );
      _readable(tester);
    },
  );

  testWidgets(
    'fee sheet requires refund policy and preserves exact amount and account',
    (tester) async {
      HostFormPayment? saved;
      await _pump(
        tester,
        child: Builder(
          builder: (context) => CatchButton(
            label: 'Configure',
            onPressed: () async {
              saved = await showCatchBottomSheet<HostFormPayment>(
                context: context,
                builder: (_) => const HostFormPaymentSheet(
                  payment: null,
                  connections: [_connection],
                ),
              );
            },
          ),
        ),
      );
      await tester.tap(find.text('Configure'));
      await pumpFeatureUi(tester);
      CatchButton saveButton() => tester.widget<CatchButton>(
        find.byWidgetPredicate(
          (w) => w is CatchButton && w.label == 'Save fee',
        ),
      );
      expect(saveButton().onPressed, isNull);
      Finder input(String title) => find.descendant(
        of: find.byWidgetPredicate((w) => w is CatchField && w.title == title),
        matching: find.byType(EditableText),
      );
      await tester.enterText(input('Amount (INR)'), '200.50');
      await tester.enterText(
        input('Refund policy'),
        'Refunded if your application is declined.',
      );
      tester.testTextInput.hide();
      await tester.pump();
      await pumpFeatureUi(tester);
      expect(saveButton().onPressed, isNotNull);
      _readable(tester);
      await _capture(tester, 'configure-fee-light');
      await tester.tap(find.text('Save fee'));
      await pumpFeatureUi(tester);
      expect(saved!.amountPaise, 20050);
      expect(saved!.connectionId, _connection.connectionId);
      expect(saved!.refundPolicy, 'Refunded if your application is declined.');
    },
  );
  for (final dark in [false, true]) {
    testWidgets('ready fee remains readable with large text $dark', (
      tester,
    ) async {
      await _pump(
        tester,
        dark: dark,
        textScale: 2,
        child: HostFormPaymentSetupSection(
          state: const HostFormPaymentSetupState(
            setup: HostFormPaymentSetup(
              available: true,
              connections: [_connection],
            ),
          ),
          definition:
              HostFormDefinition.fromMap(const {
                'identityPolicy': 'phoneVerified',
              }).withPayment(
                const HostFormPayment(
                  connectionId: 'rpc_example',
                  amountPaise: 10000,
                  description: 'Application fee',
                  refundPolicy: 'Refunded if declined.',
                ),
              ),
          onChanged: (_) {},
          onConnect: () {},
          onRefresh: () {},
          onDisconnect: (_) {},
        ),
      );
      _readable(tester);
      await _capture(tester, 'ready-large-${dark ? 'dark' : 'light'}');
    });
  }
}

Future<void> _pump(
  WidgetTester tester, {
  required Widget child,
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
        home: CatchRouteScaffold(
          topBarBuilder: (_, _) =>
              const CatchTopBar.route(title: 'Form settings'),
          body: CatchRouteBody.standard(child: child),
        ),
      ),
    ),
  );
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
  final directory = Platform.environment['CATCH_FORM_PAYMENT_CAPTURE_DIR'];
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
