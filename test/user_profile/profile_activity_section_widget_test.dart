import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('optional activity section stays readable $dark $scale', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(390, 844);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        const capture = ValueKey('profile-activity-capture');
        await tester.pumpWidget(
          ProviderScope(
            child: RepaintBoundary(
              key: capture,
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
                home: Scaffold(
                  body: ProfileTabBody(
                    user: buildUser(name: 'Sara Demo'),
                    uploadState: const PhotoUploadState(),
                    builder: (context, children) => ListView(
                      key: const ValueKey('profile-tab-scroll-view'),
                      padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
                      children: children,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        final prefix = '${dark ? 'dark' : 'light'}-$scale';
        await _capture(tester, capture, 'core-$prefix');
        final activity = find.byKey(
          const ValueKey('profile-running-preferences'),
        );
        await tester.dragUntilVisible(
          activity,
          find.byKey(const ValueKey('profile-tab-scroll-view')),
          const Offset(0, -300),
        );
        await tester.ensureVisible(activity);
        await pumpFeatureUi(tester);
        expect(find.text('Pace range'), findsNothing);
        await _capture(tester, capture, 'activity-collapsed-$prefix');
        await tester.tap(activity);
        await pumpFeatureUi(tester);
        expect(find.text('Pace range'), findsOneWidget);
        expect(tester.takeException(), isNull);
        for (final paragraph in tester.renderObjectList<RenderParagraph>(
          find.descendant(of: activity, matching: find.byType(RichText)),
        )) {
          expect(
            paragraph.didExceedMaxLines,
            false,
            reason: paragraph.text.toPlainText(),
          );
          expect(
            paragraph.localToGlobal(Offset.zero).dx,
            greaterThanOrEqualTo(0),
            reason: paragraph.text.toPlainText(),
          );
          RenderObject? ancestor = paragraph.parent;
          while (ancestor != null) {
            if (ancestor is RenderClipRect && ancestor.hasSize) {
              final left = ancestor.localToGlobal(Offset.zero).dx;
              final textLeft = paragraph.localToGlobal(Offset.zero).dx;
              expect(
                textLeft,
                greaterThanOrEqualTo(left),
                reason: '${paragraph.text.toPlainText()} clipped by $ancestor',
              );
            }
            ancestor = ancestor.parent;
          }
        }
        await _capture(tester, capture, 'activity-expanded-$prefix');
      });
    }
  }
}

Future<void> _capture(WidgetTester tester, Key key, String name) async {
  final directory = Platform.environment['CATCH_FORM_PROFILE_CAPTURE_DIR'];
  if (directory == null) return;
  await tester.runAsync(() async {
    final image = await tester
        .renderObject<RenderRepaintBoundary>(find.byKey(key))
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
