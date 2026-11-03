import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> mount(
    WidgetTester tester,
    Widget section, {
    double width = 390,
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
            data: MediaQueryData(
              size: Size(width, 1200),
              textScaler: TextScaler.linear(scale),
            ),
            child: SingleChildScrollView(
              child: Padding(padding: const EdgeInsets.all(20), child: section),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  for (final width in [320.0, 390.0, 850.0, 1200.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final dark in [false, true]) {
        testWidgets('owned empty module: $width scale $scale dark $dark', (
          tester,
        ) async {
          var activated = false;
          await mount(
            tester,
            CatchSection.collection(
              title: 'Households and functions',
              emptyTitle: 'No guests yet',
              emptyMessage:
                  'Import a manifest or add guests to build the RSVP grid.',
              emptyIcon: Icons.groups_outlined,
              actionLabel: 'Add guest',
              onAction: () => activated = true,
              children: const [],
            ),
            width: width,
            scale: scale,
            dark: dark,
          );
          final surface = tester.widget<CatchLegacySurface>(
            find.byType(CatchLegacySurface).first,
          );
          expect(surface.tone, CatchSurfaceTone.primarySoft);
          expect(surface.emphasis, CatchSurfaceEmphasis.flat);
          expect(surface.borderRole, isNull);
          expect(surface.height, isNull);
          final empty = tester.widget<CatchEmptyState>(
            find.byType(CatchEmptyState),
          );
          expect(empty.variant, CatchEmptyStateVariant.inline);
          expect(empty.padding, EdgeInsets.zero);
          final button = find.byType(CatchButton);
          expect(tester.widget<CatchButton>(button).fullWidth, isTrue);
          expect(
            tester.widget<CatchButton>(button).variant,
            CatchButtonVariant.primary,
          );
          expect(
            tester.getSize(button).width,
            closeTo(width - 40 - 2 * CatchSpacing.s4, .01),
          );
          expect(
            tester.getRect(button).top,
            greaterThan(tester.getRect(find.byType(CatchEmptyState)).bottom),
          );
          await tester.ensureVisible(button);
          await tester.tap(button);
          expect(activated, isTrue);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }

  testWidgets(
    'empty/populated/permission transitions preserve controls and callbacks',
    (tester) async {
      var selected = 0;
      var activated = 0;
      Widget collection(bool populated, bool permitted) =>
          CatchSection.collection(
            title: 'Schedule',
            emptyMessage: 'No functions yet',
            leading: CatchChoiceInput<int>.segmented(
              options: const [
                CatchOption(value: 0, label: 'Day 1'),
                CatchOption(value: 1, label: 'Day 2'),
              ],
              selected: selected,
              onChanged: (value) => selected = value,
              contractExemption: 'Local test selection; no payload field.',
            ),
            actionLabel: permitted ? 'New function' : null,
            onAction: permitted ? () => activated++ : null,
            children: [
              if (populated) ...[const Text('Sangeet'), const Text('Wedding')],
            ],
          );
      await mount(tester, collection(false, false));
      expect(find.byType(CatchEmptyState), findsOneWidget);
      expect(find.byType(CatchButton), findsNothing);
      await tester.tap(find.text('Day 2'));
      expect(selected, 1);
      await mount(tester, collection(true, true));
      expect(find.byType(CatchEmptyState), findsNothing);
      expect(find.byType(CatchDivider), findsOneWidget);
      expect(find.text('Sangeet'), findsOneWidget);
      await tester.tap(find.text('New function'));
      expect(activated, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('module height follows copy without a blank minimum', (
    tester,
  ) async {
    await mount(
      tester,
      CatchSection.status(title: 'Feedback', message: 'Waiting'),
    );
    final short = tester.getSize(find.byType(CatchSection)).height;
    await mount(
      tester,
      CatchSection.status(
        title: 'Feedback',
        message: List.filled(12, 'Waiting for attendee feedback.').join(' '),
      ),
    );
    final long = tester.getSize(find.byType(CatchSection)).height;
    expect(long, greaterThan(short));
    expect(short, lessThan(160));
    expect(tester.takeException(), isNull);
  });
}
