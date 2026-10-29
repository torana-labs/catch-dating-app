import 'dart:async';

import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'pending attribution does not block sharing or permit duplicate export',
    (tester) async {
      final launched = Completer<void>();
      final export = Completer<void>();
      final attribution = Completer<void>();
      var launches = 0;
      var intents = 0;
      await tester.pumpWidget(
        _subject(
          share: ExternalShareController((params) async {
            launches += 1;
            expect(params.fileNameOverrides, ['preview.png']);
            expect(params.files, hasLength(1));
            expect(params.sharePositionOrigin, isNotNull);
            launched.complete();
            await export.future;
          }),
          onShareIntent: () {
            intents += 1;
            return attribution.future;
          },
        ),
      );

      await _startShare(tester, launched);
      expect(intents, 1);
      expect(
        tester
            .widget<CatchShareCardSheet>(find.byType(CatchShareCardSheet))
            .isSharing,
        isTrue,
      );
      await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
      await tester.pump();
      expect(launches, 1);

      export.complete();
      await tester.pump();
      expect(
        tester
            .widget<CatchShareCardSheet>(find.byType(CatchShareCardSheet))
            .isSharing,
        isFalse,
      );
      attribution.completeError(StateError('Attribution unavailable'));
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('failed export restores the action and surfaces the app error', (
    tester,
  ) async {
    final launched = Completer<void>();
    final export = Completer<void>();
    await tester.pumpWidget(
      _subject(
        share: ExternalShareController((_) {
          launched.complete();
          return export.future;
        }),
      ),
    );

    await _startShare(tester, launched);
    export.completeError(StateError('System share unavailable'));
    await tester.pump();
    await tester.pump();
    expect(
      tester
          .widget<CatchShareCardSheet>(find.byType(CatchShareCardSheet))
          .isSharing,
      isFalse,
    );
    expect(
      find.text('Something went wrong. Please try again.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('completion after disposal does not update the removed sheet', (
    tester,
  ) async {
    final launched = Completer<void>();
    final export = Completer<void>();
    await tester.pumpWidget(
      _subject(
        share: ExternalShareController((_) {
          launched.complete();
          return export.future;
        }),
      ),
    );

    await _startShare(tester, launched);
    await tester.pumpWidget(const SizedBox.shrink());
    export.completeError(StateError('Share cancelled after navigation'));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}

Widget _subject({
  required ExternalShareController share,
  Future<void> Function()? onShareIntent,
}) => ProviderScope(
  child: MaterialApp(
    theme: AppTheme.light,
    builder: (context, child) => CatchNoticeOverlay(
      child: child ?? const SizedBox.shrink(),
    ),
    home: Scaffold(
      body: CatchExternalShareSheet(
        share: share,
        fileName: 'preview.png',
        buttonLabel: 'Share preview',
        footnote: 'Preview only',
        pixelRatio: 1,
        onShareIntent: onShareIntent,
        media: const SizedBox.square(
          dimension: 120,
          child: ColoredBox(color: Colors.blue),
        ),
      ),
    ),
  ),
);

Future<void> _startShare(WidgetTester tester, Completer<void> launched) async {
  await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
  await tester.pump();
  for (var attempt = 0; attempt < 50 && !launched.isCompleted; attempt += 1) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump();
  }
  expect(
    launched.isCompleted,
    isTrue,
    reason: 'The PNG export should reach the platform launcher.',
  );
}
