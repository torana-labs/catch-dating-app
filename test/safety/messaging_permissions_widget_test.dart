import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_controller.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

MessagingPermissionsState _state({String? pendingKey, Object? error}) =>
    MessagingPermissionsState(
      uid: 'person',
      pendingKey: pendingKey,
      error: error,
      page: MessagingPermissionPage(
        catchPermission: const MessagingPermission(
          organizerId: null,
          organizerName: null,
          status: MessagingPermissionStatus.optedIn,
          receiptId: 'catch-grant',
        ),
        organizers: const [
          MessagingPermission(
            organizerId: 'rsvp',
            organizerName: 'RSVP Demo',
            status: MessagingPermissionStatus.optedIn,
            receiptId: 'rsvp-grant',
            purposes: {
              MessagingPermissionPurpose.eventOperations:
                  MessagingPurposeDecision(
                    status: MessagingPermissionStatus.optedIn,
                    receiptId: 'ops-grant',
                  ),
              MessagingPermissionPurpose.marketing: MessagingPurposeDecision(
                status: MessagingPermissionStatus.optedIn,
                receiptId: 'marketing-grant',
              ),
            },
          ),
          MessagingPermission(
            organizerId: 'coffee',
            organizerName: 'Coffee Club Demo',
            status: MessagingPermissionStatus.optedOut,
            receiptId: 'coffee-stop',
          ),
        ],
        nextCursor: null,
      ),
    );
const _key = ValueKey('messaging-capture');
void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('independent sender controls are readable $dark $scale', (
        tester,
      ) async {
        final actions = <MessagingPermission>[];
        await _pump(tester, _state(), actions.add, dark: dark, scale: scale);
        expect(find.text('Catch'), findsOneWidget);
        expect(find.text('RSVP Demo'), findsOneWidget);
        expect(
          find.byKey(const ValueKey('withdraw-organizer:coffee')),
          findsNothing,
        );
        expect(find.textContaining('Updates stopped'), findsOneWidget);
        for (final paragraph in tester.renderObjectList<RenderParagraph>(
          find.byType(RichText),
        )) {
          expect(
            paragraph.didExceedMaxLines,
            false,
            reason: paragraph.text.toPlainText(),
          );
        }
        await _capture(tester, 'permissions-${dark ? 'dark' : 'light'}-$scale');
        final target = find.byKey(const ValueKey('withdraw-organizer:rsvp'));
        await tester.ensureVisible(target);
        await pumpFeatureUi(tester);
        expect(tester.getSize(target).height, greaterThanOrEqualTo(44));
        await tester.tap(target);
        await pumpFeatureUi(tester);
        expect(actions.single.organizerId, 'rsvp');
        expect(tester.takeException(), isNull);
      });
    }
  }
  testWidgets('pending withdrawal disables both senders', (tester) async {
    await _pump(tester, _state(pendingKey: 'catch'), (_) {});
    for (final key in ['withdraw-catch', 'withdraw-organizer:rsvp']) {
      expect(
        tester.widget<CatchButton>(find.byKey(ValueKey(key))).onPressed,
        isNull,
      );
    }
  });
  testWidgets('each organizer purpose has its own withdrawal action', (
    tester,
  ) async {
    final actions = <MessagingPermissionPurpose>[];
    await _pump(
      tester,
      _state(),
      (_) {},
      onWithdrawPurpose: (permission, purpose) {
        expect(permission.organizerId, 'rsvp');
        actions.add(purpose);
      },
    );
    final operations = find.byKey(
      const ValueKey('withdraw-organizer:rsvp-eventOperations'),
    );
    final marketing = find.byKey(
      const ValueKey('withdraw-organizer:rsvp-marketing'),
    );
    expect(operations, findsOneWidget);
    expect(marketing, findsOneWidget);
    await tester.tap(operations);
    await pumpFeatureUi(tester);
    expect(actions, [MessagingPermissionPurpose.eventOperations]);
  });
  testWidgets('fresh scoped grant after older STOP keeps Stop all reachable', (
    tester,
  ) async {
    final stoppedThenRejoined = const MessagingPermission(
      organizerId: 'rsvp',
      organizerName: 'RSVP Demo',
      status: MessagingPermissionStatus.optedOut,
      receiptId: 'old-stop',
      purposes: {
        MessagingPermissionPurpose.eventOperations:
            MessagingPurposeDecision(
              status: MessagingPermissionStatus.optedIn,
              receiptId: 'fresh-grant',
            ),
      },
    );
    final state = MessagingPermissionsState(
      uid: 'person',
      page: MessagingPermissionPage(
        catchPermission: _state().page.catchPermission,
        organizers: [stoppedThenRejoined],
        nextCursor: null,
      ),
    );
    final actions = <MessagingPermission>[];
    await _pump(tester, state, actions.add);
    final stopAll = find.byKey(const ValueKey('withdraw-organizer:rsvp'));
    expect(stopAll, findsOneWidget);
    await tester.tap(stopAll);
    await pumpFeatureUi(tester);
    expect(actions.single, stoppedThenRejoined);
  });
}

Future<void> _pump(
  WidgetTester tester,
  MessagingPermissionsState state,
  ValueChanged<MessagingPermission> onWithdraw, {
  void Function(MessagingPermission, MessagingPermissionPurpose)?
      onWithdrawPurpose,
  bool dark = false,
  double scale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    RepaintBoundary(
      key: _key,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: dark ? AppTheme.dark : AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: CatchRouteScaffold(
          topBarBuilder: (_, _) =>
              const CatchTopBar.route(title: 'WhatsApp permissions'),
          body: CatchRouteBody.standardConstrained(
            child: MessagingPermissionsPageBody(
              state: state,
              onWithdraw: onWithdraw,
              onWithdrawPurpose: onWithdrawPurpose,
              onRefresh: () {},
              onLoadMore: () {},
            ),
          ),
        ),
      ),
    ),
  );
  if (state.busy) {
    await tester.pump();
  } else {
    await pumpFeatureUi(tester);
  }
}

Future<void> _capture(WidgetTester tester, String name) async {
  final directory = Platform.environment['CATCH_MESSAGING_CAPTURE_DIR'];
  if (directory == null) return;
  await tester.runAsync(() async {
    final image = await tester
        .renderObject<RenderRepaintBoundary>(find.byKey(_key))
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
