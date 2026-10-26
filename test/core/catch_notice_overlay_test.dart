import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  Future<ProviderContainer> mount(
    WidgetTester tester, {
    bool dark = false,
    double scale = 1,
    bool reduceMotion = false,
    bool accessibleNavigation = false,
  }) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: dark ? AppTheme.dark : AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              padding: const EdgeInsets.only(top: 59),
              textScaler: TextScaler.linear(scale),
              disableAnimations: reduceMotion,
              accessibleNavigation: accessibleNavigation,
            ),
            child: CatchNoticeOverlay(child: child!),
          ),
          home: const Scaffold(body: Text('Underlying route')),
        ),
      ),
    );
    return container;
  }

  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'arrival tap/identity at top safe area dark=$dark scale=$scale',
        (tester) async {
          final container = await mount(tester, dark: dark, scale: scale);
          var opened = 0;
          final before = tester.getTopLeft(find.text('Underlying route'));
          container
              .read(catchNoticeControllerProvider.notifier)
              .show(
                CatchNoticeData.arrival(
                  id: 'arrival',
                  title: 'Congratulations',
                  message: 'You and Ananya matched.',
                  person: const CatchPersonAvatarItem(
                    name: 'Ananya',
                    initials: 'A',
                  ),
                  onOpen: () => opened++,
                ),
              );
          await pumpFeatureUi(tester);
          final card = find.byKey(const ValueKey('app_notice.arrival'));
          expect(tester.getTopLeft(card).dy, 59 + CatchSpacing.s3);
          expect(tester.getTopLeft(find.text('Underlying route')), before);
          expect(find.text('Open'), findsNothing);
          expect(find.byIcon(CatchIcons.close), findsNothing);
          expect(find.byType(CatchAvatar), findsOneWidget);
          await tester.tap(find.text('You and Ananya matched.'));
          await tester.pump();
          expect(opened, 1);
          expect(card, findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'entry starts above physical viewport and interaction pauses expiry',
    (tester) async {
      final container = await mount(tester);
      container
          .read(catchNoticeControllerProvider.notifier)
          .show(
            CatchNoticeData.arrival(
              id: 'entry',
              title: 'Arrival',
              onOpen: () {},
            ),
          );
      await tester.pump();
      final card = find.byKey(const ValueKey('app_notice.entry'));
      expect(tester.getBottomLeft(card).dy, lessThanOrEqualTo(0));
      await pumpFeatureUi(tester);
      final gesture = await tester.startGesture(tester.getCenter(card));
      await pumpFeatureUiFor(tester, CatchMotion.noticeAutoDismiss * 2);
      expect(card, findsOneWidget);
      await gesture.cancel();
      await pumpFeatureUiFor(tester, CatchMotion.noticeAutoDismiss);
      await tester.pump();
      expect(card, findsNothing);
    },
  );

  test('notice queue is bounded, stable and replaces duplicate ids', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(catchNoticeControllerProvider.notifier);
    for (var i = 0; i < 12; i++) {
      controller.show(CatchNoticeData(id: '$i', title: '$i'));
    }
    expect(
      container.read(catchNoticeControllerProvider).notices.map((n) => n.id),
      List.generate(8, (i) => '$i'),
    );
    controller.show(
      const CatchNoticeData(id: '2', title: 'replacement', priority: 1),
    );
    final notices = container.read(catchNoticeControllerProvider).notices;
    expect(notices.length, 8);
    expect(notices.first.title, 'replacement');
    expect(notices.where((n) => n.id == '2').length, 1);
  });

  for (final drag in [
    const Offset(-500, 0),
    const Offset(500, 0),
    const Offset(0, -300),
  ]) {
    testWidgets('arrival swipe $drag dismisses without opening', (
      tester,
    ) async {
      final container = await mount(tester);
      var opened = 0;
      container
          .read(catchNoticeControllerProvider.notifier)
          .show(
            CatchNoticeData.arrival(
              id: 'swipe',
              title: 'Ananya',
              onOpen: () => opened++,
            ),
          );
      await pumpFeatureUi(tester);
      await tester.drag(find.text('Ananya'), drag);
      await pumpFeatureUi(tester);
      expect(find.text('Ananya'), findsNothing);
      expect(opened, 0);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('downward drag snaps back and does not open', (tester) async {
    final container = await mount(tester);
    var opened = 0;
    container
        .read(catchNoticeControllerProvider.notifier)
        .show(
          CatchNoticeData.arrival(
            id: 'down',
            title: 'Ananya',
            onOpen: () => opened++,
          ),
        );
    await pumpFeatureUi(tester);
    await tester.drag(find.text('Ananya'), const Offset(0, 150));
    await pumpFeatureUi(tester);
    expect(find.text('Ananya'), findsOneWidget);
    expect(opened, 0);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'reduced motion has immediate resting geometry; accessible navigation holds the card',
    (tester) async {
      final container = await mount(
        tester,
        reduceMotion: true,
        accessibleNavigation: true,
      );
      container
          .read(catchNoticeControllerProvider.notifier)
          .show(
            CatchNoticeData.arrival(
              id: 'accessible',
              title: 'Accessible arrival',
              onOpen: () {},
            ),
          );
      await tester.pump();
      expect(
        tester
            .getTopLeft(find.byKey(const ValueKey('app_notice.accessible')))
            .dy,
        71,
      );
      await pumpFeatureUiFor(tester, CatchMotion.noticeAutoDismiss * 2);
      expect(find.text('Accessible arrival'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      expect(find.text('Accessible arrival'), findsNothing);
    },
  );

  testWidgets('replacements with the same id get a full lifetime', (
    tester,
  ) async {
    final container = await mount(tester);
    final controller = container.read(catchNoticeControllerProvider.notifier);
    controller.show(
      CatchNoticeData.arrival(
        id: 'same',
        dedupeKey: 'same',
        title: 'First',
        onOpen: () {},
      ),
    );
    await tester.pump();
    await pumpFeatureUiFor(
      tester,
      CatchMotion.noticeAutoDismiss - const Duration(seconds: 1),
    );
    controller.show(
      CatchNoticeData.arrival(
        id: 'same',
        dedupeKey: 'same',
        title: 'Replacement',
        onOpen: () {},
      ),
    );
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(seconds: 2));
    expect(find.text('Replacement'), findsOneWidget);
    await pumpFeatureUiFor(tester, CatchMotion.noticeAutoDismiss);
    expect(find.text('Replacement'), findsNothing);
  });
}
