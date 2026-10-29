import 'dart:ui' as ui;

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

const _title = 'Important update to your upcoming event';
const _message =
    'The meeting location has moved to the north entrance. Your booking is unchanged.';
const _action = 'Review updated event details';

void main() {
  setUpAll(loadCatchTestFonts);

  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('notice retains copy and action in $brightness at $scale', (
        tester,
      ) async {
        var actions = 0;
        var dismissals = 0;
        await tester.pumpWidget(
          MaterialApp(
            theme: brightness == Brightness.light
                ? CatchTheme.light
                : CatchTheme.dark,
            home: MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: Scaffold(
                body: Center(
                  child: SizedBox(
                    width: 320,
                    child: CatchNotice(
                      notice: CatchNoticeData(
                        id: 'long',
                        title: _title,
                        message: _message,
                        actionLabel: _action,
                        onAction: () => actions++,
                      ),
                      dismissLabel: 'Dismiss notice',
                      onDismiss: () => dismissals++,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        final card = tester.getRect(find.byType(CatchNotice));
        for (final text in [_title, _message, _action]) {
          final paragraph = tester.renderObject<RenderParagraph>(
            find.text(text),
          );
          expect(
            paragraph.didExceedMaxLines,
            isFalse,
            reason:
                'The complete notice and recovery action must remain readable.',
          );
          final bounds = tester.getRect(find.text(text));
          expect(bounds.left, greaterThanOrEqualTo(card.left));
          expect(bounds.right, lessThanOrEqualTo(card.right));
        }
        await tester.tap(find.text(_action));
        expect(actions, 1);
        expect(dismissals, 0);
        await tester.tap(find.byTooltip('Dismiss notice'));
        expect(dismissals, 1);
      });
    }
  }

  for (final interaction in ['pointer', 'focus', 'hover', 'keyboard-dismiss']) {
    testWidgets('an ordinary action notice pauses expiry during $interaction', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final routeFocus = FocusNode();
      addTearDown(routeFocus.dispose);
      var actions = 0;
      container
          .read(catchNoticeControllerProvider.notifier)
          .show(
            CatchNoticeData(
              id: 'action',
              title: 'Event updated',
              actionLabel: 'Review',
              onAction: () => actions++,
            ),
          );
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: CatchTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(disableAnimations: true),
              child: CatchNoticeOverlay(child: child!),
            ),
            home: Scaffold(
              body: TextButton(
                autofocus: true,
                focusNode: routeFocus,
                onPressed: () {},
                child: const Text('Underlying route'),
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(
        routeFocus.hasFocus,
        isTrue,
        reason: 'Notices must not steal focus.',
      );
      final action = find.text('Review');
      TestGesture? gesture;
      if (interaction == 'pointer') {
        gesture = await tester.startGesture(tester.getCenter(action));
      } else if (interaction == 'hover') {
        gesture = await tester.createGesture(kind: ui.PointerDeviceKind.mouse);
        await gesture.addPointer(location: Offset.zero);
        await gesture.moveTo(tester.getCenter(action));
      } else {
        await tester.sendKeyEvent(LogicalKeyboardKey.f6);
        await tester.pump();
        expect(routeFocus.hasFocus, isFalse);
      }
      await pumpFeatureUiFor(tester, CatchMotion.noticeAutoDismiss * 2);
      expect(container.read(catchNoticeControllerProvider).current, isNotNull);
      expect(action, findsOneWidget);
      if (interaction == 'pointer') {
        await gesture!.up();
        expect(actions, 1);
      } else if (interaction == 'focus' || interaction == 'keyboard-dismiss') {
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        expect(actions, 1);
        if (interaction == 'keyboard-dismiss') {
          await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          await tester.pump();
          await tester.sendKeyEvent(LogicalKeyboardKey.enter);
          expect(container.read(catchNoticeControllerProvider).current, isNull);
        } else {
          await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
          await tester.sendKeyEvent(LogicalKeyboardKey.f6);
          await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
        }
        await tester.pump();
        expect(routeFocus.hasFocus, isTrue);
      } else {
        await gesture!.moveTo(Offset.zero);
        await gesture.removePointer();
      }
      await tester.pump();
      if (interaction != 'pointer') {
        await pumpFeatureUiFor(tester, CatchMotion.noticeAutoDismiss);
        expect(container.read(catchNoticeControllerProvider).current, isNull);
      }
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
