import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_razorpay_connection_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../support/catch_test_fonts.dart';
import '../../../test_pump_helpers.dart';

const _key = ValueKey('payout-connection-capture');

HostFormPaymentConnection _connection(HostFormPaymentConnectionStatus status) =>
    HostFormPaymentConnection(
      connectionId: 'rpc_example',
      status: status,
      mode: HostFormPaymentMode.live,
      accountId: 'acc_organiser_demo',
      webhookVerified: status == HostFormPaymentConnectionStatus.ready,
    );

void main() {
  setUpAll(loadCatchTestFonts);

  for (final dark in [false, true]) {
    testWidgets(
      'payouts stay honest while partner setup is unavailable $dark',
      (tester) async {
        await _pump(
          tester,
          dark: dark,
          child: HostRazorpayConnectionSection(
            state: const HostFormPaymentSetupState(
              setup: HostFormPaymentSetup(available: false, connections: []),
            ),
            onConnect: () => fail('Cannot connect while unavailable'),
            onRefresh: () {},
            onDisconnect: (_) => fail('Nothing to disconnect'),
          ),
        );
        expect(find.text('Guests pay you directly'), findsOneWidget);
        expect(
          find.textContaining('Catch never holds your money'),
          findsOneWidget,
        );
        expect(
          find.textContaining('finishing its Razorpay partner setup'),
          findsOneWidget,
        );
        expect(_badge('Not set up'), findsOneWidget);
        expect(_field(tester, 'Connect Razorpay').onTap, isNull);
        _readable(tester);
        await _capture(tester, 'unavailable-${dark ? 'dark' : 'light'}');
      },
    );
  }

  testWidgets('connect discloses what Catch can do before OAuth', (
    tester,
  ) async {
    var connects = 0;
    await _pump(
      tester,
      textScale: 2,
      child: HostRazorpayConnectionSection(
        state: const HostFormPaymentSetupState(
          setup: HostFormPaymentSetup(available: true, connections: []),
        ),
        onConnect: () => connects++,
        onRefresh: () {},
        onDisconnect: (_) {},
      ),
    );
    final permissions = _field(tester, 'What connecting allows');
    expect(permissions.body, contains('create orders'));
    expect(permissions.body, contains('issue refunds'));
    expect(permissions.body, contains('disconnect at any time'));
    expect(find.text('No Razorpay account yet?'), findsOneWidget);
    await tester.ensureVisible(find.text('Connect Razorpay'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Connect Razorpay'));
    expect(connects, 1);
    _readable(tester);
    await _capture(tester, 'connect-large-text');
  });

  for (final dark in [false, true]) {
    testWidgets('a ready account shows ready and confirms disconnect $dark', (
      tester,
    ) async {
      final disconnected = <String>[];
      await _pump(
        tester,
        dark: dark,
        child: HostRazorpayConnectionSection(
          state: HostFormPaymentSetupState(
            setup: HostFormPaymentSetup(
              available: true,
              connections: [
                _connection(HostFormPaymentConnectionStatus.ready),
                _connection(HostFormPaymentConnectionStatus.disconnected),
              ],
            ),
          ),
          onConnect: () {},
          onRefresh: () {},
          onDisconnect: disconnected.add,
        ),
      );
      expect(_badge('Ready'), findsOneWidget);
      expect(find.text('acc_organiser_demo'), findsOneWidget);
      expect(find.text('No Razorpay account yet?'), findsNothing);
      expect(find.text('Connect Razorpay'), findsNothing);
      _readable(tester);
      await _capture(tester, 'ready-${dark ? 'dark' : 'light'}');

      final disconnectRow = find.descendant(
        of: find.byType(CatchField),
        matching: find.text('Disconnect account'),
      );
      await tester.ensureVisible(disconnectRow);
      await pumpFeatureUi(tester);
      await tester.tap(disconnectRow);
      await pumpFeatureUi(tester);
      expect(
        find.textContaining('stops new checkouts for your events and forms'),
        findsOneWidget,
      );
      await tester.tap(
        find.descendant(
          of: find.byType(CatchButton),
          matching: find.text('Disconnect account'),
        ),
      );
      await pumpFeatureUi(tester);
      expect(disconnected, ['rpc_example']);
    });
  }

  testWidgets('pending state blocks repeat actions', (tester) async {
    await _pump(
      tester,
      settle: false,
      child: HostRazorpayConnectionSection(
        state: HostFormPaymentSetupState(
          setup: HostFormPaymentSetup(
            available: true,
            connections: [
              _connection(HostFormPaymentConnectionStatus.connecting),
            ],
          ),
          pending: true,
        ),
        onConnect: () => fail('Pending blocks connect'),
        onRefresh: () => fail('Pending blocks refresh'),
        onDisconnect: (_) => fail('Pending blocks disconnect'),
      ),
    );
    expect(_badge('Not set up'), findsOneWidget);
    expect(find.text('Connect Razorpay'), findsNothing);
    expect(_field(tester, 'Check connection').onTap, isNull);
    expect(_field(tester, 'Disconnect account').onTap, isNull);
    _readable(tester);
  });
}

Finder _badge(String label) =>
    find.byWidgetPredicate((w) => w is CatchBadge && w.label == label);

CatchField _field(WidgetTester tester, String title) =>
    tester.widget<CatchField>(
      find.byWidgetPredicate((w) => w is CatchField && w.title == title),
    );

Future<void> _pump(
  WidgetTester tester, {
  required Widget child,
  bool dark = false,
  double textScale = 1,
  bool settle = true,
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
          topBarBuilder: (_, _) => const CatchTopBar.route(title: 'Payments'),
          body: CatchRouteBody.standard(child: child),
        ),
      ),
    ),
  );
  if (settle) {
    await pumpFeatureUi(tester);
  } else {
    await tester.pump();
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
  final directory = Platform.environment['CATCH_PAYOUT_CAPTURE_DIR'];
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
