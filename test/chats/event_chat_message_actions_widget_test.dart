import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_chat_message_actions_controller_test.dart' show messagePage;
import 'event_chat_participants_widget_test.dart' show RoomFixtureController;

class SafetyFixture extends RoomFixtureController {
  final calls = <(EventChatSafetyAction, EventChatReportReason?, String)>[];
  @override
  Future<EventChatState> build(String eventId) async {
    final base = await super.build(eventId);
    return EventChatState(
      uid: 'maya',
      access: base.access,
      messages: messagePage().messages,
      typing: const [],
      nextBeforeSequence: null,
      receivedAt: base.receivedAt,
      serverTimeMillis: 0,
    );
  }

  @override
  Future<bool> actOnMessage(
    EventChatMessage message,
    EventChatSafetyAction action, {
    required String reviewedUid,
    EventChatReportReason? reason,
  }) async {
    calls.add((action, reason, reviewedUid));
    return true;
  }
}

const captureKey = ValueKey('safety-capture');
Future<void> capture(WidgetTester tester, String name) async {
  final directory = Platform.environment['CATCH_CHAT_SAFETY_CAPTURE_DIR'];
  if (directory == null) return;
  await tester.runAsync(() async {
    final image = await tester
        .renderObject<RenderRepaintBoundary>(find.byKey(captureKey))
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

Future<SafetyFixture> pumpSafety(
  WidgetTester tester, {
  bool dark = false,
  double scale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  final fixture = SafetyFixture();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((_) => Stream.value('maya')),
        eventChatControllerProvider('event').overrideWith(() => fixture),
      ],
      child: RepaintBoundary(
        key: captureKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: dark ? AppTheme.dark : AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: CatchNoticeOverlay(child: child!),
          ),
          home: const EventChatScreen(eventId: 'event'),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
  return fixture;
}

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('report reason is explicit and readable $dark $scale', (
        tester,
      ) async {
        final fixture = await pumpSafety(tester, dark: dark, scale: scale);
        await tester.tap(find.byTooltip('Message actions'));
        await pumpFeatureUi(tester);
        expect(find.text('Report message'), findsOneWidget);
        expect(find.text('Block sender'), findsOneWidget);
        expect(find.text('Remove message'), findsOneWidget);
        await capture(tester, 'menu-${dark ? 'dark' : 'light'}-$scale');
        final report = find.text('Report message');
        await tester.ensureVisible(report);
        await tester.tap(report);
        await pumpFeatureUi(tester);
        expect(fixture.calls, isEmpty);
        expect(
          find.textContaining('sender will not see your report'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        await capture(tester, 'report-${dark ? 'dark' : 'light'}-$scale');
        final spam = find.text('Spam or scam');
        await tester.ensureVisible(spam);
        await tester.tap(spam);
        await pumpFeatureUi(tester);
        expect(fixture.calls, [
          (EventChatSafetyAction.report, EventChatReportReason.spam, 'maya'),
        ]);
        expect(find.text('Report sent to Catch.'), findsOneWidget);
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }
  }
  testWidgets('block cancellation writes nothing, removal needs confirmation', (
    tester,
  ) async {
    final fixture = await pumpSafety(tester);
    await tester.tap(find.byTooltip('Message actions'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Block sender'));
    await pumpFeatureUi(tester);
    expect(find.textContaining('They stay in the event'), findsOneWidget);
    expect(fixture.calls, isEmpty);
    await tester.tap(find.text('Cancel'));
    await pumpFeatureUi(tester);
    expect(fixture.calls, isEmpty);
    await tester.tap(find.byTooltip('Message actions'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Remove message'));
    await pumpFeatureUi(tester);
    expect(
      find.textContaining('private record for safety review'),
      findsOneWidget,
    );
    expect(fixture.calls, isEmpty);
    await capture(tester, 'remove-confirmation');
    await tester.tap(find.widgetWithText(CatchButton, 'Remove message'));
    await pumpFeatureUi(tester);
    expect(fixture.calls, [(EventChatSafetyAction.remove, null, 'maya')]);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
