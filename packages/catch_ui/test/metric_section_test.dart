import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> mount(
    WidgetTester tester,
    Widget child, {
    double width = 402,
    double scale = 1,
    bool dark = false,
  }) async {
    tester.view.physicalSize = Size(width, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: dark ? CatchTheme.dark : CatchTheme.light,
        home: Scaffold(
          body: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: SingleChildScrollView(
              child: Padding(padding: const EdgeInsets.all(20), child: child),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  const items = [
    CatchMetricValue(value: '214', label: 'Total contacts'),
    CatchMetricValue(value: '4.8', label: 'Average organizer review rating'),
    CatchMetricValue(value: 'May 2026', label: 'Established'),
    CatchMetricValue(value: '16', label: 'Upcoming events'),
  ];

  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('independent metric geometry dark=$dark scale=$scale', (
        tester,
      ) async {
        await mount(
          tester,
          const CatchMetricSection.grid(items: items),
          dark: dark,
          scale: scale,
        );
        final surfaces = find.byType(CatchLegacySurface);
        expect(surfaces, findsNWidgets(4));
        final rects = [
          for (var i = 0; i < 4; i++) tester.getRect(surfaces.at(i)),
        ];
        if (scale == 1) {
          expect(rects[1].left - rects[0].right, 12);
          expect(rects[2].top - rects[0].bottom, 12);
          expect(rects[0].height, rects[1].height);
          expect(rects[0].width, rects[1].width);
        } else {
          for (var i = 1; i < 4; i++) {
            expect(rects[i].left, rects[0].left);
            expect(rects[i].top - rects[i - 1].bottom, 12);
          }
        }
        for (final surface in tester.widgetList<CatchLegacySurface>(surfaces)) {
          expect(surface.borderRole, CatchBorderRole.boundary);
          expect(surface.emphasis, CatchSurfaceEmphasis.flat);
        }
        for (final paragraph in tester.renderObjectList<RenderParagraph>(
          find.byType(RichText),
        )) {
          expect(paragraph.didExceedMaxLines, isFalse);
        }
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets('narrow screens reflow; odd final tiles fill the lane', (
    tester,
  ) async {
    await mount(
      tester,
      CatchMetricSection.grid(items: items.take(3).toList()),
      width: 320,
    );
    final surfaces = find.byType(CatchLegacySurface);
    for (var i = 0; i < 3; i++) {
      expect(tester.getSize(surfaces.at(i)).width, 280);
    }
    await mount(tester, CatchMetricSection.grid(items: items.take(3).toList()));
    expect(tester.getSize(surfaces.last).width, 362);
    expect(tester.takeException(), isNull);
  });

  testWidgets('quality statuses wrap and never present missing data as zero', (
    tester,
  ) async {
    await mount(
      tester,
      CatchMetricSection.dataQuality(
        metrics: [
          for (final status in CatchMetricDataStatus.values)
            CatchMetricData(
              icon: Icons.people,
              value: '0',
              label: 'Profile and event views',
              caption:
                  'Includes the latest registrations and verified attendance.',
              status: status,
              partialBadgeLabel: 'Partial',
              missingBadgeLabel: 'Missing',
            ),
        ],
      ),
      scale: 2,
    );
    expect(find.text('0'), findsNWidgets(2));
    expect(find.text('—'), findsOneWidget);
    for (final paragraph in tester.renderObjectList<RenderParagraph>(
      find.byType(RichText),
    )) {
      expect(paragraph.didExceedMaxLines, isFalse);
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty independent metrics render no invented surfaces', (
    tester,
  ) async {
    await mount(tester, const CatchMetricSection.grid(items: []));
    expect(find.byType(CatchLegacySurface), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
